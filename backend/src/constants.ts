import type { EnrollmentStatus, ScholarshipStatus } from "./types.js";

export const enrollmentTransitions: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  "Full-time": ["Part-time", "Leave of Absence", "Graduated"],
  "Part-time": ["Full-time", "Leave of Absence", "Graduated"],
  "Leave of Absence": ["Full-time", "Part-time"],
  Graduated: [],
};

export const scholarshipTransitions: Record<ScholarshipStatus, ScholarshipStatus[]> = {
  Researching: ["Applied", "Rejected"],
  Applied: ["Interview", "Awarded", "Rejected"],
  Interview: ["Awarded", "Rejected"],
  Awarded: [],
  Rejected: [],
};

export const DEADLINE_DUE_SOON_DAYS = 21;
export const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
export const GPA_DELTA_TOLERANCE = 0.01;

export const courseCatalogByMajor: Record<string, string[]> = {
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
