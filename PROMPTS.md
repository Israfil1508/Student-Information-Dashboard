# PROMPTS.md

This file captures the most useful AI prompts used during development, plus a refined reusable prompt for future iterations.

## Master Prompt (Reusable)

Use this prompt when you want an AI assistant to extend or refactor this project safely:

"You are helping maintain a full-stack Student Information Dashboard with this stack: React + TypeScript + Vite frontend, Node.js + Express + TypeScript backend, JSON-file persistence.

Requirements:
1. Preserve existing module architecture: Student Directory, Profile Dashboard, Scholarship Management, Mentorship & Meetings.
2. Keep API response envelope consistent: success, data, error.
3. Respect business rules: enrollment transition matrix, scholarship transition matrix, mentor capacity constraints.
4. Keep strict TypeScript compatibility in frontend and backend.
5. Add or update tests for behavior changes.
6. Do not break existing API routes unless explicitly requested.
7. Use clear error messages for validation or conflict cases.
8. When implementing a feature, provide:
	- Changed files
	- Why each change was needed
	- Commands to verify (build/test)
	- Risk notes or edge cases

Task:
[PUT FEATURE OR BUGFIX REQUEST HERE]
"

## Prompt Evolution Log

## 1) Initial Scaffolding

Prompt:

"Create a full-stack project for a student dashboard using React TypeScript frontend and Node/Express TypeScript backend. Keep directories as frontend/ and backend/."

Outcome:

- Generated the initial split architecture plan.
- Manually executed scaffold commands and dependency installation.

## 2) Data Model and Validation

Prompt:

"Design TypeScript interfaces and API validation for students, scholarships, mentors, and meetings. Include timestamped history for status changes."

Outcome:

- Produced shared model direction for frontend/backend types.
- Manually hardened business rules (transition matrices and audit logs).

## 3) API Architecture

Prompt:

"Implement REST endpoints for student list/search, student profile aggregate, scholarship management, mentor assignment, and meeting CRUD with consistent JSON responses."

Outcome:

- Generated endpoint skeleton and response-envelope approach.
- Manually refined edge cases (mentor capacity, transition conflicts, route-param safety).

## 4) Frontend Module Architecture

Prompt:

"Create a React dashboard with four modules: directory, profile dashboard, scholarship management, and mentorship meetings. Use real API calls with loading and error states."

Outcome:

- Built initial directory + workspace module layout.
- Manually improved accessibility labels, keyboard flow, and status feedback.

## 5) Data Visualization

Prompt:

"Add GPA trend and credit completion visualization to the profile dashboard using a charting library."

Outcome:

- Implemented GPA trend line chart with Recharts.
- Implemented progress-bar style credit completion indicator.

## 6) Backend TypeScript Debugging

Prompt:

"Fix backend TypeScript issues caused by route params typed as string | string[] and ensure meeting status types are strict."

Outcome:

- Added route parameter normalization helper.
- Tightened status typing in seed and route handlers.

## 7) Frontend TypeScript Debugging

Prompt:

"Fix frontend TypeScript strict import issues in React components."

Outcome:

- Switched event imports to type-only where required.
- Rebuilt frontend successfully with strict checks.

## 8) Documentation and Audit

Prompt:

"Generate project documentation with explicit AI-vs-human decision audit, setup commands, endpoint summary, and environment-variable details."

Outcome:

- Completed README and AI review documents aligned with assignment expectations.
- Documented both AI-generated acceleration and manual correctness fixes.
