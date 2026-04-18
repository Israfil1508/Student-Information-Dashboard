import { z } from "zod";

const GPA_MIN = 0;
const GPA_MAX = 4;
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const gpaSchema = z.number().min(GPA_MIN).max(GPA_MAX);

const isGpaAlignedWithHistory = (
  gpa: number,
  gpaHistory?: Array<{ gpa: number }>,
): boolean => {
  if (!gpaHistory || gpaHistory.length === 0) {
    return true;
  }

  const latestPoint = gpaHistory[gpaHistory.length - 1];
  return Math.abs(latestPoint.gpa - gpa) <= 0.01;
};

const isDateAppliedOnOrBeforeDeadline = (
  dateApplied?: string,
  deadline?: string,
): boolean => {
  if (!dateApplied || !deadline) {
    return true;
  }

  return new Date(dateApplied).getTime() <= new Date(deadline).getTime();
};

export const academicYearSchema = z.enum([
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
]);

export const enrollmentStatusSchema = z.enum([
  "Full-time",
  "Part-time",
  "Leave of Absence",
  "Graduated",
]);

export const scholarshipStatusSchema = z.enum([
  "Researching",
  "Applied",
  "Interview",
  "Awarded",
  "Rejected",
]);

export const meetingStatusSchema = z.enum(["Scheduled", "Completed", "Cancelled"]);

export const isoDateStringSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid ISO date string",
  });

const isValidDateOnlyString = (value: string): boolean => {
  if (!dateOnlyPattern.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(`${value}T`);
};

export const dateOnlyStringSchema = z
  .string()
  .regex(dateOnlyPattern, {
    message: "Invalid date format, expected YYYY-MM-DD",
  })
  .refine((value) => isValidDateOnlyString(value), {
    message: "Invalid calendar date",
  });

const demographicsSchema = z.object({
  firstGeneration: z.boolean(),
  lowIncome: z.boolean(),
  underrepresentedMinority: z.boolean(),
});

const studentBaseSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.email(),
  avatarUrl: z.url().optional(),
  academicYear: academicYearSchema,
  major: z.string().min(2).max(120),
  gpa: gpaSchema,
  enrollmentStatus: enrollmentStatusSchema,
  creditsCompleted: z.number().int().min(0),
  creditsRequired: z.number().int().min(1).max(250),
  currentCourses: z.array(z.string().min(2).max(120)).max(8).optional(),
  expectedGraduation: dateOnlyStringSchema,
  demographics: demographicsSchema,
  assignedMentorId: z.string().min(1).nullable().optional(),
  gpaHistory: z
    .array(
      z.object({
        term: z.string().min(1),
        gpa: gpaSchema,
        recordedAt: isoDateStringSchema,
      }),
    )
    .min(1)
    .optional(),
});

export const studentCreateSchema = studentBaseSchema
  .refine((value) => value.creditsCompleted <= value.creditsRequired, {
    path: ["creditsCompleted"],
    message: "creditsCompleted cannot exceed creditsRequired",
  })
  .refine((value) => isGpaAlignedWithHistory(value.gpa, value.gpaHistory), {
    path: ["gpaHistory"],
    message: "Latest GPA history entry must match the current GPA",
  });

export const studentUpdateSchema = studentBaseSchema.partial().superRefine((value, context) => {
  if (Object.keys(value).length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field is required",
    });
  }

  if (
    value.creditsCompleted !== undefined &&
    value.creditsRequired !== undefined &&
    value.creditsCompleted > value.creditsRequired
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["creditsCompleted"],
      message: "creditsCompleted cannot exceed creditsRequired",
    });
  }

  if (
    value.gpa !== undefined &&
    value.gpaHistory !== undefined &&
    !isGpaAlignedWithHistory(value.gpa, value.gpaHistory)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["gpaHistory"],
      message: "Latest GPA history entry must match the current GPA",
    });
  }
});

export const mentorAssignmentSchema = z.object({
  mentorId: z.string().min(1),
});

export const scholarshipCreateSchema = z
  .object({
    name: z.string().min(2).max(160),
    provider: z.string().min(2).max(160),
    amount: z.number().positive(),
    currency: z.string().min(3).max(5).default("USD"),
    status: scholarshipStatusSchema.default("Researching"),
    deadline: isoDateStringSchema,
    requirements: z.array(z.string().min(1)).default([]),
    essayRequired: z.boolean().default(false),
    essaySubmitted: z.boolean().optional(),
    notes: z.string().max(5000).default(""),
    dateApplied: isoDateStringSchema.optional(),
  })
  .refine((value) => isDateAppliedOnOrBeforeDeadline(value.dateApplied, value.deadline), {
    path: ["dateApplied"],
    message: "dateApplied cannot be after deadline",
  });

export const scholarshipUpdateSchema = z
  .object({
    name: z.string().min(2).max(160).optional(),
    provider: z.string().min(2).max(160).optional(),
    amount: z.number().positive().optional(),
    currency: z.string().min(3).max(5).optional(),
    status: scholarshipStatusSchema.optional(),
    deadline: isoDateStringSchema.optional(),
    requirements: z.array(z.string().min(1)).optional(),
    essayRequired: z.boolean().optional(),
    essaySubmitted: z.boolean().optional(),
    notes: z.string().max(5000).optional(),
    dateApplied: isoDateStringSchema.optional(),
  })
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required",
      });
    }

    if (
      value.dateApplied !== undefined &&
      value.deadline !== undefined &&
      !isDateAppliedOnOrBeforeDeadline(value.dateApplied, value.deadline)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateApplied"],
        message: "dateApplied cannot be after deadline",
      });
    }
  });

export const meetingCreateSchema = z.object({
  mentorId: z.string().min(1).optional(),
  date: isoDateStringSchema,
  duration: z.number().int().min(10).max(300),
  notes: z.string().max(5000).default(""),
  actionItems: z.array(z.string().min(1)).default([]),
  status: meetingStatusSchema.default("Scheduled"),
});

export const meetingUpdateSchema = z
  .object({
    mentorId: z.string().min(1).optional(),
    date: isoDateStringSchema.optional(),
    duration: z.number().int().min(10).max(300).optional(),
    notes: z.string().max(5000).optional(),
    actionItems: z.array(z.string().min(1)).optional(),
    status: meetingStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
