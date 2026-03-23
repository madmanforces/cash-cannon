# MONEY BIZ

MONEY BIZ is an AI revenue action coach for solo operators and small businesses.
The current prototype includes:

- a FastAPI backend with action recommendation, margin calculator, and copy generation endpoints
- a FastAPI backend with account, plan, and session APIs
- an Expo mobile onboarding flow that saves the business profile locally and syncs it to the backend when available
- an Expo mobile dashboard that consumes the saved profile and falls back to demo data when the API is unavailable
- product strategy and monetization docs for the next build phases

## Quick Start

### 1. Backend

```powershell
cd C:\Myworks\MONEY
python -m venv .venv
.\.venv\Scripts\python -m pip install -e '.\backend[dev]'
.\.venv\Scripts\python -m uvicorn app.main:app --reload --app-dir backend
```

### 2. Frontend

Create a local env file:

```powershell
cd C:\Myworks\MONEY\frontend
Copy-Item .env.example .env
```

Then run:

```powershell
cd C:\Myworks\MONEY\frontend
npm install
npm run web
```

Default API target:

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Backend CORS:

```text
Local browser origins such as http://localhost:8081 and http://127.0.0.1:8081 are allowed by default.
You can add extra origins with CORS_ALLOW_ORIGINS=http://example.com,http://another-host:3000
```

## How To View It

### API docs

Start the backend, then open:

```text
http://127.0.0.1:8000/docs
```

### Frontend

Start the frontend with:

```powershell
cd C:\Myworks\MONEY\frontend
npm run web
```

Expo will open a browser window or print a local web URL in the terminal.

### First-run flow

1. Open the web app.
2. Create an account or log in.
3. Fill in the onboarding form and save the business profile.
4. Open the dashboard and use the `Account` button to switch plans.
5. When you choose a paid plan, open the mock checkout page, approve the payment, then return to the account screen and press `Refresh Status`.

### Current plan limits

- `Free`: 1 synced business profile, 3 recommendation history snapshots
- `Pro`: 3 synced business profiles, 15 recommendation history snapshots
- `Team`: 10 synced business profiles, 50 recommendation history snapshots

### Local DB file

After the backend starts, the local database file is created here by default:

```text
C:\Myworks\MONEY\money_biz.db
```

## Verification

Verified in this session:

- backend tests: `.\.venv\Scripts\python -m pytest backend/tests`
- frontend typecheck: `npm run typecheck`
- frontend web bundle: `npx expo export --platform web`

## Repo Layout

```text
MONEY
|- backend
|  |- app
|  `- tests
|- docs
`- frontend
   |- assets
   `- src
```

## MVP Scope

### Backend

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/billing/plans`
- `POST /api/billing/checkout`
- `GET /api/billing/checkout-sessions/{session_id}`
- `POST /api/billing/webhooks/mock`
- `GET /api/billing/mock/checkout/{session_id}`
- `POST /api/billing/mock/checkout/{session_id}/complete`
- `POST /api/billing/mock/checkout/{session_id}/cancel`
- `POST /api/actions/today`
- `POST /api/calculator/margin`
- `POST /api/ai/copy`
- `POST /api/onboarding/profile`
- `POST /api/business-profiles`
- `GET /api/business-profiles/me/latest`
- `GET /api/business-profiles/{profile_id}`
- `PUT /api/business-profiles/{profile_id}`
- `POST /api/business-profiles/{profile_id}/actions/today`
- `GET /api/business-profiles/{profile_id}/recommendations`
- `GET /health`

### Frontend

- account auth screen with sign-up / login modes
- onboarding form with editable business profile and weekly snapshot
- local AsyncStorage save flow for the onboarding payload
- dashboard hero with revenue focus mode
- three action cards
- margin summary panel
- copy studio preview
- account screen with plan selection and logout
- mock checkout session card with open/refresh flow
- edit/reset flow for the saved profile
- live API fetch with demo fallback

## Product Direction

The current product recommendation remains `MONEY BIZ`:

- target: small businesses and solo operators
- promise: show the next three actions that are most likely to improve revenue
- monetization: subscription + add-on AI credits/template packs

Detailed planning docs:

- [PRD](docs/prd.md)
- [Monetization](docs/monetization.md)
- [Architecture](docs/architecture.md)
- [Research Notes](docs/research-notes.md)
