import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppAuth } from '../context/AuthContext';
import { useUser } from '@clerk/clerk-react';
import { getSocket } from '../lib/socket';
import api from '../lib/api';
import type { Match, Message } from '../types';
import { format } from 'date-fns';

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { dbUser, refetchUser } = useAppAuth();
  const { user: clerkUser } = useUser();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [winnerId, setWinnerId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/matches/${id}`)
      .then(({ data }) => setMatch(data.match))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Listen for incoming messages via socket
  useEffect(() => {
    if (!clerkUser?.id) return;
    const socket = getSocket(clerkUser.id);
    socket.on('message_received', (payload: any) => {
      if (payload.matchId !== id) return;
      setMatch(prev => prev ? {
        ...prev,
        messages: [...prev.messages, payload.message],
      } : prev);
    });
    return () => { socket.off('message_received'); };
  }, [clerkUser?.id, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [match?.messages]);

  async function sendMessage() {
    if (!msg.trim() || !id) return;
    setSending(true);
    try {
      const { data } = await api.post(`/api/matches/${id}/messages`, { text: msg.trim() });
      setMatch(prev => prev ? {
        ...prev,
        messages: [...prev.messages, { ...data.message, sender: dbUser! }],
      } : prev);
      setMsg('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  async function submitScore() {
    if (!winnerId || !id) return;
    try {
      const { data } = await api.patch(`/api/matches/${id}/score`, { winnerId });
      setMatch(data.match);
      if (data.bothConfirmed) {
        await refetchUser();
        setScoring(false);
      } else {
        alert('Score submitted! Waiting for your opponent to confirm.');
        setScoring(false);
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <div className="pulse" style={{ color: 'var(--muted)', padding: '2rem' }}>Loading match...</div>;
  if (!match || !dbUser) return null;

  const isRequester = match.requester._id === dbUser._id;
  const me  = isRequester ? match.requester : match.opponent;
  const opp = isRequester ? match.opponent  : match.requester;
  const alreadySubmitted = match.scoreSubmittedBy?.includes(dbUser._id);

  return (
    <div className="fade-in" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ padding: '0.4rem' }}>
          ← Back
        </button>
        <h2 style={{ fontSize: '1.5rem', flex: 1 }}>
          vs {opp.name}
        </h2>
        <span className={`badge ${
          match.status === 'accepted'  ? 'badge-green'  :
          match.status === 'pending'   ? 'badge-yellow' :
          match.status === 'completed' ? 'badge-muted'  : 'badge-red'
        }`} style={{ textTransform: 'capitalize' }}>{match.status}</span>
      </div>

      {/* Match info card */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={opp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(opp.name)}&background=1a5c2e&color=fff`}
            alt={opp.name} width={48} height={48} className="avatar" />
          <div>
            <p style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{opp.name}</p>
            <span className="elo-badge">{opp.elo} ELO</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {match.scheduledAt && (
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>When</p>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {format(new Date(match.scheduledAt), 'EEE MMM d, h:mm a')}
              </p>
            </div>
          )}
          {match.court && (
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Court</p>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{(match.court as any).name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{(match.court as any).address}</p>
            </div>
          )}
          {match.eloSnapshot && (
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Elo at Match</p>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {isRequester ? match.eloSnapshot.requester : match.eloSnapshot.opponent}
              </p>
            </div>
          )}
          {match.status === 'completed' && match.eloChange && (
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Elo Change</p>
              <p style={{ fontWeight: 700, fontSize: '1rem',
                color: (isRequester ? match.eloChange.requester : match.eloChange.opponent) >= 0
                  ? 'var(--court-light)' : '#f87171' }}>
                {(isRequester ? match.eloChange.requester : match.eloChange.opponent) >= 0 ? '+' : ''}
                {isRequester ? match.eloChange.requester : match.eloChange.opponent}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Score submission */}
      {match.status === 'accepted' && !alreadySubmitted && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--net)' }}>
          {!scoring ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600 }}>Match completed?</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Submit the result to update your Elo.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setScoring(true)}>Submit Score</button>
            </div>
          ) : (
            <div>
              <h4 style={{ marginBottom: '1rem' }}>Who won?</h4>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                {[me, opp].map((player) => (
                  <button key={player._id}
                    className={`btn ${winnerId === player._id ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={() => setWinnerId(player._id)}>
                    {player._id === dbUser._id ? 'I won' : `${opp.name} won`}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-ghost" onClick={() => setScoring(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={!winnerId} onClick={submitScore}>
                  Confirm Result
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {alreadySubmitted && match.status === 'accepted' && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(45,140,78,0.1)', border: '1px solid var(--court-light)' }}>
          <p style={{ fontSize: '0.875rem' }}>✅ Score submitted. Waiting for {opp.name} to confirm.</p>
        </div>
      )}

      {/* Chat */}
      {(match.status === 'accepted' || match.status === 'pending' || match.status === 'completed') && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
            Match Chat
          </h3>
          <div style={{
            height: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem',
            padding: '0.5rem', background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
          }}>
            {match.messages.length === 0 && (
              <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem', fontSize: '0.85rem' }}>
                No messages yet. Say hello!
              </p>
            )}
            {match.messages.map((m: Message) => {
              const senderId = typeof m.sender === 'string' ? m.sender : (m.sender as any)._id;
              const isMe = senderId === dbUser._id;
              const senderName = isMe ? 'You' : (typeof m.sender === 'string' ? opp.name : (m.sender as any).name);
              return (
                <div key={m._id} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '75%', padding: '0.625rem 0.875rem',
                    borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: isMe ? 'var(--court-green)' : 'var(--surface-2)',
                    fontSize: '0.875rem',
                  }}>
                    {m.text}
                  </div>
                  <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                    {senderName} · {format(new Date(m.sentAt), 'h:mm a')}
                  </p>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          {match.status !== 'completed' && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={msg}
                onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                style={{ flex: 1 }}
                disabled={sending}
              />
              <button className="btn btn-primary" onClick={sendMessage} disabled={!msg.trim() || sending}>
                Send
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
