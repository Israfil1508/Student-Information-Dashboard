import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { initializeDatabase } from "../src/db.js";
import { buildSeedDatabase } from "../src/seedData.js";

type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
};

type ApiFailure = {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
};

const baseStudentPayload = {
  firstName: "Iffat",
  lastName: "Kabir",
  email: "iffat.kabir+test@example.edu",
  academicYear: "Senior",
  major: "Economics",
  gpa: 3.71,
  enrollmentStatus: "Full-time",
  creditsCompleted: 110,
  creditsRequired: 120,
  expectedGraduation: "2027-06-30",
  demographics: {
    firstGeneration: false,
    lowIncome: false,
    underrepresentedMinority: true,
  },
};

describe("API integration", () => {
  let tempDir: string;
  let dataFile: string;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";

    tempDir = await mkdtemp(path.join(os.tmpdir(), "scholarship-mgmt-tests-"));
    dataFile = path.join(tempDir, "db.json");
    process.env.DATA_FILE = dataFile;

    await initializeDatabase();

    const { app } = await import("../src/index.js");
    server = app.listen(0);

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to allocate an ephemeral test port");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    await writeFile(dataFile, JSON.stringify(buildSeedDatabase(), null, 2), "utf8");
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await rm(tempDir, { recursive: true, force: true });
    delete process.env.DATA_FILE;
  });

  it("returns healthy status", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as ApiSuccess<{ status: string; timestamp: string }>;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("ok");
    expect(typeof body.data.timestamp).toBe("string");
  });

  it("rejects invalid student payload", async () => {
    const response = await fetch(`${baseUrl}/api/students`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...baseStudentPayload,
        email: "invalid-payload@example.edu",
        creditsCompleted: 140,
        creditsRequired: 120,
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as ApiFailure;
    expect(body.success).toBe(false);
    expect(body.error.message).toBe("Validation failed");
  });

  it("creates a student and fetches it by id", async () => {
    const createResponse = await fetch(`${baseUrl}/api/students`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...baseStudentPayload,
        email: "integration-create@example.edu",
      }),
    });

    expect(createResponse.status).toBe(201);
    const createdBody = (await createResponse.json()) as ApiSuccess<{ id: string; email: string }>;
    expect(createdBody.success).toBe(true);
    expect(createdBody.data.id.startsWith("stu_")).toBe(true);

    const profileResponse = await fetch(`${baseUrl}/api/students/${createdBody.data.id}`);
    expect(profileResponse.status).toBe(200);

    const profileBody = (await profileResponse.json()) as ApiSuccess<{
      student: { id: string; email: string };
      academicProgress: { currentCourses: string[] };
    }>;
    expect(profileBody.success).toBe(true);
    expect(profileBody.data.student.id).toBe(createdBody.data.id);
    expect(profileBody.data.student.email).toBe("integration-create@example.edu");
    expect(profileBody.data.academicProgress.currentCourses.length).toBeGreaterThan(0);
  });

  it("appends GPA trend when GPA is updated without explicit history payload", async () => {
    const createResponse = await fetch(`${baseUrl}/api/students`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...baseStudentPayload,
        email: "integration-gpa-history@example.edu",
      }),
    });

    expect(createResponse.status).toBe(201);
    const createdBody = (await createResponse.json()) as ApiSuccess<{ id: string }>;

    const updateResponse = await fetch(`${baseUrl}/api/students/${createdBody.data.id}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        gpa: 3.92,
      }),
    });

    expect(updateResponse.status).toBe(200);

    const profileResponse = await fetch(`${baseUrl}/api/students/${createdBody.data.id}`);
    expect(profileResponse.status).toBe(200);

    const profileBody = (await profileResponse.json()) as ApiSuccess<{
      academicProgress: {
        currentGpa: number;
        gpaTrend: Array<{ term: string; gpa: number; recordedAt: string }>;
      };
    }>;

    expect(profileBody.success).toBe(true);
    expect(profileBody.data.academicProgress.currentGpa).toBe(3.92);
    expect(profileBody.data.academicProgress.gpaTrend.length).toBe(2);
    expect(profileBody.data.academicProgress.gpaTrend[1]?.gpa).toBe(3.92);
    expect(profileBody.data.academicProgress.gpaTrend[1]?.term.startsWith("Update ")).toBe(true);
  });

  it("enforces invalid enrollment transition from Graduated", async () => {
    const createResponse = await fetch(`${baseUrl}/api/students`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...baseStudentPayload,
        email: "transition-test@example.edu",
        enrollmentStatus: "Graduated",
      }),
    });

    expect(createResponse.status).toBe(201);
    const createdBody = (await createResponse.json()) as ApiSuccess<{ id: string }>;

    const updateResponse = await fetch(`${baseUrl}/api/students/${createdBody.data.id}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        enrollmentStatus: "Full-time",
      }),
    });

    expect(updateResponse.status).toBe(409);
    const updateBody = (await updateResponse.json()) as ApiFailure;
    expect(updateBody.success).toBe(false);
    expect(updateBody.error.message).toBe("Invalid enrollment status transition");
  });
});
