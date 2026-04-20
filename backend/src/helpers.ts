import { nanoid } from "nanoid";
import type { Database, Meeting, Scholarship, Student } from "./types.js";
import type { NextFunction, Request, Response } from "express";
import { MILLISECONDS_PER_DAY, DEADLINE_DUE_SOON_DAYS } from "./constants.js";

export const toIso = (value: string): string => new Date(value).toISOString();

export const nowIso = (): string => new Date().toISOString();

export const toGpaHistoryTerm = (isoTimestamp: string): string => `Update ${isoTimestamp.slice(0, 7)}`;

export const buildDefaultCurrentCourses = (major: string, catalog: Record<string, string[]>): string[] => {
  const courseCatalog = catalog[major] ?? ["General Studies Seminar"];
  return courseCatalog.slice(0, 4);
};

export const getRouteParam = (request: Request, key: string): string | null => {
  const value = request.params[key];
  return typeof value === "string" ? value : null;
};

export const addAuditLog = (
  database: Database,
  entityType: "student" | "scholarship" | "meeting" | "mentor-assignment",
  entityId: string,
  action: string,
  details?: Record<string, unknown>,
): void => {
  database.auditLogs.push({
    id: `log_${nanoid(10)}`,
    entityType,
    entityId,
    action,
    details,
    timestamp: nowIso(),
  });
};

export const canTransition = <TStatus extends string>(
  from: TStatus,
  to: TStatus,
  allowedTransitions: Record<TStatus, TStatus[]>,
): boolean => from === to || allowedTransitions[from].includes(to);

export const toUtcDayStart = (value: Date): number =>
  Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

export const calculateDaysUntilDeadline = (deadlineIso: string, referenceDate = new Date()): number => {
  const deadline = new Date(deadlineIso);
  const difference = toUtcDayStart(deadline) - toUtcDayStart(referenceDate);
  return Math.floor(difference / MILLISECONDS_PER_DAY);
};

export const withDeadlineTracking = (
  scholarship: Scholarship,
  referenceDate = new Date(),
) => {
  const daysUntilDeadline = calculateDaysUntilDeadline(scholarship.deadline, referenceDate);

  return {
    ...scholarship,
    deadlineTracking: {
      daysUntilDeadline,
      isDueSoon: daysUntilDeadline >= 0 && daysUntilDeadline <= DEADLINE_DUE_SOON_DAYS,
      isOverdue: daysUntilDeadline < 0,
    },
  };
};

export const findStudent = (database: Database, studentId: string): Student | undefined => {
  return database.students.find((student) => student.id === studentId);
};

export const findScholarship = (database: Database, scholarshipId: string): Scholarship | undefined => {
  return database.scholarships.find((scholarship) => scholarship.id === scholarshipId);
};

export const findMeeting = (database: Database, meetingId: string): Meeting | undefined => {
  return database.meetings.find((meeting) => meeting.id === meetingId);
};

export const asyncHandler = (
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>,
) => {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response, next).catch(next);
  };
};
