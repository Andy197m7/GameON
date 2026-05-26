import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Matchmaking from './pages/Matchmaking';
import MatchDetail from './pages/MatchDetail';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import AdminAnalytics from './pages/AdminAnalytics';
import './index.css';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/sign-in/*" element={<RedirectToSignIn />} />
            <Route path="/onboarding" element={
              <SignedIn><Onboarding /></SignedIn>
            } />

            {/* Protected */}
            <Route path="/" element={
              <>
                <SignedIn>
                  <Layout />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
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
    </ClerkProvider>
  );
}
