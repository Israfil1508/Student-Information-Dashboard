/* Initial Comment: Student Information Dashboard repository file. */
import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { nanoid } from "nanoid";
import { readDatabase, writeDatabase } from "./config/db.js";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware.js";
import { sendCreated, sendError, sendSuccess } from "./utils/apiResponse.js";
import { meetingRoutes } from "./routes/meeting.routes.js";
import { mentorRoutes } from "./routes/mentor.routes.js";
import { scholarshipRoutes } from "./routes/scholarship.routes.js";
import { studentRoutes } from "./routes/student.routes.js";
import type {
  Database,
  EnrollmentStatus,
  Meeting,
  Scholarship,
  ScholarshipWithDeadlineTracking,
  ScholarshipStatus,
  Student,
} from "./types.js";
import {
  meetingCreateSchema,
  meetingUpdateSchema,
  mentorAssignmentSchema,
  scholarshipCreateSchema,
  scholarshipUpdateSchema,
  studentCreateSchema,
  studentUpdateSchema,
} from "./middlewares/validate.middleware.js";

export const app = express();

const configuredOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5176")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set(configuredOrigins));

app.use(
  cors({
    origin: allowedOrigins,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use("/api/students", studentRoutes);
app.use("/api/scholarships", scholarshipRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/meetings", meetingRoutes);

app.get("/", (_request, response) => {
  sendSuccess(
    response,
    {
      service: "Access to Education API",
      health: "/api/health",
      meta: "/api/meta",
    },
    "API is running. Use /api/* endpoints.",
  );
});

const enrollmentTransitions: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  "Full-time": ["Part-time", "Leave of Absence", "Graduated"],
  "Part-time": ["Full-time", "Leave of Absence", "Graduated"],
  "Leave of Absence": ["Full-time", "Part-time"],
  Graduated: [],
};

const scholarshipTransitions: Record<ScholarshipStatus, ScholarshipStatus[]> = {
  Researching: ["Applied", "Rejected"],
  Applied: ["Interview", "Awarded", "Rejected"],
  Interview: ["Awarded", "Rejected"],
  Awarded: [],
  Rejected: [],
};

const DEADLINE_DUE_SOON_DAYS = 21;
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const GPA_DELTA_TOLERANCE = 0.01;

const toIso = (value: string): string => new Date(value).toISOString();
const nowIso = (): string => new Date().toISOString();
const toGpaHistoryTerm = (isoTimestamp: string): string => `Update ${isoTimestamp.slice(0, 7)}`;

const courseCatalogByMajor: Record<string, string[]> = {
  "Computer Science": [
    "Data Structures",
    "Operating Systems",
    "Database Systems",
    "Software Engineering",
    "Web Development",
  ],
  "Electrical Engineering": [
    "Circuit Analysis",
    "Signals and Systems",
    "Digital Logic",
    "Power Electronics",
    "Control Systems",
  ],
  "Public Health": [
    "Epidemiology",
    "Biostatistics",
    "Health Policy",
    "Community Health",
    "Global Health",
  ],
  "Business Administration": [
    "Managerial Accounting",
    "Organizational Behavior",
    "Business Analytics",
    "Strategic Management",
    "Marketing Management",
  ],
  Economics: [
    "Microeconomics",
    "Macroeconomics",
    "Econometrics",
    "Development Economics",
    "Public Finance",
  ],
  "Environmental Science": [
    "Environmental Chemistry",
    "Climate Science",
    "Sustainability Planning",
    "Conservation Biology",
    "Environmental Policy",
  ],
  "Mechanical Engineering": [
    "Thermodynamics",
    "Fluid Mechanics",
    "Mechanics of Materials",
    "Machine Design",
    "Manufacturing Processes",
  ],
  "Data Science": [
    "Applied Statistics",
    "Machine Learning",
    "Data Visualization",
    "Data Ethics",
    "Big Data Systems",
  ],
};

const buildDefaultCurrentCourses = (major: string): string[] => {
  const catalog = courseCatalogByMajor[major] ?? ["General Studies Seminar"];
  return catalog.slice(0, 4);
};

type ScholarshipRealtimeEventName =
  | "ready"
  | "heartbeat"
  | "scholarship.created"
  | "scholarship.updated"
  | "scholarship.deleted";

type ScholarshipRealtimeEventPayload = {
  type: ScholarshipRealtimeEventName;
  occurredAt: string;
  scholarshipId?: string;
  studentId?: string;
  status?: ScholarshipStatus;
  previousStatus?: ScholarshipStatus;
  deadline?: string;
};

const scholarshipEventClients = new Set<Response>();

const toSseChunk = (
  eventName: ScholarshipRealtimeEventName,
  payload: ScholarshipRealtimeEventPayload,
): string => {
  return `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
};

const broadcastScholarshipEvent = (
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

const getRouteParam = (request: Request, key: string): string | null => {
  const value = request.params[key];
  return typeof value === "string" ? value : null;
};

const addAuditLog = (
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

const canTransition = <TStatus extends string>(
  from: TStatus,
  to: TStatus,
  allowedTransitions: Record<TStatus, TStatus[]>,
): boolean => from === to || allowedTransitions[from].includes(to);

const toUtcDayStart = (value: Date): number =>
  Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

const calculateDaysUntilDeadline = (deadlineIso: string, referenceDate = new Date()): number => {
  const deadline = new Date(deadlineIso);
  const difference = toUtcDayStart(deadline) - toUtcDayStart(referenceDate);
  return Math.floor(difference / MILLISECONDS_PER_DAY);
};

const withDeadlineTracking = (
  scholarship: Scholarship,
  referenceDate = new Date(),
): ScholarshipWithDeadlineTracking => {
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

const findStudent = (database: Database, studentId: string): Student | undefined => {
  return database.students.find((student) => student.id === studentId);
};

const findScholarship = (database: Database, scholarshipId: string): Scholarship | undefined => {
  return database.scholarships.find((scholarship) => scholarship.id === scholarshipId);
};

const findMeeting = (database: Database, meetingId: string): Meeting | undefined => {
  return database.meetings.find((meeting) => meeting.id === meetingId);
};

const asyncHandler = (
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>,
) => {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response, next).catch(next);
  };
};

app.get(
  "/api/health",
  asyncHandler(async (_request, response) => {
    sendSuccess(response, { status: "ok", timestamp: nowIso() }, "API is healthy");
  }),
);

app.get(
  "/api/meta",
  asyncHandler(async (_request, response) => {
    sendSuccess(response, {
      enrollmentStatuses: Object.keys(enrollmentTransitions),
      scholarshipStatuses: Object.keys(scholarshipTransitions),
      meetingStatuses: ["Scheduled", "Completed", "Cancelled"],
    });
  }),
);

app.get("/api/events/scholarships", (request, response) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders();

  const readyPayload: ScholarshipRealtimeEventPayload = {
    type: "ready",
    occurredAt: nowIso(),
  };
  response.write(toSseChunk("ready", readyPayload));

  scholarshipEventClients.add(response);

  const heartbeatTimer = setInterval(() => {
    const heartbeatPayload: ScholarshipRealtimeEventPayload = {
      type: "heartbeat",
      occurredAt: nowIso(),
    };
    response.write(toSseChunk("heartbeat", heartbeatPayload));
  }, 25_000);

  request.on("close", () => {
    clearInterval(heartbeatTimer);
    scholarshipEventClients.delete(response);
    response.end();
  });
});

app.get(
  "/api/dashboard/summary",
  asyncHandler(async (_request, response) => {
    const database = await readDatabase();
    const now = new Date();

    const totalStudents = database.students.length;
    const totalMentors = database.mentors.length;
    const scholarshipByStatus = database.scholarships.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});

    const trackedScholarships = database.scholarships.map((item) => withDeadlineTracking(item, now));

    const upcomingDeadlines = trackedScholarships
      .filter((item) => item.deadlineTracking.isDueSoon)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 8);

    const dueSoonDeadlineCount = trackedScholarships.filter(
      (item) => item.deadlineTracking.isDueSoon,
    ).length;
    const overdueDeadlineCount = trackedScholarships.filter(
      (item) => item.deadlineTracking.isOverdue,
    ).length;

    const scheduledMeetings = database.meetings.filter((meeting) => meeting.status === "Scheduled");

    sendSuccess(response, {
      totalStudents,
      totalMentors,
      totalScholarships: database.scholarships.length,
      totalMeetings: database.meetings.length,
      scholarshipByStatus,
      upcomingDeadlines,
      deadlineSummary: {
        tracked: trackedScholarships.length,
        dueSoon: dueSoonDeadlineCount,
        overdue: overdueDeadlineCount,
      },
      scheduledMeetings,
    });
  }),
);

app.get(
  "/api/students",
  asyncHandler(async (request, response) => {
    const database = await readDatabase();

    const search =
      typeof request.query.search === "string" ? request.query.search.trim().toLowerCase() : "";
    const academicYear =
      typeof request.query.academicYear === "string" ? request.query.academicYear : undefined;
    const enrollmentStatus =
      typeof request.query.enrollmentStatus === "string"
        ? request.query.enrollmentStatus
        : undefined;
    const major = typeof request.query.major === "string" ? request.query.major : undefined;

    const filtered = database.students.filter((student) => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      const matchesSearch =
        !search ||
        fullName.includes(search) ||
        student.email.toLowerCase().includes(search) ||
        student.major.toLowerCase().includes(search);
      const matchesYear = !academicYear || student.academicYear === academicYear;
      const matchesStatus = !enrollmentStatus || student.enrollmentStatus === enrollmentStatus;
      const matchesMajor = !major || student.major === major;

      return matchesSearch && matchesYear && matchesStatus && matchesMajor;
    });

    const records = filtered.map((student) => {
      const studentScholarships = database.scholarships.filter((item) => item.studentId === student.id);
      const trackedStudentScholarships = studentScholarships.map((item) => withDeadlineTracking(item));
      const upcomingScholarships = trackedStudentScholarships.filter(
        (item) => item.deadlineTracking.isDueSoon,
      ).length;

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        avatarUrl: student.avatarUrl,
        academicYear: student.academicYear,
        major: student.major,
        enrollmentStatus: student.enrollmentStatus,
        quickStats: {
          gpa: student.gpa,
          creditsCompleted: student.creditsCompleted,
          creditsRequired: student.creditsRequired,
          scholarshipsTracked: studentScholarships.length,
          upcomingScholarshipDeadlines: upcomingScholarships,
        },
      };
    });

    sendSuccess(response, {
      total: records.length,
      students: records,
    });
  }),
);

app.get(
  "/api/students/:studentId",
  asyncHandler(async (request, response) => {
    const studentId = getRouteParam(request, "studentId");
    if (!studentId) {
      sendError(response, 400, "Invalid student id parameter");
      return;
    }

    const database = await readDatabase();
    const student = findStudent(database, studentId);

    if (!student) {
      sendError(response, 404, "Student not found");
      return;
    }

    const scholarships = database.scholarships
      .filter((item) => item.studentId === student.id)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .map((item) => withDeadlineTracking(item));

    const mentor = student.assignedMentorId
      ? database.mentors.find((item) => item.id === student.assignedMentorId) ?? null
      : null;

    const meetings = database.meetings
      .filter((item) => item.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((meeting) => ({
        ...meeting,
        mentorName: database.mentors.find((mentorItem) => mentorItem.id === meeting.mentorId)?.name,
      }));

    const progressPercent = Number(
      ((student.creditsCompleted / student.creditsRequired) * 100).toFixed(1),
    );
    const currentCourses = Array.isArray(student.currentCourses)
      ? student.currentCourses
      : buildDefaultCurrentCourses(student.major);
    const studentWithCourses = Array.isArray(student.currentCourses)
      ? student
      : { ...student, currentCourses };

    sendSuccess(response, {
      student: studentWithCourses,
      academicProgress: {
        currentGpa: student.gpa,
        gpaTrend: student.gpaHistory,
        creditsCompleted: student.creditsCompleted,
        creditsRequired: student.creditsRequired,
        currentCourses,
        completionPercent: progressPercent,
      },
      scholarships,
      mentorship: {
        mentor,
        meetings,
      },
    });
  }),
);

app.post(
  "/api/students",
  asyncHandler(async (request, response) => {
    const payload = studentCreateSchema.parse(request.body);
    const database = await readDatabase();

    const hasDuplicateEmail = database.students.some(
      (student) => student.email.toLowerCase() === payload.email.toLowerCase(),
    );

    if (hasDuplicateEmail) {
      sendError(response, 409, "A student with this email already exists");
      return;
    }

    if (payload.assignedMentorId) {
      const mentor = database.mentors.find((item) => item.id === payload.assignedMentorId);
      if (!mentor) {
        sendError(response, 404, "Assigned mentor not found");
        return;
      }

      const menteeCount = database.students.filter(
        (student) => student.assignedMentorId === mentor.id,
      ).length;

      if (menteeCount >= mentor.maxMentees) {
        sendError(response, 409, "Mentor has reached max mentee capacity");
        return;
      }
    }

    const timestamp = nowIso();
    const studentId = `stu_${nanoid(10)}`;

    const student: Student = {
      id: studentId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      avatarUrl: payload.avatarUrl,
      academicYear: payload.academicYear,
      major: payload.major,
      gpa: Number(payload.gpa.toFixed(2)),
      enrollmentStatus: payload.enrollmentStatus,
      creditsCompleted: payload.creditsCompleted,
      creditsRequired: payload.creditsRequired,
      currentCourses: payload.currentCourses ?? buildDefaultCurrentCourses(payload.major),
      expectedGraduation: payload.expectedGraduation,
      demographics: payload.demographics,
      assignedMentorId: payload.assignedMentorId ?? null,
      gpaHistory:
        payload.gpaHistory?.map((point) => ({
          ...point,
          gpa: Number(point.gpa.toFixed(2)),
          recordedAt: toIso(point.recordedAt),
        })) ?? [{ term: "Current", gpa: Number(payload.gpa.toFixed(2)), recordedAt: timestamp }],
      enrollmentStatusHistory: [
        {
          status: payload.enrollmentStatus,
          changedAt: timestamp,
          note: "Student profile created.",
        },
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    database.students.push(student);
    addAuditLog(database, "student", student.id, "student_created", {
      enrollmentStatus: student.enrollmentStatus,
      createdAt: timestamp,
    });

    await writeDatabase(database);
    sendCreated(response, student, "Student created");
  }),
);

app.put(
  "/api/students/:studentId",
  asyncHandler(async (request, response) => {
    const studentId = getRouteParam(request, "studentId");
    if (!studentId) {
      sendError(response, 400, "Invalid student id parameter");
      return;
    }

    const payload = studentUpdateSchema.parse(request.body);
    const database = await readDatabase();
    const student = findStudent(database, studentId);

    if (!student) {
      sendError(response, 404, "Student not found");
      return;
    }

    if (payload.email && payload.email.toLowerCase() !== student.email.toLowerCase()) {
      const duplicate = database.students.some(
        (item) => item.id !== student.id && item.email.toLowerCase() === payload.email?.toLowerCase(),
      );
      if (duplicate) {
        sendError(response, 409, "A student with this email already exists");
        return;
      }
    }

    const nextCreditsCompleted = payload.creditsCompleted ?? student.creditsCompleted;
    const nextCreditsRequired = payload.creditsRequired ?? student.creditsRequired;
    const nextGpa = payload.gpa !== undefined ? Number(payload.gpa.toFixed(2)) : student.gpa;

    if (nextCreditsCompleted > nextCreditsRequired) {
      sendError(response, 400, "creditsCompleted cannot exceed creditsRequired");
      return;
    }

    if (payload.assignedMentorId !== undefined && payload.assignedMentorId !== null) {
      const mentor = database.mentors.find((item) => item.id === payload.assignedMentorId);
      if (!mentor) {
        sendError(response, 404, "Assigned mentor not found");
        return;
      }

      const currentAssignments = database.students.filter(
        (item) => item.assignedMentorId === mentor.id,
      ).length;
      const switchingMentor = student.assignedMentorId !== mentor.id;

      if (switchingMentor && currentAssignments >= mentor.maxMentees) {
        sendError(response, 409, "Mentor has reached max mentee capacity");
        return;
      }
    }

    if (payload.enrollmentStatus && payload.enrollmentStatus !== student.enrollmentStatus) {
      const allowed = canTransition(
        student.enrollmentStatus,
        payload.enrollmentStatus,
        enrollmentTransitions,
      );
      if (!allowed) {
        sendError(response, 409, "Invalid enrollment status transition");
        return;
      }

      student.enrollmentStatusHistory.push({
        status: payload.enrollmentStatus,
        changedAt: nowIso(),
        note: "Status updated by counselor",
      });

      addAuditLog(database, "student", student.id, "enrollment_status_changed", {
        from: student.enrollmentStatus,
        to: payload.enrollmentStatus,
      });
    }

    if (payload.gpaHistory) {
      student.gpaHistory = payload.gpaHistory.map((entry) => ({
        ...entry,
        gpa: Number(entry.gpa.toFixed(2)),
        recordedAt: toIso(entry.recordedAt),
      }));
    } else if (payload.gpa !== undefined && Math.abs(student.gpa - nextGpa) > GPA_DELTA_TOLERANCE) {
      const recordedAt = nowIso();
      const existingHistory = Array.isArray(student.gpaHistory) ? student.gpaHistory : [];
      const latestEntry = existingHistory[existingHistory.length - 1];

      if (!latestEntry || Math.abs(latestEntry.gpa - nextGpa) > GPA_DELTA_TOLERANCE) {
        student.gpaHistory = [
          ...existingHistory,
          {
            term: toGpaHistoryTerm(recordedAt),
            gpa: nextGpa,
            recordedAt,
          },
        ];
      }
    }

    student.firstName = payload.firstName ?? student.firstName;
    student.lastName = payload.lastName ?? student.lastName;
    student.email = payload.email ?? student.email;
    student.avatarUrl = payload.avatarUrl ?? student.avatarUrl;
    student.academicYear = payload.academicYear ?? student.academicYear;
    student.major = payload.major ?? student.major;
    student.gpa = nextGpa;
    student.enrollmentStatus = payload.enrollmentStatus ?? student.enrollmentStatus;
    student.creditsCompleted = payload.creditsCompleted ?? student.creditsCompleted;
    student.creditsRequired = payload.creditsRequired ?? student.creditsRequired;
    student.currentCourses =
      payload.currentCourses ?? student.currentCourses ?? buildDefaultCurrentCourses(student.major);
    student.expectedGraduation = payload.expectedGraduation
      ? payload.expectedGraduation
      : student.expectedGraduation;
    student.demographics = payload.demographics ?? student.demographics;
    student.assignedMentorId = payload.assignedMentorId ?? student.assignedMentorId;
    student.updatedAt = nowIso();

    addAuditLog(database, "student", student.id, "student_updated", {
      updatedAt: student.updatedAt,
    });

    await writeDatabase(database);
    sendSuccess(response, student, "Student updated");
  }),
);

app.delete(
  "/api/students/:studentId",
  asyncHandler(async (request, response) => {
    const studentId = getRouteParam(request, "studentId");
    if (!studentId) {
      sendError(response, 400, "Invalid student id parameter");
      return;
    }

    const database = await readDatabase();
    const studentIndex = database.students.findIndex((item) => item.id === studentId);

    if (studentIndex === -1) {
      sendError(response, 404, "Student not found");
      return;
    }

    const [removedStudent] = database.students.splice(studentIndex, 1);
    const removedScholarships = database.scholarships.filter((item) => item.studentId === studentId);
    const removedMeetings = database.meetings.filter((item) => item.studentId === studentId);

    database.scholarships = database.scholarships.filter((item) => item.studentId !== studentId);
    database.meetings = database.meetings.filter((item) => item.studentId !== studentId);

    addAuditLog(database, "student", studentId, "student_deleted", {
      removedScholarships: removedScholarships.length,
      removedMeetings: removedMeetings.length,
    });

    await writeDatabase(database);

    removedScholarships.forEach((scholarship) => {
      broadcastScholarshipEvent("scholarship.deleted", {
        scholarshipId: scholarship.id,
        studentId: scholarship.studentId,
        status: scholarship.status,
        deadline: scholarship.deadline,
      });
    });

    sendSuccess(response, {
      student: removedStudent,
      removedScholarships: removedScholarships.length,
      removedMeetings: removedMeetings.length,
    }, "Student deleted");
  }),
);

app.get(
  "/api/mentors",
  asyncHandler(async (_request, response) => {
    const database = await readDatabase();
    const mentors = database.mentors.map((mentor) => {
      const activeMentees = database.students.filter(
        (student) => student.assignedMentorId === mentor.id,
      ).length;
      return {
        ...mentor,
        activeMentees,
      };
    });

    sendSuccess(response, mentors);
  }),
);

app.get(
  "/api/students/:studentId/mentor",
  asyncHandler(async (request, response) => {
    const studentId = getRouteParam(request, "studentId");
    if (!studentId) {
      sendError(response, 400, "Invalid student id parameter");
      return;
    }

    const database = await readDatabase();
    const student = findStudent(database, studentId);

    if (!student) {
      sendError(response, 404, "Student not found");
      return;
    }

    const mentor = student.assignedMentorId
      ? database.mentors.find((item) => item.id === student.assignedMentorId) ?? null
      : null;

    sendSuccess(response, {
      studentId,
      mentor,
    });
  }),
);

app.put(
  "/api/students/:studentId/mentor",
  asyncHandler(async (request, response) => {
    const studentId = getRouteParam(request, "studentId");
    if (!studentId) {
      sendError(response, 400, "Invalid student id parameter");
      return;
    }

    const payload = mentorAssignmentSchema.parse(request.body);
    const database = await readDatabase();

    const student = findStudent(database, studentId);
    if (!student) {
      sendError(response, 404, "Student not found");
      return;
    }

    const mentor = database.mentors.find((item) => item.id === payload.mentorId);
    if (!mentor) {
      sendError(response, 404, "Mentor not found");
      return;
    }

    const currentAssignments = database.students.filter(
      (item) => item.assignedMentorId === mentor.id,
    ).length;
    const switchingMentor = student.assignedMentorId !== mentor.id;

    if (switchingMentor && currentAssignments >= mentor.maxMentees) {
      sendError(response, 409, "Mentor has reached max mentee capacity");
      return;
    }

    student.assignedMentorId = mentor.id;
    student.updatedAt = nowIso();

    addAuditLog(database, "mentor-assignment", student.id, "mentor_assigned", {
      mentorId: mentor.id,
      assignedAt: student.updatedAt,
    });

    await writeDatabase(database);

    sendSuccess(response, {
      studentId,
      mentor,
      assignedAt: student.updatedAt,
    });
  }),
);

app.get(
  "/api/students/:studentId/scholarships",
  asyncHandler(async (request, response) => {
    const studentId = getRouteParam(request, "studentId");
    if (!studentId) {
      sendError(response, 400, "Invalid student id parameter");
      return;
    }

    const status =
      typeof request.query.status === "string" ? (request.query.status as ScholarshipStatus) : null;
    const database = await readDatabase();

    const student = findStudent(database, studentId);
    if (!student) {
      sendError(response, 404, "Student not found");
      return;
    }

    const scholarships = database.scholarships
      .filter((item) => item.studentId === student.id)
      .filter((item) => (status ? item.status === status : true))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .map((item) => withDeadlineTracking(item));

    sendSuccess(response, scholarships);
  }),
);

app.post(
  "/api/students/:studentId/scholarships",
  asyncHandler(async (request, response) => {
    const studentId = getRouteParam(request, "studentId");
    if (!studentId) {
      sendError(response, 400, "Invalid student id parameter");
      return;
    }

    const payload = scholarshipCreateSchema.parse(request.body);
    const database = await readDatabase();

    const student = findStudent(database, studentId);
    if (!student) {
      sendError(response, 404, "Student not found");
      return;
    }

    const timestamp = nowIso();
    const scholarship: Scholarship = {
      id: `sch_${nanoid(10)}`,
      studentId,
      name: payload.name,
      provider: payload.provider,
      amount: payload.amount,
      currency: payload.currency,
      status: payload.status,
      statusHistory: [
        {
          status: payload.status,
          changedAt: timestamp,
          note: "Application record created",
        },
      ],
      deadline: toIso(payload.deadline),
      requirements: payload.requirements,
      essayRequired: payload.essayRequired,
      essaySubmitted: payload.essaySubmitted,
      notes: payload.notes,
      dateApplied: payload.dateApplied ? toIso(payload.dateApplied) : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    database.scholarships.push(scholarship);

    addAuditLog(database, "scholarship", scholarship.id, "scholarship_created", {
      studentId,
      status: scholarship.status,
      deadline: scholarship.deadline,
    });

    await writeDatabase(database);
    broadcastScholarshipEvent("scholarship.created", {
      scholarshipId: scholarship.id,
      studentId: scholarship.studentId,
      status: scholarship.status,
      deadline: scholarship.deadline,
    });
    sendCreated(response, withDeadlineTracking(scholarship), "Scholarship application created");
  }),
);

app.put(
  "/api/scholarships/:scholarshipId",
  asyncHandler(async (request, response) => {
    const scholarshipId = getRouteParam(request, "scholarshipId");
    if (!scholarshipId) {
      sendError(response, 400, "Invalid scholarship id parameter");
      return;
    }

    const payload = scholarshipUpdateSchema.parse(request.body);
    const database = await readDatabase();

    const scholarship = findScholarship(database, scholarshipId);
    if (!scholarship) {
      sendError(response, 404, "Scholarship not found");
      return;
    }

    const previousStatus = scholarship.status;

    const nextDeadline = payload.deadline ? toIso(payload.deadline) : scholarship.deadline;
    const nextDateApplied = payload.dateApplied ? toIso(payload.dateApplied) : scholarship.dateApplied;

    if (
      nextDateApplied &&
      new Date(nextDateApplied).getTime() > new Date(nextDeadline).getTime()
    ) {
      sendError(response, 400, "dateApplied cannot be after deadline");
      return;
    }

    if (payload.status && payload.status !== scholarship.status) {
      const allowed = canTransition(scholarship.status, payload.status, scholarshipTransitions);
      if (!allowed) {
        sendError(response, 409, "Invalid scholarship status transition");
        return;
      }

      scholarship.statusHistory.push({
        status: payload.status,
        changedAt: nowIso(),
        note: "Status updated in dashboard",
      });

      addAuditLog(database, "scholarship", scholarship.id, "scholarship_status_changed", {
        from: scholarship.status,
        to: payload.status,
      });

      if (payload.status === "Applied" && !scholarship.dateApplied) {
        scholarship.dateApplied = nowIso();
      }
    }

    scholarship.name = payload.name ?? scholarship.name;
    scholarship.provider = payload.provider ?? scholarship.provider;
    scholarship.amount = payload.amount ?? scholarship.amount;
    scholarship.currency = payload.currency ?? scholarship.currency;
    scholarship.status = payload.status ?? scholarship.status;
    scholarship.deadline = nextDeadline;
    scholarship.requirements = payload.requirements ?? scholarship.requirements;
    scholarship.essayRequired = payload.essayRequired ?? scholarship.essayRequired;
    scholarship.essaySubmitted = payload.essaySubmitted ?? scholarship.essaySubmitted;
    scholarship.notes = payload.notes ?? scholarship.notes;
    scholarship.dateApplied = nextDateApplied;
    scholarship.updatedAt = nowIso();

    addAuditLog(database, "scholarship", scholarship.id, "scholarship_updated", {
      updatedAt: scholarship.updatedAt,
    });

    await writeDatabase(database);
    broadcastScholarshipEvent("scholarship.updated", {
      scholarshipId: scholarship.id,
      studentId: scholarship.studentId,
      status: scholarship.status,
      previousStatus,
      deadline: scholarship.deadline,
    });
    sendSuccess(response, withDeadlineTracking(scholarship), "Scholarship updated");
  }),
);

app.get(
  "/api/students/:studentId/meetings",
  asyncHandler(async (request, response) => {
    const studentId = getRouteParam(request, "studentId");
    if (!studentId) {
      sendError(response, 400, "Invalid student id parameter");
      return;
    }

    const search = typeof request.query.search === "string" ? request.query.search.toLowerCase() : "";
    const database = await readDatabase();

    const student = findStudent(database, studentId);
    if (!student) {
      sendError(response, 404, "Student not found");
      return;
    }

    const meetings = database.meetings
      .filter((meeting) => meeting.studentId === student.id)
      .filter((meeting) => {
        if (!search) return true;
        return (
          meeting.notes.toLowerCase().includes(search) ||
          meeting.actionItems.some((item) => item.toLowerCase().includes(search))
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((meeting) => ({
        ...meeting,
        mentorName: database.mentors.find((mentor) => mentor.id === meeting.mentorId)?.name,
      }));

    sendSuccess(response, meetings);
  }),
);

app.post(
  "/api/students/:studentId/meetings",
  asyncHandler(async (request, response) => {
    const studentId = getRouteParam(request, "studentId");
    if (!studentId) {
      sendError(response, 400, "Invalid student id parameter");
      return;
    }

    const payload = meetingCreateSchema.parse(request.body);
    const database = await readDatabase();

    const student = findStudent(database, studentId);
    if (!student) {
      sendError(response, 404, "Student not found");
      return;
    }

    const mentorId = payload.mentorId ?? student.assignedMentorId;
    if (!mentorId) {
      sendError(response, 409, "Student has no mentor assigned. Please assign a mentor first.");
      return;
    }

    const mentor = database.mentors.find((item) => item.id === mentorId);
    if (!mentor) {
      sendError(response, 404, "Mentor not found");
      return;
    }

    const timestamp = nowIso();
    const meeting: Meeting = {
      id: `mtg_${nanoid(10)}`,
      studentId,
      mentorId,
      date: toIso(payload.date),
      duration: payload.duration,
      notes: payload.notes,
      actionItems: payload.actionItems,
      status: payload.status,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    database.meetings.push(meeting);
    addAuditLog(database, "meeting", meeting.id, "meeting_created", {
      studentId,
      mentorId,
      date: meeting.date,
      status: meeting.status,
    });

    await writeDatabase(database);
    sendCreated(response, meeting, "Meeting created");
  }),
);

app.put(
  "/api/meetings/:meetingId",
  asyncHandler(async (request, response) => {
    const meetingId = getRouteParam(request, "meetingId");
    if (!meetingId) {
      sendError(response, 400, "Invalid meeting id parameter");
      return;
    }

    const payload = meetingUpdateSchema.parse(request.body);
    const database = await readDatabase();

    const meeting = findMeeting(database, meetingId);
    if (!meeting) {
      sendError(response, 404, "Meeting not found");
      return;
    }

    if (payload.mentorId) {
      const mentor = database.mentors.find((item) => item.id === payload.mentorId);
      if (!mentor) {
        sendError(response, 404, "Mentor not found");
        return;
      }
      meeting.mentorId = payload.mentorId;
    }

    meeting.date = payload.date ? toIso(payload.date) : meeting.date;
    meeting.duration = payload.duration ?? meeting.duration;
    meeting.notes = payload.notes ?? meeting.notes;
    meeting.actionItems = payload.actionItems ?? meeting.actionItems;
    meeting.status = payload.status ?? meeting.status;
    meeting.updatedAt = nowIso();

    addAuditLog(database, "meeting", meeting.id, "meeting_updated", {
      updatedAt: meeting.updatedAt,
      status: meeting.status,
    });

    await writeDatabase(database);
    sendSuccess(response, meeting, "Meeting updated");
  }),
);

app.delete(
  "/api/meetings/:meetingId",
  asyncHandler(async (request, response) => {
    const meetingId = getRouteParam(request, "meetingId");
    if (!meetingId) {
      sendError(response, 400, "Invalid meeting id parameter");
      return;
    }

    const database = await readDatabase();

    const meetingIndex = database.meetings.findIndex((item) => item.id === meetingId);
    if (meetingIndex === -1) {
      sendError(response, 404, "Meeting not found");
      return;
    }

    const [removed] = database.meetings.splice(meetingIndex, 1);

    addAuditLog(database, "meeting", removed.id, "meeting_deleted", {
      removedAt: nowIso(),
    });

    await writeDatabase(database);
    sendSuccess(response, removed, "Meeting deleted");
  }),
);

app.get(
  "/api/audit-logs",
  asyncHandler(async (request, response) => {
    const limitRaw = typeof request.query.limit === "string" ? Number(request.query.limit) : 50;
    const limit = Number.isNaN(limitRaw) ? 50 : Math.min(Math.max(limitRaw, 1), 200);
    const database = await readDatabase();

    const logs = [...database.auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    sendSuccess(response, logs);
  }),
);

// Serve frontend static files for production/deployment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDistPath = join(__dirname, "../../frontend/dist");

app.use(express.static(frontendDistPath, { maxAge: "1d" }));

// SPA fallback: serve index.html for any unmatched routes
app.use((_request, response) => {
  response.sendFile(join(frontendDistPath, "index.html"), (err) => {
    if (err) {
      response.status(404).json({ error: "Frontend not found. Build and deploy frontend first." });
    }
  });
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);
