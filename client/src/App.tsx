import { useEffect } from 'react';
import { Show, RedirectToSignIn } from '@clerk/react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { posthog } from './lib/posthog';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Matchmaking from './pages/Matchmaking';
import MatchDetail from './pages/MatchDetail';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import AdminAnalytics from './pages/AdminAnalytics';
import './index.css';

// PostHog only auto-captures the very first page load. For a client-side
// router like this one, each subsequent route change needs a manual
// $pageview capture — this component does that on every location change.
function PostHogPageview() {
  const location = useLocation();
  useEffect(() => {
    posthog.capture('$pageview');
  }, [location.pathname]);
  return null;
}

// ClerkProvider now lives in main.tsx, wrapping the whole app at the
// entry point (current recommended pattern) — App.tsx just handles routes.
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <PostHogPageview />
        <Routes>
          {/* Public */}
          <Route path="/sign-in/*" element={<RedirectToSignIn />} />
          <Route path="/onboarding" element={
            <Show when="signed-in"><Onboarding /></Show>
          } />

          {/* Protected */}
          <Route path="/" element={
            <>
              <Show when="signed-in">
                <Layout />
              </Show>
              <Show when="signed-out">
                <RedirectToSignIn />
              </Show>
            </>
          }>
            <Route index element={<Dashboard />} />
            <Route path="matchmaking" element={<Matchmaking />} />
            <Route path="matches/:id" element={<MatchDetail />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/:id" element={<Profile />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
