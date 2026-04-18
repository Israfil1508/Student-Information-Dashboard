# Backend Data Model

This document defines the core data model used by the backend API.

## Core Entities

### Student
Purpose: profile, demographics, and academic progress.

Fields:
- id
- firstName
- lastName
- email
- avatarUrl (optional)
- academicYear
- major
- gpa
- enrollmentStatus
- creditsCompleted
- creditsRequired
- currentCourses
- expectedGraduation (YYYY-MM-DD)
- demographics
- assignedMentorId (nullable)
- gpaHistory
- enrollmentStatusHistory
- createdAt
- updatedAt

### Scholarship
Purpose: scholarship applications with status tracking and deadlines.

Fields:
- id
- studentId
- name
- provider
- amount
- currency
- status
- statusHistory
- deadline
- requirements
- essayRequired
- essaySubmitted (optional)
- notes
- dateApplied (optional)
- createdAt
- updatedAt

### Mentor
Purpose: mentor profile and assignment capacity.

Fields:
- id
- name
- title
- company
- expertise
- email
- bio
- maxMentees
- createdAt
- updatedAt

### Meeting
Purpose: mentorship session logs with timestamps.

Fields:
- id
- studentId
- mentorId
- date
- duration
- notes
- actionItems
- status
- createdAt
- updatedAt

## Supporting Types

### Demographics
- firstGeneration
- lowIncome
- underrepresentedMinority

### StatusChange
Reusable status history record:
- status
- changedAt
- note (optional)

### GpaPoint
GPA timeline point:
- term
- gpa
- recordedAt

### AuditLog
Cross-entity activity log:
- id
- entityType
- entityId
- action
- timestamp
- details (optional)

## Relationships

- One student has many scholarships through scholarship.studentId.
- One student has many meetings through meeting.studentId.
- One mentor has many meetings through meeting.mentorId.
- One student can have zero or one assigned mentor through student.assignedMentorId.
- Mentor capacity is enforced by maxMentees.

## Persistence Shape

The JSON database stores top-level collections:
- students
- mentors
- scholarships
- meetings
- auditLogs

This is represented by the Database interface in source code.
