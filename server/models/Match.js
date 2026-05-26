const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true, maxlength: 1000 },
  sentAt:    { type: Date, default: Date.now },
}, { _id: true });

const matchSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  opponent:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled'],
    default: 'pending',
    index: true,
  },

  scheduledAt: { type: Date },
  court:       { type: mongoose.Schema.Types.ObjectId, ref: 'Court' },

  // Score — sets format e.g. [[6,4],[3,6],[7,5]]
  score: {
    requesterSets: { type: Number },
    opponentSets:  { type: Number },
    sets:          { type: [[Number]] },
  },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Elo snapshot at match time — for rating history reconstruction
  eloSnapshot: {
    requester: { type: Number },
    opponent:  { type: Number },
  },
  eloChange: {
    requester: { type: Number },
    opponent:  { type: Number },
  },

  // In-match chat
  messages: { type: [messageSchema], default: [] },

  // Score submission tracking — both players must confirm
  scoreSubmittedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, {
  timestamps: true,
});

matchSchema.index({ requester: 1, status: 1 });
matchSchema.index({ opponent: 1, status: 1 });
matchSchema.index({ scheduledAt: 1 });

module.exports = mongoose.model('Match', matchSchema);
