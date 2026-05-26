import { useEffect, useState } from 'react';
import api from '../lib/api';
import type { AnalyticsOverview } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/analytics/overview')
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="pulse" style={{ color: 'var(--muted)', padding: '2rem' }}>Loading analytics...</div>;
  if (!data) return null;

  const eloDistData = data.eloDistribution.map(d => ({
    range: typeof d._id === 'number' ? `${d._id}–${d._id + 99}` : String(d._id),
    count: d.count,
  }));

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Platform Analytics</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Real-time usage and health metrics</p>
      </div>

      {/* User stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Users', value: data.users.total },
          { label: 'DAU',         value: data.users.dau, sub: 'active today' },
          { label: 'WAU',         value: data.users.wau, sub: 'active this week' },
          { label: 'MAU',         value: data.users.mau, sub: 'active this month' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="card">
            <p style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </p>
            <p style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 800, margin: '0.25rem 0' }}>
              {value}
            </p>
            {sub && <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Match funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Match Funnel</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Total Requested', value: data.matches.total, pct: 100, color: 'var(--court-light)' },
              { label: 'Accepted',        value: data.matches.accepted + data.matches.completed, pct: data.funnel.acceptanceRate, color: 'var(--net)' },
              { label: 'Completed',       value: data.matches.completed, pct: data.funnel.completionRate, color: 'var(--ball)' },
            ].map(({ label, value, pct, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.8rem' }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 700 }}>{value} <span style={{ color: 'var(--muted)' }}>({pct}%)</span></span>
                </div>
                <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Match Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[
              { name: 'Pending',   value: data.matches.pending },
              { name: 'Accepted',  value: data.matches.accepted },
              { name: 'Completed', value: data.matches.completed },
            ]} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <Cell fill="var(--net)" />
                <Cell fill="var(--court-light)" />
                <Cell fill="var(--ball)" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Elo distribution */}
      {eloDistData.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Elo Distribution</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Should approach a normal distribution as ratings stabilize — indicates healthy matchmaking.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={eloDistData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" fill="var(--court-light)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
