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

export interface StatusChange<TStatus extends string> {
  status: TStatus;
  changedAt: string;
  note?: string;
}

export interface GpaPoint {
  term: string;
  gpa: number;
  recordedAt: string;
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
  currentCourses: string[];
  expectedGraduation: string;
  demographics: Demographics;
  assignedMentorId: string | null;
  gpaHistory: GpaPoint[];
  enrollmentStatusHistory: StatusChange<EnrollmentStatus>[];
  createdAt: string;
  updatedAt: string;
}

export interface Scholarship {
  id: string;
  studentId: string;
  name: string;
  provider: string;
  amount: number;
  currency: string;
  status: ScholarshipStatus;
  statusHistory: StatusChange<ScholarshipStatus>[];
  deadline: string;
  requirements: string[];
  essayRequired: boolean;
  essaySubmitted?: boolean;
  notes: string;
  dateApplied?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScholarshipDeadlineTracking {
  daysUntilDeadline: number;
  isDueSoon: boolean;
  isOverdue: boolean;
}

export interface ScholarshipWithDeadlineTracking extends Scholarship {
  deadlineTracking: ScholarshipDeadlineTracking;
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
  createdAt: string;
  updatedAt: string;
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
}

export interface AuditLog {
  id: string;
  entityType: "student" | "scholarship" | "meeting" | "mentor-assignment";
  entityId: string;
  action: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface Database {
  students: Student[];
  mentors: Mentor[];
  scholarships: Scholarship[];
  meetings: Meeting[];
  auditLogs: AuditLog[];
}
