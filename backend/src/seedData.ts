import {
  type AcademicYear,
  type Database,
  type EnrollmentStatus,
  type MeetingStatus,
  type ScholarshipStatus,
} from "./types.js";

const referenceNow = new Date("2026-04-10T10:00:00.000Z");

const addDays = (base: Date, days: number): Date => {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const addMonths = (base: Date, months: number): Date => {
  const next = new Date(base);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
};

const toIso = (date: Date): string => date.toISOString();

const clampGpa = (value: number): number => Math.max(0, Math.min(4, Number(value.toFixed(2))));

const firstNames = [
  "Ava",
  "Liam",
  "Mia",
  "Noah",
  "Sophia",
  "Ethan",
  "Olivia",
  "Lucas",
  "Amelia",
  "Mason",
  "Harper",
  "Elijah",
  "Aria",
  "James",
  "Layla",
];

const lastNames = [
  "Rahman",
  "Chowdhury",
  "Karim",
  "Ahmed",
  "Hossain",
  "Sarker",
  "Nahar",
  "Kabir",
  "Uddin",
  "Khan",
  "Farzana",
  "Alam",
  "Sultana",
  "Hasan",
  "Begum",
];

const majors = [
  "Computer Science",
  "Electrical Engineering",
  "Public Health",
  "Business Administration",
  "Economics",
  "Environmental Science",
  "Mechanical Engineering",
  "Data Science",
];

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

const buildCurrentCourses = (major: string, seed: number): string[] => {
  const catalog = courseCatalogByMajor[major] ?? ["General Studies Seminar"];
  const courseCount = Math.min(4, catalog.length);

  return Array.from({ length: courseCount }, (_unused, offset) => {
    const index = (seed + offset) % catalog.length;
    return catalog[index];
  });
};

const mentorProfiles = [
  {
    name: "Daniela Pierce",
    title: "Senior Product Manager",
    company: "Northbridge Labs",
    expertise: ["Career Planning", "Interview Prep", "Product Management"],
    email: "daniela.pierce@northbridgelabs.org",
    bio: "Supports first-generation students entering product and strategy roles.",
    maxMentees: 5,
  },
  {
    name: "Rezaul Islam",
    title: "Software Architect",
    company: "Delta Systems",
    expertise: ["Backend Engineering", "System Design", "Open Source"],
    email: "rezaul.islam@deltasystems.org",
    bio: "Guides students in practical engineering skills and portfolio building.",
    maxMentees: 6,
  },
  {
    name: "Tanya Carter",
    title: "Research Scientist",
    company: "Global Health Collective",
    expertise: ["Research Methods", "Public Health", "Graduate School"],
    email: "tanya.carter@ghcollective.org",
    bio: "Mentors students pursuing research and public impact careers.",
    maxMentees: 4,
  },
  {
    name: "Ibrahim Malik",
    title: "Finance Director",
    company: "BrightPath Capital",
    expertise: ["Scholarship Strategy", "Financial Planning", "Analytics"],
    email: "ibrahim.malik@brightpathcap.org",
    bio: "Helps students build funding roadmaps and long-term financial resilience.",
    maxMentees: 5,
  },
  {
    name: "Nadia Flores",
    title: "Community Programs Lead",
    company: "Education Forward",
    expertise: ["Leadership", "Community Impact", "Networking"],
    email: "nadia.flores@educationforward.org",
    bio: "Works with students on leadership habits and support systems.",
    maxMentees: 5,
  },
];

const scholarshipStatuses: ScholarshipStatus[] = [
  "Researching",
  "Applied",
  "Interview",
  "Awarded",
  "Rejected",
];

const buildEnrollmentStatus = (index: number): EnrollmentStatus => {
  if (index === 13) return "Leave of Absence";
  if (index === 14) return "Graduated";
  return index % 4 === 0 ? "Part-time" : "Full-time";
};

const buildAcademicYear = (index: number): AcademicYear => {
  const sequence: AcademicYear[] = ["Freshman", "Sophomore", "Junior", "Senior"];
  return sequence[index % sequence.length];
};

const expectedGraduationByYear: Record<AcademicYear, string> = {
  Freshman: "2029-06-15",
  Sophomore: "2028-06-15",
  Junior: "2027-06-15",
  Senior: "2026-06-15",
};

const termOffsets = [
  { term: "Fall 2024", offsetDays: -550 },
  { term: "Spring 2025", offsetDays: -365 },
  { term: "Fall 2025", offsetDays: -180 },
  { term: "Spring 2026", offsetDays: -10 },
];

export const buildSeedDatabase = (): Database => {
  const mentors = mentorProfiles.map((profile, index) => {
    const createdAt = toIso(addMonths(referenceNow, -(index + 10)));
    return {
      id: `mnt_${index + 1}`,
      ...profile,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const students = firstNames.map((firstName, index) => {
    const year = buildAcademicYear(index);
    const enrollmentStatus = buildEnrollmentStatus(index);
    const createdAt = toIso(addMonths(referenceNow, -(index + 8)));
    const baseGpa = 2.35 + ((index * 17) % 12) * 0.12;

    const gpaHistory = termOffsets.map((termOffset, termIndex) => {
      const drift = (termIndex - 1.5) * 0.08;
      const gpa = clampGpa(baseGpa + drift);
      return {
        term: termOffset.term,
        gpa,
        recordedAt: toIso(addDays(referenceNow, termOffset.offsetDays + index)),
      };
    });

    const currentGpa = gpaHistory[gpaHistory.length - 1].gpa;
    const creditsRequired = 120;
    const progressByYear: Record<AcademicYear, number> = {
      Freshman: 24,
      Sophomore: 54,
      Junior: 86,
      Senior: 112,
    };
    const creditsCompleted =
      enrollmentStatus === "Graduated"
        ? 120
        : progressByYear[year] + (index % 5) * 2 - (enrollmentStatus === "Leave of Absence" ? 10 : 0);

    const statusChangedAt = toIso(addMonths(referenceNow, -Math.max(1, index % 6)));

    return {
      id: `stu_${index + 1}`,
      firstName,
      lastName: lastNames[index],
      email: `${firstName.toLowerCase()}.${lastNames[index].toLowerCase()}@ate-students.org`,
      avatarUrl: `https://api.dicebear.com/9.x/thumbs/svg?seed=${firstName}${lastNames[index]}`,
      academicYear: year,
      major: majors[index % majors.length],
      gpa: currentGpa,
      enrollmentStatus,
      creditsCompleted,
      creditsRequired,
      currentCourses: buildCurrentCourses(majors[index % majors.length], index),
      expectedGraduation:
        enrollmentStatus === "Graduated"
          ? "2025-12-20"
          : expectedGraduationByYear[year],
      demographics: {
        firstGeneration: index % 2 === 0,
        lowIncome: index % 3 !== 0,
        underrepresentedMinority: index % 4 !== 1,
      },
      assignedMentorId: mentors[index % mentors.length]?.id ?? null,
      gpaHistory,
      enrollmentStatusHistory: [
        {
          status: enrollmentStatus,
          changedAt: statusChangedAt,
          note: "Initial status imported from legacy records.",
        },
      ],
      createdAt,
      updatedAt: statusChangedAt,
    };
  });

  const scholarships = Array.from({ length: 22 }, (_, index) => {
    const student = students[index % students.length];
    const status = scholarshipStatuses[index % scholarshipStatuses.length];
    const createdAt = toIso(addDays(referenceNow, -(index * 11 + 20)));
    const updatedAt = toIso(addDays(referenceNow, -(index % 7)));
    const deadline = toIso(addDays(referenceNow, index * 6 + 10));
    const name = `${student.major.split(" ")[0]} Achievement Grant ${index + 1}`;

    const statusHistory =
      status === "Researching"
        ? [{ status: "Researching" as const, changedAt: createdAt, note: "Opportunity identified" }]
        : [
            { status: "Researching" as const, changedAt: createdAt, note: "Opportunity identified" },
            {
              status,
              changedAt: toIso(addDays(referenceNow, -(index % 9))),
              note: `Status updated to ${status}`,
            },
          ];

    const dateApplied =
      status === "Researching"
        ? undefined
        : toIso(addDays(referenceNow, -(index % 15 + 5)));

    return {
      id: `sch_${index + 1}`,
      studentId: student.id,
      name,
      provider: index % 2 === 0 ? "Future Scholars Fund" : "Bridge to Success Foundation",
      amount: 2000 + (index % 6) * 750,
      currency: "USD",
      status,
      statusHistory,
      deadline,
      requirements: [
        "Transcript",
        "Recommendation Letter",
        ...(index % 2 === 0 ? ["Essay"] : []),
      ],
      essayRequired: index % 2 === 0,
      essaySubmitted: index % 2 === 0 ? index % 3 !== 0 : undefined,
      notes:
        status === "Rejected"
          ? "Reviewer requested stronger extracurricular evidence."
          : "Counselor tracking this application with monthly check-ins.",
      dateApplied,
      createdAt,
      updatedAt,
    };
  });

  const meetings = Array.from({ length: 30 }, (_, index) => {
    const student = students[index % students.length];
    const mentorId = student.assignedMentorId ?? mentors[0].id;
    const createdAt = toIso(addDays(referenceNow, -(index * 4 + 35)));
    const date = toIso(addDays(referenceNow, -20 + index * 2));
    const status: MeetingStatus =
      index % 7 === 0 ? "Cancelled" : index % 5 === 0 ? "Scheduled" : "Completed";

    return {
      id: `mtg_${index + 1}`,
      studentId: student.id,
      mentorId,
      date,
      duration: 30 + (index % 4) * 15,
      notes:
        status === "Cancelled"
          ? "Rescheduled due to conflict with exam week."
          : "Discussed study rhythm, scholarship deadlines, and next month goals.",
      actionItems:
        status === "Cancelled"
          ? ["Pick a new slot before Friday"]
          : [
              "Update scholarship tracker",
              "Upload revised resume",
              ...(index % 3 === 0 ? ["Share GPA progress reflection"] : []),
            ],
      status,
      createdAt,
      updatedAt: toIso(addDays(new Date(date), status === "Scheduled" ? 0 : 1)),
    };
  });

  return {
    students,
    mentors,
    scholarships,
    meetings,
    auditLogs: [],
  };
};
