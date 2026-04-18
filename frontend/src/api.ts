import axios from "axios";
import type {
  AcademicYear,
  ApiResponse,
  DashboardSummary,
  EnrollmentStatus,
  Meeting,
  MeetingStatus,
  Mentor,
  Scholarship,
  ScholarshipStatus,
  Student,
  StudentDirectoryRecord,
  StudentProfilePayload,
} from "./types";

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:4000";

const api = axios.create({
  baseURL,
  timeout: 15000,
});

const extractErrorMessageFromPayload = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as {
    message?: unknown;
    error?: { message?: unknown };
  };

  if (typeof record.error?.message === "string" && record.error.message.trim().length > 0) {
    return record.error.message;
  }

  if (typeof record.message === "string" && record.message.trim().length > 0) {
    return record.message;
  }

  return null;
};

const toApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const payloadMessage = extractErrorMessageFromPayload(error.response?.data);
    if (payloadMessage) {
      return payloadMessage;
    }

    if (error.code === "ECONNABORTED") {
      return "Request timed out. Please try again.";
    }

    if (!error.response) {
      return "Cannot reach API server. Please check your connection and try again.";
    }

    return `Request failed with status ${error.response.status}`;
  }

  return error instanceof Error ? error.message : "Request failed";
};

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(new Error(toApiErrorMessage(error))),
);

const unwrap = <T>(response: { data: ApiResponse<T> }): T => {
  if (!response.data.success) {
    throw new Error(response.data.error?.message || "Request failed");
  }
  return response.data.data;
};

export interface StudentFilters {
  search?: string;
  academicYear?: AcademicYear | "All";
  enrollmentStatus?: EnrollmentStatus | "All";
  major?: string;
}

export interface StudentUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  academicYear?: AcademicYear;
  major?: string;
  gpa?: number;
  enrollmentStatus?: EnrollmentStatus;
  creditsCompleted?: number;
  creditsRequired?: number;
  expectedGraduation?: string;
  demographics?: {
    firstGeneration: boolean;
    lowIncome: boolean;
    underrepresentedMinority: boolean;
  };
  assignedMentorId?: string | null;
  gpaHistory?: Array<{
    term: string;
    gpa: number;
    recordedAt: string;
  }>;
}

export interface StudentCreateInput extends StudentUpdateInput {
  firstName: string;
  lastName: string;
  email: string;
  academicYear: AcademicYear;
  major: string;
  gpa: number;
  enrollmentStatus: EnrollmentStatus;
  creditsCompleted: number;
  creditsRequired: number;
  expectedGraduation: string;
  demographics: {
    firstGeneration: boolean;
    lowIncome: boolean;
    underrepresentedMinority: boolean;
  };
}

export interface ScholarshipCreateInput {
  name: string;
  provider: string;
  amount: number;
  currency: string;
  status: ScholarshipStatus;
  deadline: string;
  requirements: string[];
  essayRequired: boolean;
  essaySubmitted?: boolean;
  notes: string;
  dateApplied?: string;
}

export interface ScholarshipUpdateInput {
  status?: ScholarshipStatus;
  notes?: string;
  deadline?: string;
}

export interface MeetingCreateInput {
  mentorId?: string;
  date: string;
  duration: number;
  notes: string;
  actionItems: string[];
  status: MeetingStatus;
}

export interface MeetingUpdateInput {
  status?: MeetingStatus;
  notes?: string;
  actionItems?: string[];
  date?: string;
}

export type ScholarshipRealtimeEventType =
  | "ready"
  | "heartbeat"
  | "scholarship.created"
  | "scholarship.updated"
  | "scholarship.deleted";

export interface ScholarshipRealtimeEvent {
  type: ScholarshipRealtimeEventType;
  occurredAt: string;
  scholarshipId?: string;
  studentId?: string;
  status?: ScholarshipStatus;
  previousStatus?: ScholarshipStatus;
  deadline?: string;
}

const scholarshipRealtimeEventTypes = new Set<ScholarshipRealtimeEventType>([
  "ready",
  "heartbeat",
  "scholarship.created",
  "scholarship.updated",
  "scholarship.deleted",
]);

const parseScholarshipRealtimeEvent = (rawData: string): ScholarshipRealtimeEvent | null => {
  try {
    const parsed = JSON.parse(rawData) as Partial<ScholarshipRealtimeEvent>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.type !== "string") return null;
    if (!scholarshipRealtimeEventTypes.has(parsed.type as ScholarshipRealtimeEventType)) return null;
    if (typeof parsed.occurredAt !== "string") return null;

    return parsed as ScholarshipRealtimeEvent;
  } catch {
    return null;
  }
};

