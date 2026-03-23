# MONEY BIZ

MONEY BIZ is an AI revenue action coach for solo operators and small businesses.
The current prototype includes:

- a FastAPI backend with action recommendation, margin calculator, and copy generation endpoints
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

- `POST /api/actions/today`
- `POST /api/calculator/margin`
- `POST /api/ai/copy`
- `POST /api/onboarding/profile`
- `POST /api/business-profiles`
- `GET /api/business-profiles/{profile_id}`
- `PUT /api/business-profiles/{profile_id}`
- `POST /api/business-profiles/{profile_id}/actions/today`
- `GET /api/business-profiles/{profile_id}/recommendations`
- `GET /health`

### Frontend

- onboarding form with editable business profile and weekly snapshot
- local AsyncStorage save flow for the onboarding payload
- dashboard hero with revenue focus mode
- three action cards
- margin summary panel
- copy studio preview
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
