import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ClerkProvider } from '@clerk/react';
import { initPosthog } from './lib/posthog';

initPosthog();

// ClerkProvider reads VITE_CLERK_PUBLISHABLE_KEY from the environment
// automatically — no publishableKey prop needed. Wrapping here at the
// entry point (rather than inside App.tsx) is the current recommended
// pattern so auth context is available as early as possible.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider afterSignOutUrl="/sign-in">
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
