# Access to Education - Student Information Dashboard

Full-stack student information system built with React + TypeScript (frontend) and Node.js + Express + TypeScript (backend).

This project implements the four required modules:

1. Student Directory
2. Student Profile Dashboard
3. Scholarship Management
4. Mentorship and Meetings

## Live URLs

- Frontend: `ADD_FRONTEND_URL_AFTER_DEPLOY`
- API: `ADD_API_URL_AFTER_DEPLOY`

## Repository Structure

- `frontend/` - React TypeScript app (Vite)
- `backend/` - Express TypeScript REST API
- `PROMPTS.md` - AI interaction log
- `AI_REVIEW.md` - AI self-critique and technical debt

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Axios, Recharts
- Backend: Node.js, Express 5, TypeScript, Zod, JSON file persistence
- Data: Seeded JSON database (`backend/data/db.json`)

## Quick Start

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

Backend runs by default at `http://localhost:4000`.

### 2) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs by default at `http://localhost:5173`.

## Environment Variables

The application requires these environment variables for local and deployment configuration.

### backend/.env

| Variable | Required | Default | Example | Purpose |
| --- | --- | --- | --- | --- |
| `PORT` | No | `4000` | `4000` | Backend listen port. In many cloud providers this is injected automatically. |
| `CORS_ORIGIN` | Yes (for deployment) | `http://localhost:5173` | `https://your-frontend-domain.com` | Allowed frontend origins. Use comma-separated values for multiple domains. |
| `DATA_FILE` | No | `./data/db.json` | `/var/app/data/db.json` | Path to the JSON database file. Relative paths resolve from the backend working directory. |

### frontend/.env

| Variable | Required | Default | Example | Purpose |
| --- | --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Yes (for deployment) | `http://localhost:4000` | `https://api.your-domain.com` | Base URL used by the frontend for all API requests. |

Notes:

- Do not add trailing slash to `VITE_API_BASE_URL`.
- `VITE_*` variables are exposed to browser code by Vite.
- No additional app-specific environment variables are used by this codebase.

### Copy-Paste Templates

backend/.env.example

```env
PORT=4000
CORS_ORIGIN=http://localhost:5173
DATA_FILE=./data/db.json
```

frontend/.env.example

```env
VITE_API_BASE_URL=http://localhost:4000
```

## Required Feature Coverage

- Real API integration across all modules
- Searchable and filterable student directory
- Full student profile with demographics, academics, scholarships, mentor and meetings
- Scholarship CRUD actions with logical status transitions and timestamp history
- Mentor assignment with capacity checks
- Meeting CRUD actions with searchable notes and timestamp tracking
- GPA trend chart, current courses, and credit completion progress indicator
- Loading, error, and success states in UI
- Keyboard-accessible controls and semantic labels

## API Endpoint Highlights

- `GET /api/students` - list + search + filters
- `GET /api/students/:studentId` - full profile payload
- `POST /api/students` and `PUT /api/students/:studentId`
- `GET/POST /api/students/:studentId/scholarships`
- `PUT /api/scholarships/:scholarshipId`
- `GET/PUT /api/students/:studentId/mentor`
- `GET/POST /api/students/:studentId/meetings`
- `PUT/DELETE /api/meetings/:meetingId`

## Decision Audit (AI-Suggested vs Overrides)

AI-suggested decisions:

- Start with Express + Vite split in `backend/` and `frontend/`
- Use Zod schemas for API validation
- Use Recharts for GPA trend visualization
- Use a JSON database file for quick local demo setup

Manual overrides I made:

- Added strict enrollment and scholarship status transition rules
- Added timestamped status history arrays (not just current status fields)
- Added mentor capacity checks during assignment
- Structured profile endpoint to aggregate cross-module data for frontend simplicity
- Introduced explicit API response envelope for consistency (`success`, `data`, `error`)

## Deployment Notes

Recommended deployment:

1. Deploy backend to Render/Railway/Fly.io.
2. Set backend env vars (`PORT`, `CORS_ORIGIN`, `DATA_FILE`).
3. Deploy frontend to Vercel/Netlify.
4. Set `VITE_API_BASE_URL` in frontend environment.
5. Replace live URL placeholders in this README.

## One Thing to Improve Next

- Add paginated API responses and server-side caching for large student datasets.
