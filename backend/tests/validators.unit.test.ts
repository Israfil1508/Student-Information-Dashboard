import { describe, expect, it } from "vitest";
import {
  scholarshipCreateSchema,
  studentCreateSchema,
  studentUpdateSchema,
} from "../src/validators.js";

const validStudentPayload = {
  firstName: "Samia",
  lastName: "Rahman",
  email: "samia.rahman@example.edu",
  academicYear: "Junior" as const,
  major: "Computer Science",
  gpa: 3.45,
  enrollmentStatus: "Full-time" as const,
  creditsCompleted: 78,
  creditsRequired: 120,
  expectedGraduation: "2027-06-01",
  demographics: {
    firstGeneration: true,
    lowIncome: false,
    underrepresentedMinority: true,
  },
};

describe("student validation", () => {
  it("accepts a valid student payload", () => {
    const parsed = studentCreateSchema.parse(validStudentPayload);
    expect(parsed.email).toBe(validStudentPayload.email);
    expect(parsed.creditsCompleted).toBeLessThanOrEqual(parsed.creditsRequired);
  });

  it("rejects payload when completed credits exceed required credits", () => {
    const result = studentCreateSchema.safeParse({
      ...validStudentPayload,
      creditsCompleted: 130,
      creditsRequired: 120,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("creditsCompleted"))).toBe(
        true,
      );
    }
  });

  it("rejects empty update payload", () => {
    const result = studentUpdateSchema.safeParse({});
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("At least one field"))).toBe(
        true,
      );
    }
  });

  it("rejects GPA history when latest point does not match current GPA", () => {
    const result = studentCreateSchema.safeParse({
      ...validStudentPayload,
      gpa: 3.2,
      gpaHistory: [
        {
          term: "Fall 2026",
          gpa: 3.6,
          recordedAt: "2026-12-15T00:00:00.000Z",
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "gpaHistory")).toBe(true);
    }
  });

  it("rejects expected graduation when it includes a time component", () => {
    const result = studentCreateSchema.safeParse({
      ...validStudentPayload,
      expectedGraduation: "2027-06-01T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.join(".") === "expectedGraduation"),
      ).toBe(true);
    }
  });
});

describe("scholarship validation", () => {
  it("rejects dateApplied after deadline", () => {
    const result = scholarshipCreateSchema.safeParse({
      name: "STEM Scholars Grant",
      provider: "Future Labs Foundation",
      amount: 5000,
      currency: "USD",
      status: "Applied",
      deadline: "2026-05-01T00:00:00.000Z",
      requirements: ["Essay"],
      essayRequired: true,
      essaySubmitted: true,
      notes: "Initial submission",
      dateApplied: "2026-05-10T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("dateApplied"))).toBe(true);
    }
  });
});
