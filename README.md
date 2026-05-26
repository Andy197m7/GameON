# GameOn — Tennis Matchmaking Platform

Full-stack tennis matchmaking platform. Elo-based skill matching, real-time Socket.io events, in-match chat, court discovery via Google Places, BullMQ email notifications, and a PostHog analytics pipeline.

## Architecture

```
client/          React + TypeScript + Vite (port 5173)
server/          Node.js + Express + Socket.io (port 4000)
  models/        Mongoose schemas (User, Match, Court)
  routes/        REST API routes
  services/      Elo, Redis, notifications, analytics, logger
  socket/        Socket.io server with Redis adapter
  workers/       BullMQ notification worker + weekly Elo cron
mongo            MongoDB with geospatial indexes (port 27017)
redis            Redis pub/sub + BullMQ broker (port 6379)
```

## Stack

| Layer         | Technology                              |
|---------------|-----------------------------------------|
| Frontend      | React 18, TypeScript, Vite, Recharts    |
| Auth          | Clerk                                   |
| Backend       | Node.js, Express                        |
| Real-time     | Socket.io + @socket.io/redis-adapter    |
| Database      | MongoDB (geospatial indexes)            |
| Cache/Queue   | Redis (pub/sub) + BullMQ               |
| Email         | Resend + BullMQ worker                 |
| Analytics     | PostHog                                 |
| Maps          | Google Maps API (Geocoding + Places)    |
| Deployment    | Docker Compose                          |

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd gameon

# Install server deps
cd server && npm install && cd ..

# Install client deps
cd client && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in all keys — see .env.example for where to get each one
```

Required keys:
- **CLERK_SECRET_KEY** + **VITE_CLERK_PUBLISHABLE_KEY** → https://dashboard.clerk.com
- **GOOGLE_MAPS_API_KEY** → https://console.cloud.google.com (enable Geocoding API + Places API)
- **RESEND_API_KEY** → https://resend.com (free tier — 3,000 emails/month)
- **POSTHOG_API_KEY** → https://app.posthog.com (free tier — 1M events/month)

### 3. Run with Docker (recommended)

```bash
docker-compose up --build
```

This starts MongoDB, Redis, the Node server, BullMQ worker, and React client all in one command.

### 4. Run without Docker

```bash
# Terminal 1: MongoDB (must be installed locally)
mongod

# Terminal 2: Redis
redis-server

# Terminal 3: Server
cd server && npm run dev

# Terminal 4: Notification worker
cd server && npm run worker

# Terminal 5: Client
cd client && npm run dev
```

### 5. Seed tennis courts

Once the server is running, call the seed endpoint to populate courts near your city:

```bash
curl -X POST http://localhost:4000/api/courts/seed \
  -H "Content-Type: application/json" \
  -d '{"lat": 30.2672, "lng": -97.7431, "radiusMiles": 15}'
```

Replace lat/lng with your city's coordinates.

## Key Engineering Decisions

**Elo rating system** — Every player starts at 1200. K-factor is 32 for players with <20 matches, 16 for established players. Matchmaking queries use a ±100 Elo band that widens by 50 every time no match is found (progressive relaxation). Ratings update atomically when both players confirm a match result.

**Socket.io + Redis adapter** — Every user joins a private Socket.io room (`user:{id}`). The Redis adapter means all socket events work correctly across multiple server instances without any code changes. Swap the single-server Docker config for a load-balanced setup and it just works.

**BullMQ notification queue** — Email sends are never done inline in request handlers (which would block the response and fail silently). Every notification is a BullMQ job with 3 retry attempts and exponential backoff. The worker runs as a separate process so email failures never affect API latency.

**Geospatial indexes** — MongoDB `2dsphere` indexes on User and Court `location` fields enable `$geoNear` queries that filter by distance in a single indexed operation. No external geo library needed.

**Two-player score confirmation** — Both players must submit the same score before Elo updates. This prevents one player from unilaterally entering a false result. The `scoreSubmittedBy` array tracks who has confirmed.

## API Reference

```
POST   /api/auth/sync              Create/update user after Clerk login
POST   /api/auth/onboard           Set location and preferences

GET    /api/users/me               My profile
PUT    /api/users/me               Update profile
GET    /api/users/:id              View another player
GET    /api/users/search/nearby    Find nearby players (Elo-filtered)

POST   /api/matches                Create match request
GET    /api/matches                My matches (filterable by status)
GET    /api/matches/:id            Single match
PATCH  /api/matches/:id/accept     Accept match request
PATCH  /api/matches/:id/decline    Decline match request
PATCH  /api/matches/:id/score      Submit score + trigger Elo update
POST   /api/matches/:id/messages   Send chat message

GET    /api/courts/nearby          Courts near a location
GET    /api/courts/midpoint        3 courts near midpoint of two players
POST   /api/courts/seed            Seed courts from Google Places (admin)

GET    /api/analytics/overview     DAU/WAU/MAU, funnel, Elo distribution
GET    /api/analytics/matches/weekly  Match volume over 8 weeks
```

## Socket Events

| Event             | Direction       | Payload                                |
|-------------------|-----------------|----------------------------------------|
| `match_request`   | server → client | `{ matchId, requester, scheduledAt }` |
| `match_accepted`  | server → client | `{ matchId, opponent }`               |
| `match_declined`  | server → client | `{ matchId }`                         |
| `message_received`| server → client | `{ matchId, message }`                |
| `elo_updated`     | server → client | `{ newElo, delta }`                   |
| `set_available`   | client → server | `{ isAvailable: boolean }`            |
