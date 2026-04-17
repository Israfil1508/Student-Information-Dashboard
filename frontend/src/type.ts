export type AcademicYear = "Freshman" | "Sophomore" | "Junior" | "Senior";

export type EnrollmentStatus =
  | "Full-time"
  | "Part-time"
  | "Leave of Absence"
  | "Graduated";

export type ScholarshipStatus =
  | "Researching"
  | "Applied"
  | "Interview"
  | "Awarded"
  | "Rejected";

export type MeetingStatus = "Scheduled" | "Completed" | "Cancelled";

export interface Demographics {
  firstGeneration: boolean;
  lowIncome: boolean;
  underrepresentedMinority: boolean;
}

export interface GpaPoint {
  term: string;
  gpa: number;
  recordedAt: string;
}

export interface StatusHistory<T extends string> {
  status: T;
  changedAt: string;
  note?: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  academicYear: AcademicYear;
  major: string;
  gpa: number;
  enrollmentStatus: EnrollmentStatus;
  creditsCompleted: number;
  creditsRequired: number;
  expectedGraduation: string;
  demographics: Demographics;
  assignedMentorId: string | null;
  gpaHistory: GpaPoint[];
  enrollmentStatusHistory: StatusHistory<EnrollmentStatus>[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentDirectoryRecord {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  academicYear: AcademicYear;
  major: string;
  enrollmentStatus: EnrollmentStatus;
  quickStats: {
    gpa: number;
    creditsCompleted: number;
    creditsRequired: number;
    scholarshipsTracked: number;
    upcomingScholarshipDeadlines: number;
  };
}

export interface Scholarship {
  id: string;
  studentId: string;
  name: string;
  provider: string;
  amount: number;
  currency: string;
  status: ScholarshipStatus;
  statusHistory: StatusHistory<ScholarshipStatus>[];
  deadline: string;
  requirements: string[];
  essayRequired: boolean;
  essaySubmitted?: boolean;
  notes: string;
  dateApplied?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Mentor {
  id: string;
  name: string;
  title: string;
  company: string;
  expertise: string[];
  email: string;
  bio: string;
  maxMentees: number;
  activeMentees?: number;
}

export interface Meeting {
  id: string;
  studentId: string;
  mentorId: string;
  date: string;
  duration: number;
  notes: string;
  actionItems: string[];
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
  mentorName?: string;
}

export interface StudentProfilePayload {
  student: Student;
  academicProgress: {
    currentGpa: number;
    gpaTrend: GpaPoint[];
    creditsCompleted: number;
    creditsRequired: number;
    completionPercent: number;
  };
  scholarships: Scholarship[];
  mentorship: {
    mentor: Mentor | null;
    meetings: Meeting[];
  };
}

export interface DashboardSummary {
  totalStudents: number;
  totalMentors: number;
  totalScholarships: number;
  totalMeetings: number;
  scholarshipByStatus: Record<string, number>;
  upcomingDeadlines: Scholarship[];
  scheduledMeetings: Meeting[];
}

export interface ApiError {
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: ApiError;
}
