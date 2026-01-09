# Clerk Authentication Setup

## Prerequisites
1. Create a Clerk account at https://clerk.com
2. Create a new application in your Clerk dashboard

## Frontend Setup

1. **Get your Clerk Publishable Key**:
   - Go to your Clerk dashboard
   - Navigate to API Keys
   - Copy your "Publishable Key"

2. **Create environment file**:
   Create a `.env` file in the root directory with:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
   ```

## Backend Setup

1. **Get your Clerk Secret Key**:
   - Go to your Clerk dashboard
   - Navigate to API Keys
   - Copy your "Secret Key"

2. **Update server environment**:
   Create a `.env` file in the `server/server/` directory with:
   ```
   CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here
   ```

## Features Added

### Frontend Changes:
- ✅ ClerkProvider wraps the entire app
- ✅ SignedIn/SignedOut components handle authentication flow
- ✅ Navigation shows user email and logout button
- ✅ All API calls now use Clerk authentication tokens
- ✅ Removed custom login/register forms

### Backend Changes:
- ✅ Clerk middleware integrated
- ✅ All routes now use `requireAuth` middleware
- ✅ User ID from Clerk used instead of custom JWT
- ✅ Removed custom authentication endpoints

## How to Use

1. **Start the servers**:
   ```bash
   # Frontend
   npm run dev
   
   # Backend (in server/server directory)
   npm start
   ```

2. **Access the app**:
   - Open http://localhost:5173
   - You'll be redirected to Clerk's sign-in page
   - After authentication, you'll see the GameOn dashboard

3. **User Management**:
   - All user management is now handled by Clerk
   - Users can sign up/sign in through Clerk's interface
   - User profiles are still stored in your app's database

## API Endpoints

All endpoints now require Clerk authentication:

- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile
- `POST /api/events` - Create event
- `GET /api/events/user` - Get user's events
- `DELETE /api/events/:id` - Delete event
- `GET /api/matches/compatible-players` - Find compatible players
- `GET /api/matches/available-events` - Find available events

## Security Benefits

- ✅ Secure authentication handled by Clerk
- ✅ JWT tokens managed automatically
- ✅ Session management
- ✅ Password security
- ✅ Multi-factor authentication support
- ✅ Social login options (configurable in Clerk dashboard) 