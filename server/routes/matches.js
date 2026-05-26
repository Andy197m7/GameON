const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const User = require('../models/User');
const Court = require('../models/Court');
const { calculateElo } = require('../services/elo');
const { notifications } = require('../services/notifications');
const { analytics } = require('../services/analytics');
const { getIO } = require('../socket/socketServer');

// ── Create match request ───────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { opponentId, scheduledAt, courtId } = req.body;
    if (!opponentId) return res.status(400).json({ error: 'opponentId required' });

    const opponent = await User.findById(opponentId);
    if (!opponent) return res.status(404).json({ error: 'Opponent not found' });

    const match = await Match.create({
      requester:   req.user._id,
      opponent:    opponent._id,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      court:       courtId || undefined,
      eloSnapshot: { requester: req.user.elo, opponent: opponent.elo },
    });

    // Real-time notification via Socket.io
    const io = getIO();
    io.to(`user:${opponentId}`).emit('match_request', {
      matchId:       match._id,
      requester:     { id: req.user._id, name: req.user.name, elo: req.user.elo, avatar: req.user.avatar },
      scheduledAt:   match.scheduledAt,
    });

    // Email notification via BullMQ
    await notifications.matchRequest(
      { email: opponent.email, name: opponent.name },
      req.user.name,
      match._id
    );

    analytics.matchRequested(req.user.clerkId, {
      opponentId, requesterElo: req.user.elo, opponentElo: opponent.elo,
    });

    const populated = await match.populate(['requester', 'opponent', 'court']);
    res.status(201).json({ match: populated });
  } catch (err) { next(err); }
});

// ── Get my matches ─────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {
      $or: [{ requester: req.user._id }, { opponent: req.user._id }],
    };
    if (status) filter.status = status;

    const matches = await Match.find(filter)
      .populate('requester', 'name avatar elo')
      .populate('opponent',  'name avatar elo')
      .populate('court',     'name address')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ matches });
  } catch (err) { next(err); }
});

// ── Get single match ───────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('requester', 'name avatar elo')
      .populate('opponent',  'name avatar elo')
      .populate('court');

    if (!match) return res.status(404).json({ error: 'Match not found' });

    const isParticipant = match.requester._id.equals(req.user._id) ||
                          match.opponent._id.equals(req.user._id);
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant' });

    res.json({ match });
  } catch (err) { next(err); }
});

// ── Accept match ───────────────────────────────────────────────────────────────
router.patch('/:id/accept', async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('requester', 'name email elo')
      .populate('opponent',  'name email elo')
      .populate('court',     'name');

    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (!match.opponent._id.equals(req.user._id))
      return res.status(403).json({ error: 'Only the opponent can accept' });
    if (match.status !== 'pending')
      return res.status(400).json({ error: `Match is already ${match.status}` });

    // Optionally update scheduledAt / court
    if (req.body.scheduledAt) match.scheduledAt = new Date(req.body.scheduledAt);
    if (req.body.courtId) {
      match.court = req.body.courtId;
      const court = await Court.findById(req.body.courtId);
      analytics.courtSelected(req.user.clerkId, { courtId: req.body.courtId, courtName: court?.name });
    }

    match.status = 'accepted';
    await match.save();

    const io = getIO();
    io.to(`user:${match.requester._id}`).emit('match_accepted', {
      matchId: match._id,
      opponent: { id: match.opponent._id, name: match.opponent.name },
    });

    await notifications.matchAccepted(
      { email: match.requester.email, name: match.requester.name },
      match.opponent.name,
      match._id,
      match.scheduledAt,
      match.court?.name
    );

    if (match.scheduledAt) {
      await notifications.matchReminder(
        { email: match.requester.email, name: match.requester.name },
        match.opponent.name, match._id, match.scheduledAt, match.court?.name
      );
      await notifications.matchReminder(
        { email: match.opponent.email, name: match.opponent.name },
        match.requester.name, match._id, match.scheduledAt, match.court?.name
      );
      await notifications.scorePrompt(
        { email: match.requester.email, name: match.requester.name },
        match.opponent.name, match._id, match.scheduledAt
      );
      await notifications.scorePrompt(
        { email: match.opponent.email, name: match.opponent.name },
        match.requester.name, match._id, match.scheduledAt
      );
    }

    analytics.matchAccepted(req.user.clerkId, { matchId: match._id.toString() });
    res.json({ match });
  } catch (err) { next(err); }
});

