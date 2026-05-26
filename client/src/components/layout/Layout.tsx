import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useUser, UserButton } from '@clerk/clerk-react';
import { useSocket } from '../../hooks/useSocket';
import { useAppAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';

const NAV = [
  { to: '/',            label: 'Dashboard',   icon: '⬡' },
  { to: '/matchmaking', label: 'Find Match',  icon: '◎' },
  { to: '/profile',     label: 'Profile',     icon: '◈' },
  { to: '/analytics',   label: 'Analytics',   icon: '▦' },
];

export default function Layout() {
  const { user } = useUser();
  const { dbUser } = useAppAuth();
  const { notifications, unreadCount, markAllRead, eloUpdate } = useSocket();
  const [showNotifs, setShowNotifs] = useState(false);
  const [eloFlash, setEloFlash] = useState<{ newElo: number; delta: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (eloUpdate) {
      setEloFlash(eloUpdate);
      setTimeout(() => setEloFlash(null), 4000);
    }
  }, [eloUpdate]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--surface-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        gap: '0.5rem',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: '0.5rem 0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--court-light), var(--ball))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em',
          }}>
            GameOn
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
            Tennis Matchmaking
          </p>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, marginTop: '0.5rem' }}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--court-light)' : 'var(--muted)',
                background: isActive ? 'rgba(45,140,78,0.12)' : 'transparent',
                transition: 'var(--transition)',
                textDecoration: 'none',
              })}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <UserButton afterSignOutUrl="/sign-in" />
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, truncate: true }}
               title={user?.fullName || ''}>{user?.fullName}</p>
            {dbUser && (
              <span className="elo-badge" style={{ fontSize: '0.7rem' }}>
                {dbUser.elo} ELO
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header style={{
          height: 56,
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 1.5rem',
          gap: '1rem',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost"
              onClick={() => { setShowNotifs(!showNotifs); markAllRead(); }}
              style={{ padding: '0.4rem 0.6rem', fontSize: '1.1rem' }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 2, right: 2,
                  width: 16, height: 16,
                  background: 'var(--net)',
                  borderRadius: '50%',
                  fontSize: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#000',
                }}>{unreadCount}</span>
              )}
            </button>

            {showNotifs && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '110%',
                width: 320,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow)',
                maxHeight: 400,
                overflowY: 'auto',
                zIndex: 200,
              }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem' }}>
                    Notifications
                  </p>
                </div>
                {notifications.length === 0 ? (
                  <p style={{ padding: '1.5rem', color: 'var(--muted)', textAlign: 'center', fontSize: '0.85rem' }}>
                    No notifications yet
                  </p>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: n.read ? 'transparent' : 'rgba(45,140,78,0.06)',
                      }}
                      onClick={() => {
                        if (n.payload.matchId) navigate(`/matches/${n.payload.matchId}`);
                        setShowNotifs(false);
                      }}
                    >
                      <p style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                        {n.type === 'match_request'   && '🎾 New match request'}
                        {n.type === 'match_accepted'  && '✅ Match accepted'}
                        {n.type === 'match_declined'  && '❌ Match declined'}
                        {n.type === 'message_received'&& '💬 New message'}
                        {n.type === 'elo_updated'     && '📊 Elo updated'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                        {new Date(n.ts).toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '2rem', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      {/* Elo flash toast */}
      {eloFlash && (
        <div className="slide-in" style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          background: eloFlash.delta >= 0 ? 'var(--court-green)' : '#7f1d1d',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1rem 1.5rem',
          zIndex: 999,
          boxShadow: 'var(--shadow)',
        }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
            {eloFlash.delta >= 0 ? '📈' : '📉'} Elo {eloFlash.delta >= 0 ? '+' : ''}{eloFlash.delta}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--court-line)', marginTop: '0.2rem' }}>
            New rating: <strong>{eloFlash.newElo}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
