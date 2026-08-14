import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppAuth } from '../context/AuthContext';
import api from '../lib/api';
import type { NearbyPlayer, Court } from '../types';

export default function Matchmaking() {
  const { dbUser } = useAppAuth();
  const navigate = useNavigate();
  const [players, setPlayers]   = useState<NearbyPlayer[]>([]);
  const [courts, setCourts]     = useState<Court[]>([]);
  const [loading, setLoading]   = useState(true);
  const [maxMiles, setMaxMiles] = useState(dbUser?.preferredDistance || 10);
  const [attempt, setAttempt]   = useState(0);
  const [sending, setSending]   = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<NearbyPlayer | null>(null);
  const [sent, setSent] = useState<string[]>([]);

  const fetchPlayers = useCallback(async (att = 0) => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/users/search/nearby', {
        params: { attempt: att, maxDistanceMiles: maxMiles },
      });
      setPlayers(data.players);
      setAttempt(att);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [maxMiles]);

  const fetchCourts = useCallback(async () => {
    if (!dbUser?.location?.coordinates) return;
    try {
      const [lng, lat] = dbUser.location.coordinates;
      const { data } = await api.get('/api/courts/nearby', {
        params: { lat, lng, maxMiles },
      });
      setCourts(data.courts);
    } catch (err) {
      console.error(err);
    }
  }, [dbUser, maxMiles]);

  useEffect(() => { fetchPlayers(0); fetchCourts(); }, [fetchPlayers, fetchCourts]);

  async function sendRequest(player: NearbyPlayer) {
    if (!player._id) return;
    setSending(player._id);
    try {
      await api.post('/api/matches', {
        opponentId: player._id,
        scheduledAt: scheduledAt || undefined,
        courtId: selectedCourt || undefined,
      });
      setSent(prev => [...prev, player._id!]);
      setSelectedPlayer(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(null);
    }
  }

  if (!dbUser) return null;

  const distanceLabel = (m: number) => `${(m / 1000 * 0.621).toFixed(1)} mi away`;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Find a Match</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Players within ±{100 + attempt * 50} Elo of your rating ({dbUser.elo})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Distance</label>
            <select value={maxMiles} onChange={e => setMaxMiles(Number(e.target.value))}
              style={{ width: 120 }}>
              {[5, 10, 15, 25, 50].map(m => (
                <option key={m} value={m}>{m} miles</option>
              ))}
            </select>
          </div>
          <button className="btn btn-outline" onClick={() => fetchPlayers(0)} style={{ marginTop: 18 }}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[1,2,3].map(i => (
            <div key={i} className="card pulse" style={{ height: 200 }} />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '3rem' }}>🎾</p>
          <h3 style={{ margin: '1rem 0 0.5rem' }}>No players found nearby</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Try widening the search radius or Elo band.
          </p>
          <button className="btn btn-primary" onClick={() => fetchPlayers(attempt + 1)}>
            Widen Search (±{100 + (attempt + 1) * 50} Elo)
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {players.map((p) => (
            <div key={p._id} className="card" style={{
              display: 'flex', flexDirection: 'column', gap: '1rem',
              opacity: sent.includes(p._id!) ? 0.5 : 1,
              transition: 'var(--transition)',
            }}>
              <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                <img
                  src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || '')}&background=1a5c2e&color=fff&size=80`}
                  alt={p.name} width={52} height={52} className="avatar"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1rem',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                    <span className="elo-badge">{p.elo} ELO</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      {p.distanceMeters ? distanceLabel(p.distanceMeters) : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                <span className="badge badge-muted">
                  {p.matchesPlayed} matches
                </span>
                {p.matchesPlayed! > 0 && (
                  <span className="badge badge-green">
                    {Math.round((p.wins! / p.matchesPlayed!) * 100)}% win rate
                  </span>
                )}
                {p.preferredSurface && p.preferredSurface !== 'any' && (
                  <span className="badge badge-muted">⛳ {p.preferredSurface}</span>
                )}
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.8rem' }}
                  onClick={() => navigate(`/profile/${p._id}`)}>
                  View Profile
                </button>
                {sent.includes(p._id!) ? (
                  <span className="btn btn-outline" style={{ flex: 1, fontSize: '0.8rem', cursor: 'default' }}>
                    ✓ Sent
                  </span>
                ) : (
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem' }}
                    disabled={sending === p._id}
                    onClick={() => setSelectedPlayer(p)}>
                    {sending === p._id ? '...' : 'Challenge'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nearby Courts */}
      {courts.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Nearby Courts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
            {courts.map((c) => (
              <div key={c._id} className="card" style={{ padding: '1rem', display: 'flex', gap: '0.75rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
                }}>🎾</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.15rem' }}>{c.address}</p>
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-muted">{c.surface}</span>
                    {c.litCourts && <span className="badge badge-yellow">💡 Lit</span>}
                    {c.indoor    && <span className="badge badge-muted">Indoor</span>}
                    {c.distanceMeters && (
                      <span className="badge badge-muted">{distanceLabel(c.distanceMeters)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Challenge modal */}
      {selectedPlayer && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 500, padding: '1rem',
        }} onClick={() => setSelectedPlayer(null)}>
          <div className="card" style={{ width: 420, maxWidth: '100%' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1.25rem' }}>
              Challenge {selectedPlayer.name}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Proposed Date & Time (optional)</label>
                <input type="datetime-local" value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Preferred Court (optional)</label>
                <select value={selectedCourt} onChange={e => setSelectedCourt(e.target.value)}>
                  <option value="">Select a court...</option>
                  {courts.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }}
                  onClick={() => setSelectedPlayer(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }}
                  disabled={sending === selectedPlayer._id}
                  onClick={() => sendRequest(selectedPlayer)}>
                  {sending === selectedPlayer._id ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
