import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppAuth } from '../context/AuthContext';
import api from '../lib/api';
import type { User, Match } from '../types';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';

export default function Profile() {
  const { id } = useParams<{ id?: string }>();
  const { dbUser, refetchUser } = useAppAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const isOwnProfile = !id || id === dbUser?._id;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isOwnProfile) {
          await refetchUser();
          setUser(dbUser);
          const { data } = await api.get('/api/matches?status=completed');
          setMatches(data.matches);
        } else {
          const [userRes, matchRes] = await Promise.all([
            api.get(`/api/users/${id}`),
            // Public match history not exposed — show empty for other users
          ]);
          setUser(userRes.data.user);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (dbUser || id) load();
  }, [id, dbUser?._id]);

  if (loading) return <div className="pulse" style={{ color: 'var(--muted)', padding: '2rem' }}>Loading...</div>;
  const target = user || dbUser;
  if (!target) return null;

  const eloChartData = target.eloHistory?.slice(-30).map((e, i) => ({
    index: i + 1,
    elo: e.elo,
    date: format(new Date(e.recordedAt), 'MMM d'),
    delta: e.delta,
  })) || [];

  const winRate = target.matchesPlayed > 0
    ? Math.round((target.wins / target.matchesPlayed) * 100) : 0;

  const eloTrend = eloChartData.length >= 2
    ? eloChartData[eloChartData.length - 1].elo - eloChartData[0].elo
    : 0;

  return (
    <div className="fade-in" style={{ maxWidth: 900 }}>
      {!isOwnProfile && (
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
          ← Back
        </button>
      )}

      {/* Profile header */}
      <div className="card" style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <img
          src={target.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(target.name)}&background=1a5c2e&color=fff&size=120`}
          alt={target.name} width={96} height={96} className="avatar"
          style={{ width: 96, height: 96 }}
        />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{target.name}</h2>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="elo-badge" style={{ fontSize: '1rem', padding: '0.3rem 0.75rem' }}>
              {target.elo} ELO
            </span>
            {target.city && <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>📍 {target.city}</span>}
            {isOwnProfile && (
              <span className={`status-dot ${target.isAvailable ? 'online' : 'offline'}`} />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', textAlign: 'center' }}>
          {[
            { label: 'Matches', value: target.matchesPlayed },
            { label: 'Wins',    value: target.wins },
            { label: 'Losses',  value: target.losses },
            { label: 'Win Rate', value: `${winRate}%` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{value}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Elo history chart */}
      {eloChartData.length > 1 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Elo History</h3>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem',
              color: eloTrend >= 0 ? 'var(--court-light)' : '#f87171',
            }}>
              {eloTrend >= 0 ? '↑ +' : '↓ '}{eloTrend} pts last {eloChartData.length} matches
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={eloChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, _: any, props: any) => [
                  `${v} ELO (${props.payload.delta >= 0 ? '+' : ''}${props.payload.delta})`,
                  'Rating'
                ]}
              />
              <ReferenceLine y={1200} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
              <Line
                type="monotone" dataKey="elo"
                stroke="var(--court-light)" strokeWidth={2}
                dot={{ fill: 'var(--court-light)', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Preferences */}
      {isOwnProfile && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Preferences</h3>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--muted)' }}>Surface: </span>
              <strong style={{ textTransform: 'capitalize' }}>{target.preferredSurface}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--muted)' }}>Search radius: </span>
              <strong>{target.preferredDistance} miles</strong>
            </div>
            <div>
              <span style={{ color: 'var(--muted)' }}>Status: </span>
              <strong style={{ color: target.isAvailable ? 'var(--court-light)' : 'var(--muted)' }}>
                {target.isAvailable ? 'Available' : 'Unavailable'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Match history */}
      {isOwnProfile && matches.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Recent Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {matches.slice(0, 10).map((m) => {
              const opp = m.requester._id === dbUser?._id ? m.opponent : m.requester;
              const won = m.winner === dbUser?._id;
              const isReq = m.requester._id === dbUser?._id;
              const change = isReq ? m.eloChange?.requester : m.eloChange?.opponent;
              return (
                <div key={m._id}
                  onClick={() => navigate(`/matches/${m._id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.875rem', borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-3)', cursor: 'pointer',
                    borderLeft: `3px solid ${won ? 'var(--court-light)' : '#dc2626'}`,
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                >
                  <img
                    src={opp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(opp.name)}&background=1a5c2e&color=fff`}
                    alt={opp.name} width={36} height={36} className="avatar"
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {won ? '🏆 Won' : '❌ Lost'} vs {opp.name}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      {m.scheduledAt ? format(new Date(m.scheduledAt), 'MMMM d, yyyy') : format(new Date(m.createdAt), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  {change !== undefined && (
                    <span style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem',
                      color: change >= 0 ? 'var(--court-light)' : '#f87171',
                    }}>
                      {change >= 0 ? '+' : ''}{change}
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