export const subscribeToScholarshipEvents = (
  onEvent: (event: ScholarshipRealtimeEvent) => void,
  onError?: (event: Event) => void,
): (() => void) => {
  const streamUrl = `${baseURL.replace(/\/$/, "")}/api/events/scholarships`;
  const source = new EventSource(streamUrl);

  const handleIncomingEvent = (rawEvent: Event) => {
    const event = rawEvent as MessageEvent<string>;
    const parsed = parseScholarshipRealtimeEvent(event.data);
    if (!parsed) return;
    onEvent(parsed);
  };

  const eventNames: ScholarshipRealtimeEventType[] = [
    "ready",
    "heartbeat",
    "scholarship.created",
    "scholarship.updated",
    "scholarship.deleted",
  ];

  eventNames.forEach((eventName) => {
    source.addEventListener(eventName, handleIncomingEvent as EventListener);
  });

  source.onerror = (event) => {
    if (onError) {
      onError(event);
    }
  };

  return () => {
    eventNames.forEach((eventName) => {
      source.removeEventListener(eventName, handleIncomingEvent as EventListener);
    });
    source.close();
  };
};

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await api.get<ApiResponse<DashboardSummary>>("/api/dashboard/summary");
  return unwrap(response);
};

export const fetchStudents = async (
  filters: StudentFilters,
): Promise<{ total: number; students: StudentDirectoryRecord[] }> => {
  const query: Record<string, string> = {};

  if (filters.search) query.search = filters.search;
  if (filters.academicYear && filters.academicYear !== "All") {
    query.academicYear = filters.academicYear;
  }
  if (filters.enrollmentStatus && filters.enrollmentStatus !== "All") {
    query.enrollmentStatus = filters.enrollmentStatus;
  }
  if (filters.major) query.major = filters.major;

  const response = await api.get<
    ApiResponse<{ total: number; students: StudentDirectoryRecord[] }>
  >("/api/students", { params: query });

  return unwrap(response);
};

export const fetchStudentProfile = async (studentId: string): Promise<StudentProfilePayload> => {
  const response = await api.get<ApiResponse<StudentProfilePayload>>(`/api/students/${studentId}`);
  return unwrap(response);
};

export const updateStudent = async (
  studentId: string,
  payload: StudentUpdateInput,
): Promise<Student> => {
  const response = await api.put<ApiResponse<Student>>(`/api/students/${studentId}`, payload);
  return unwrap(response);
};

export const createStudent = async (payload: StudentCreateInput): Promise<Student> => {
  const response = await api.post<ApiResponse<Student>>("/api/students", payload);
  return unwrap(response);
};

export const deleteStudent = async (
  studentId: string,
): Promise<{ student: Student; removedScholarships: number; removedMeetings: number }> => {
  const response = await api.delete<
    ApiResponse<{ student: Student; removedScholarships: number; removedMeetings: number }>
  >(`/api/students/${studentId}`);
  return unwrap(response);
};

export const fetchMentors = async (): Promise<Mentor[]> => {
  const response = await api.get<ApiResponse<Mentor[]>>("/api/mentors");
  return unwrap(response);
};

export const assignMentor = async (
  studentId: string,
  mentorId: string,
): Promise<{ studentId: string; mentor: Mentor; assignedAt: string }> => {
  const response = await api.put<
    ApiResponse<{ studentId: string; mentor: Mentor; assignedAt: string }>
  >(`/api/students/${studentId}/mentor`, { mentorId });
  return unwrap(response);
};

export const createScholarship = async (
  studentId: string,
  payload: ScholarshipCreateInput,
): Promise<Scholarship> => {
  const response = await api.post<ApiResponse<Scholarship>>(
    `/api/students/${studentId}/scholarships`,
    payload,
  );
  return unwrap(response);
};

export const updateScholarship = async (
  scholarshipId: string,
  payload: ScholarshipUpdateInput,
): Promise<Scholarship> => {
  const response = await api.put<ApiResponse<Scholarship>>(
    `/api/scholarships/${scholarshipId}`,
    payload,
  );
  return unwrap(response);
};

export const fetchMeetings = async (studentId: string, search?: string): Promise<Meeting[]> => {
  const response = await api.get<ApiResponse<Meeting[]>>(`/api/students/${studentId}/meetings`, {
    params: search ? { search } : undefined,
  });
  return unwrap(response);
};

export const createMeeting = async (
  studentId: string,
  payload: MeetingCreateInput,
): Promise<Meeting> => {
  const response = await api.post<ApiResponse<Meeting>>(
    `/api/students/${studentId}/meetings`,
    payload,
  );
  return unwrap(response);
};

export const updateMeeting = async (
  meetingId: string,
  payload: MeetingUpdateInput,
): Promise<Meeting> => {
  const response = await api.put<ApiResponse<Meeting>>(`/api/meetings/${meetingId}`, payload);
  return unwrap(response);
};

export default api;
