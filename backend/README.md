# Backend - Student Information API

Node.js + Express + TypeScript REST API for the Access to Education dashboard.

## Live URL

- API: `ADD_API_URL_AFTER_DEPLOY`

## Run Locally

```bash
cp .env.example .env
npm install
npm run seed
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Tests

```bash
npm test
```

Current automated coverage includes:

- Unit tests for Zod validation rules (credits bounds, GPA-history consistency, empty updates, scholarship date constraints)
- Integration tests for API correctness (`/api/health`, student creation + retrieval, invalid payload rejection, enrollment transition rules)

## Environment Variables

Backend configuration environment variables:

| Variable | Required | Default | Example | Purpose |
| --- | --- | --- | --- | --- |
| `PORT` | No | `4000` | `4000` | API listen port. Most hosting platforms provide this automatically. |
| `CORS_ORIGIN` | Yes (for deployment) | `http://localhost:5173` | `https://your-frontend-domain.com` | Allowed CORS origins. Provide comma-separated values for multiple frontend domains. |
| `DATA_FILE` | No | `./data/db.json` | `/var/app/data/db.json` | JSON database file location. Relative paths are resolved from `backend/`. |

Notes:

- Keep `CORS_ORIGIN` aligned with the exact frontend origin (protocol + domain + port if used).
- Ensure the directory for `DATA_FILE` is writable in your deployment environment.
- No additional backend-specific env vars are required by application code.

### backend/.env.example

```env
PORT=4000
CORS_ORIGIN=http://localhost:5173
DATA_FILE=./data/db.json
```

## Data Model Coverage

- Students (profile, demographics, academics, enrollment history)
- Scholarships (status tracking and timestamped history)
- Mentors (capacity and assignment)
- Meetings (full CRUD and timestamped logs)
- Audit logs (cross-entity timestamped actions)

Detailed model fields and relationships: see DATA_MODEL.md.

## Main Endpoints

- `GET /api/health`
- `GET /api/dashboard/summary`
- `GET /api/students`
- `GET /api/students/:studentId`
- `POST /api/students`
- `PUT /api/students/:studentId`
- `GET/PUT /api/students/:studentId/mentor`
- `GET/POST /api/students/:studentId/scholarships`
- `PUT /api/scholarships/:scholarshipId`
- `GET/POST /api/students/:studentId/meetings`
- `PUT/DELETE /api/meetings/:meetingId`

## Validation and Rules

- GPA must be between 0.0 and 4.0
- Credits completed cannot exceed credits required
- Enrollment status transitions are validated
- Scholarship status transitions are validated
- Mentor assignment respects `maxMentees`
- `expectedGraduation` accepts date-only format (`YYYY-MM-DD`)
- Other date/time fields are validated and normalized to ISO timestamps

## Seed Data

`npm run seed` creates:

- 15 students
- 5 mentors
- 22 scholarships
- 30 meetings

## Technical Decisions

- AI-suggested: Express REST structure with Zod validation and standardized response envelopes.
- Manual override: strict transition rules for enrollment and scholarship statuses, plus mentor-capacity checks.

## One Improvement With More Time

- Move persistence from JSON file to PostgreSQL with migrations and indexes.
