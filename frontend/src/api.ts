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