// ── Decline match ──────────────────────────────────────────────────────────────
router.patch('/:id/decline', async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (!match.opponent.equals(req.user._id))
      return res.status(403).json({ error: 'Only the opponent can decline' });
    if (match.status !== 'pending')
      return res.status(400).json({ error: `Match is already ${match.status}` });

    match.status = 'declined';
    await match.save();

    const io = getIO();
    io.to(`user:${match.requester}`).emit('match_declined', { matchId: match._id });

    analytics.matchDeclined(req.user.clerkId, { matchId: match._id.toString() });
    res.json({ match });
  } catch (err) { next(err); }
});

// ── Submit score + update Elo ─────────────────────────────────────────────────
router.patch('/:id/score', async (req, res, next) => {
  try {
    const { winnerId, sets } = req.body;
    if (!winnerId) return res.status(400).json({ error: 'winnerId required' });

    const match = await Match.findById(req.params.id)
      .populate('requester', 'name email elo matchesPlayed')
      .populate('opponent',  'name email elo matchesPlayed');

    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status !== 'accepted')
      return res.status(400).json({ error: 'Can only score an accepted match' });

    const isParticipant = match.requester._id.equals(req.user._id) ||
                          match.opponent._id.equals(req.user._id);
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant' });

    // Track who submitted — require both players to confirm
    if (!match.scoreSubmittedBy.includes(req.user._id)) {
      match.scoreSubmittedBy.push(req.user._id);
    }

    const bothConfirmed = match.scoreSubmittedBy.length >= 2;

    if (bothConfirmed) {
      const isRequesterWinner = match.requester._id.toString() === winnerId;
      const winner = isRequesterWinner ? match.requester : match.opponent;
      const loser  = isRequesterWinner ? match.opponent  : match.requester;

      const { newWinnerElo, newLoserElo, winnerDelta, loserDelta } =
        calculateElo(winner.elo, loser.elo, winner.matchesPlayed, loser.matchesPlayed);

      // Update winner
      await User.findByIdAndUpdate(winner._id, {
        $set:  { elo: newWinnerElo },
        $inc:  { matchesPlayed: 1, wins: 1 },
        $push: { eloHistory: { elo: newWinnerElo, delta: winnerDelta, matchId: match._id } },
      });

      // Update loser
      await User.findByIdAndUpdate(loser._id, {
        $set:  { elo: newLoserElo },
        $inc:  { matchesPlayed: 1, losses: 1 },
        $push: { eloHistory: { elo: newLoserElo, delta: loserDelta, matchId: match._id } },
      });

      match.status = 'completed';
      match.winner = winner._id;
      match.score  = { sets: sets || [] };
      match.eloChange = { requester: isRequesterWinner ? winnerDelta : loserDelta,
                          opponent:  isRequesterWinner ? loserDelta  : winnerDelta };

      const io = getIO();
      io.to(`user:${match.requester._id}`).emit('elo_updated', {
        newElo: isRequesterWinner ? newWinnerElo : newLoserElo,
        delta:  match.eloChange.requester,
      });
      io.to(`user:${match.opponent._id}`).emit('elo_updated', {
        newElo: isRequesterWinner ? newLoserElo : newWinnerElo,
        delta:  match.eloChange.opponent,
      });

      analytics.matchCompleted(req.user.clerkId, {
        matchId: match._id.toString(), winnerId, winnerDelta, loserDelta,
      });
      analytics.eloUpdated(winner._id.toString(), { newElo: newWinnerElo, delta: winnerDelta });
      analytics.eloUpdated(loser._id.toString(),  { newElo: newLoserElo,  delta: loserDelta  });
    }

    await match.save();
    res.json({ match, bothConfirmed });
  } catch (err) { next(err); }
});

// ── Send message ───────────────────────────────────────────────────────────────
router.post('/:id/messages', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text required' });

    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const isParticipant = match.requester.equals(req.user._id) ||
                          match.opponent.equals(req.user._id);
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant' });

    const message = { sender: req.user._id, text: text.trim(), sentAt: new Date() };
    match.messages.push(message);
    await match.save();

    const newMsg = match.messages[match.messages.length - 1];
    const recipientId = match.requester.equals(req.user._id)
      ? match.opponent.toString()
      : match.requester.toString();

    const io = getIO();
    io.to(`user:${recipientId}`).emit('message_received', {
      matchId: match._id,
      message: { ...newMsg.toObject(), sender: { _id: req.user._id, name: req.user.name } },
    });

    analytics.messageSent(req.user.clerkId, { matchId: match._id.toString() });
    res.status(201).json({ message: newMsg });
  } catch (err) { next(err); }
});

module.exports = router;
