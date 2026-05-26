import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppAuth } from '../context/AuthContext';
import api from '../lib/api';
import type { Match } from '../types';
import { format, isToday, isTomorrow } from 'date-fns';

function statusBadge(status: Match['status']) {
  const map: Record<string, string> = {
    pending:   'badge-yellow',
    accepted:  'badge-green',
    declined:  'badge-red',
    completed: 'badge-muted',
    cancelled: 'badge-red',
  };
  return `badge ${map[status] || 'badge-muted'}`;
}

function formatDate(d?: string) {
  if (!d) return 'TBD';
  const date = new Date(d);
  if (isToday(date))    return `Today ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
}

export default function Dashboard() {
  const { dbUser } = useAppAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/matches')
      .then(({ data }) => setMatches(data.matches))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!dbUser) return null;

  const pending   = matches.filter(m => m.status === 'pending');
  const upcoming  = matches.filter(m => m.status === 'accepted');
  const completed = matches.filter(m => m.status === 'completed');
  const winRate   = dbUser.matchesPlayed > 0
    ? Math.round((dbUser.wins / dbUser.matchesPlayed) * 100)
    : 0;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
          Welcome back, {dbUser.name.split(' ')[0]} 👋
        </h2>
        <p style={{ color: 'var(--muted)' }}>Here's what's happening on the court.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Elo Rating',      value: dbUser.elo,           sub: 'current rating',    accent: true },
          { label: 'Matches Played',  value: dbUser.matchesPlayed, sub: 'all time' },
          { label: 'Win Rate',        value: `${winRate}%`,        sub: `${dbUser.wins}W / ${dbUser.losses}L` },
          { label: 'Pending',         value: pending.length,       sub: 'awaiting response' },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} className="card" style={{
            background: accent ? 'linear-gradient(135deg, var(--court-green), var(--court-light))' : undefined,
          }}>
            <p style={{ fontSize: '0.75rem', color: accent ? 'rgba(255,255,255,0.7)' : 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </p>
            <p style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 800, margin: '0.25rem 0' }}>
              {value}
            </p>
            <p style={{ fontSize: '0.75rem', color: accent ? 'rgba(255,255,255,0.7)' : 'var(--muted)' }}>
              {sub}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Upcoming matches */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Upcoming Matches</h3>
            <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}
              onClick={() => navigate('/matchmaking')}>
              + Find Match
            </button>
          </div>
          {loading ? (
            <p className="pulse" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Loading...</p>
          ) : upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
              <p style={{ fontSize: '2rem' }}>🎾</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>No upcoming matches. Find one!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcoming.slice(0, 5).map((m) => {
                const opp = m.requester._id === dbUser._id ? m.opponent : m.requester;
                return (
                  <div key={m._id}
                    onClick={() => navigate(`/matches/${m._id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface-3)', cursor: 'pointer',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(45,140,78,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                  >
                    <img src={opp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(opp.name)}&background=1a5c2e&color=fff`}
                      alt={opp.name} width={36} height={36} className="avatar" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        vs {opp.name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {formatDate(m.scheduledAt)}
                        {m.court && ` · ${(m.court as any).name}`}
                      </p>
                    </div>
                    <span className="elo-badge" style={{ fontSize: '0.7rem' }}>{opp.elo}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending requests */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
            Pending Requests
            {pending.length > 0 && (
              <span className="badge badge-yellow" style={{ marginLeft: '0.5rem' }}>{pending.length}</span>
            )}
          </h3>
          {pending.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
              No pending requests
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pending.map((m) => {
                const isRequester = m.requester._id === dbUser._id;
                const other = isRequester ? m.opponent : m.requester;
                return (
                  <div key={m._id} style={{
                    padding: '0.875rem', borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-3)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <img src={other.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(other.name)}&background=1a5c2e&color=fff`}
                        alt={other.name} width={32} height={32} className="avatar" />
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{other.name}</p>
                        <span className="elo-badge" style={{ fontSize: '0.65rem' }}>{other.elo} ELO</span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: 'auto' }}>
                        {isRequester ? 'Sent' : 'Received'}
                      </p>
                    </div>
                    {!isRequester && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem' }}
                          onClick={async () => {
                            await api.patch(`/api/matches/${m._id}/accept`);
                            setMatches(prev => prev.map(x => x._id === m._id ? { ...x, status: 'accepted' } : x));
                          }}>
                          Accept
                        </button>
                        <button className="btn btn-danger" style={{ flex: 1, fontSize: '0.8rem' }}
                          onClick={async () => {
                            await api.patch(`/api/matches/${m._id}/decline`);
                            setMatches(prev => prev.filter(x => x._id !== m._id));
                          }}>
                          Decline
                        </button>
                      </div>
                    )}
                    {isRequester && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Waiting for response · {formatDate(m.scheduledAt)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent completed */}
      {completed.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Recent Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {completed.slice(0, 5).map((m) => {
              const opp = m.requester._id === dbUser._id ? m.opponent : m.requester;
              const won = m.winner === dbUser._id;
              const myEloChange = m.requester._id === dbUser._id ? m.eloChange?.requester : m.eloChange?.opponent;
              return (
                <div key={m._id} onClick={() => navigate(`/matches/${m._id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-3)', cursor: 'pointer',
                    borderLeft: `3px solid ${won ? 'var(--court-light)' : '#dc2626'}`,
                  }}>
                  <img src={opp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(opp.name)}&background=1a5c2e&color=fff`}
                    alt={opp.name} width={32} height={32} className="avatar" />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {won ? 'Won' : 'Lost'} vs {opp.name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {format(new Date(m.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {myEloChange !== undefined && (
                    <span style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem',
                      color: myEloChange >= 0 ? 'var(--court-light)' : '#f87171',
                    }}>
                      {myEloChange >= 0 ? '+' : ''}{myEloChange}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
