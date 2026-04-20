import type { Response } from "express";
import { nowIso } from "./helpers.js";
import type { ScholarshipStatus } from "./types.js";

export type ScholarshipRealtimeEventName =
  | "ready"
  | "heartbeat"
  | "scholarship.created"
  | "scholarship.updated"
  | "scholarship.deleted";

export type ScholarshipRealtimeEventPayload = {
  type: ScholarshipRealtimeEventName;
  occurredAt: string;
  scholarshipId?: string;
  studentId?: string;
  status?: ScholarshipStatus;
  previousStatus?: ScholarshipStatus;
  deadline?: string;
};

export const scholarshipEventClients = new Set<Response>();

export const toSseChunk = (
  eventName: ScholarshipRealtimeEventName,
  payload: ScholarshipRealtimeEventPayload,
): string => {
  return `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
};

export const broadcastScholarshipEvent = (
  eventName: Exclude<ScholarshipRealtimeEventName, "ready" | "heartbeat">,
  payload: Omit<ScholarshipRealtimeEventPayload, "type" | "occurredAt">,
): void => {
  if (scholarshipEventClients.size === 0) return;

  const eventPayload: ScholarshipRealtimeEventPayload = {
    type: eventName,
    occurredAt: nowIso(),
    ...payload,
  };
  const chunk = toSseChunk(eventName, eventPayload);

  scholarshipEventClients.forEach((client) => {
    client.write(chunk);
  });
};
