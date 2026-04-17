import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  assignMentor,
  createStudent,
  createMeeting,
  createScholarship,
  deleteStudent,
  fetchDashboardSummary,
  fetchMeetings,
  fetchMentors,
  fetchStudentProfile,
  fetchStudents,
  updateMeeting,
  updateScholarship,
  updateStudent,
} from "./api";
import type {
  DashboardSummary,
  EnrollmentStatus,
  Meeting,
  MeetingStatus,
  Mentor,
  Scholarship,
  ScholarshipStatus,
  StudentDirectoryRecord,
  StudentProfilePayload,
} from "./types";

const scholarshipStatuses: ScholarshipStatus[] = [
  "Researching",
  "Applied",
  "Interview",
  "Awarded",
  "Rejected",
];

const meetingStatuses: MeetingStatus[] = ["Scheduled", "Completed", "Cancelled"];
const enrollmentStatuses: EnrollmentStatus[] = [
  "Full-time",
  "Part-time",
  "Leave of Absence",
  "Graduated",
];

const defaultScholarshipForm = {
  name: "",
  provider: "",
  amount: 2000,
  currency: "USD",
  status: "Researching" as ScholarshipStatus,
  deadline: "",
  requirements: "",
  essayRequired: false,
  essaySubmitted: false,
  notes: "",
  dateApplied: "",
};

const defaultMeetingForm = {
  mentorId: "",
  date: "",
  duration: 45,
  status: "Scheduled" as MeetingStatus,
  notes: "",
  actionItems: "",
};

const formatDate = (value?: string): string => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const formatDateOnly = (value?: string): string => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

const formatCurrency = (amount: number, currency: string): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

function StatusPill({ text }: { text: string }) {
  return <span className={`status-pill status-${text.toLowerCase().replace(/\s+/g, "-")}`}>{text}</span>;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="metric-card" aria-label={label}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

type SummaryView = "students" | "mentors" | "scholarships" | "meetings";

type SummaryListItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  details: Array<{ label: string; value: string }>;
};

type StudentFormState = {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string;
  academicYear: "Freshman" | "Sophomore" | "Junior" | "Senior";
  major: string;
  gpa: string;
  enrollmentStatus: EnrollmentStatus;
  creditsCompleted: string;
  creditsRequired: string;
  expectedGraduation: string;
  firstGeneration: boolean;
  lowIncome: boolean;
  underrepresentedMinority: boolean;
  assignedMentorId: string;
};

const emptyStudentForm = (): StudentFormState => ({
  firstName: "",
  lastName: "",
  email: "",
  avatarUrl: "",
  academicYear: "Freshman",
  major: "",
  gpa: "0",
  enrollmentStatus: "Full-time",
  creditsCompleted: "0",
  creditsRequired: "120",
  expectedGraduation: "",
  firstGeneration: false,
  lowIncome: false,
  underrepresentedMinority: false,
  assignedMentorId: "",
});

const toDateTimeLocalValue = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const mapProfileToStudentForm = (profile: StudentProfilePayload): StudentFormState => ({
  firstName: profile.student.firstName,
  lastName: profile.student.lastName,
  email: profile.student.email,
  avatarUrl: profile.student.avatarUrl ?? "",
  academicYear: profile.student.academicYear,
  major: profile.student.major,
  gpa: String(profile.student.gpa),
  enrollmentStatus: profile.student.enrollmentStatus,
  creditsCompleted: String(profile.student.creditsCompleted),
  creditsRequired: String(profile.student.creditsRequired),
  expectedGraduation: toDateTimeLocalValue(profile.student.expectedGraduation),
  firstGeneration: profile.student.demographics.firstGeneration,
  lowIncome: profile.student.demographics.lowIncome,
  underrepresentedMinority: profile.student.demographics.underrepresentedMinority,
  assignedMentorId: profile.student.assignedMentorId ?? "",
});

function App() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeSummaryView, setActiveSummaryView] = useState<SummaryView>("students");
  const [summaryStudentSearch, setSummaryStudentSearch] = useState("");
  const [selectedSummaryItemId, setSelectedSummaryItemId] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [studentForm, setStudentForm] = useState<StudentFormState>(emptyStudentForm());
  const [studentFormMode, setStudentFormMode] = useState<"create" | "edit">("create");
  const studentFormPanelRef = useRef<HTMLDivElement | null>(null);

  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [academicYear, setAcademicYear] = useState<
    "All" | "Freshman" | "Sophomore" | "Junior" | "Senior"
  >("All");
  const [enrollmentFilter, setEnrollmentFilter] = useState<"All" | EnrollmentStatus>("All");
  const [majorFilter, setMajorFilter] = useState("");

  const [profile, setProfile] = useState<StudentProfilePayload | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [mentorLoading, setMentorLoading] = useState(false);

  const [meetingRows, setMeetingRows] = useState<Meeting[]>([]);
  const [meetingSearch, setMeetingSearch] = useState("");

  const [moduleTab, setModuleTab] = useState<"dashboard" | "scholarships" | "mentorship">("dashboard");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [enrollmentDraft, setEnrollmentDraft] = useState<EnrollmentStatus>("Full-time");
  const [mentorDraft, setMentorDraft] = useState("");

  const [scholarshipForm, setScholarshipForm] = useState(defaultScholarshipForm);
  const [meetingForm, setMeetingForm] = useState(defaultMeetingForm);

  const majors = useMemo(
    () => Array.from(new Set(students.map((student) => student.major))).sort(),
    [students],
  );

  const scholarshipSummary = useMemo(() => {
    const empty = {
      Researching: 0,
      Applied: 0,
      Interview: 0,
      Awarded: 0,
      Rejected: 0,
    };
    if (!profile) return empty;

    return profile.scholarships.reduce((acc, scholarship) => {
      acc[scholarship.status] += 1;
      return acc;
    }, empty);
  }, [profile]);

  const summaryViewTitle = {
    students: "Students list",
    mentors: "Mentors list",
    scholarships: "Scholarships list",
    meetings: "Meetings list",
  }[activeSummaryView];

  const summaryViewItems = useMemo<SummaryListItem[]>(() => {
    if (!summary) return [];

    if (activeSummaryView === "students") {
      const query = summaryStudentSearch.trim().toLowerCase();

      return students
        .filter((student) => {
          if (!query) return true;
          return (
            student.name.toLowerCase().includes(query) ||
            student.email.toLowerCase().includes(query) ||
            student.major.toLowerCase().includes(query)
          );
        })
        .map((student) => ({
          id: student.id,
          title: student.name,
          subtitle: `${student.major} · ${student.academicYear}`,
          meta: `${student.enrollmentStatus} · ${student.quickStats.gpa.toFixed(2)} GPA`,
          details: [
            { label: "Email", value: student.email },
            {
              label: "Credits",
              value: `${student.quickStats.creditsCompleted}/${student.quickStats.creditsRequired}`,
            },
          ],
        }));
    }

    if (activeSummaryView === "mentors") {
      return mentors.map((mentor) => ({
        id: mentor.id,
        title: mentor.name,
        subtitle: `${mentor.title} · ${mentor.company}`,
        meta: `${mentor.activeMentees ?? 0}/${mentor.maxMentees} mentees`,
        details: [
          { label: "Email", value: mentor.email },
          { label: "Expertise", value: mentor.expertise.join(", ") || "-" },
          { label: "Bio", value: mentor.bio || "-" },
          {
            label: "Capacity",
            value: `${mentor.activeMentees ?? 0}/${mentor.maxMentees}`,
          },
        ],
      }));
    }

    if (activeSummaryView === "scholarships") {
      return summary.upcomingDeadlines.map((scholarship) => ({
        id: scholarship.id,
        title: scholarship.name,
        subtitle: scholarship.provider,
        meta: `${formatCurrency(scholarship.amount, scholarship.currency)} · ${formatDateOnly(scholarship.deadline)} · ${scholarship.status}`,
        details: [
          { label: "Provider", value: scholarship.provider },
          {
            label: "Amount",
            value: formatCurrency(scholarship.amount, scholarship.currency),
          },
          { label: "Status", value: scholarship.status },
          { label: "Deadline", value: formatDateOnly(scholarship.deadline) },
          {
            label: "Requirements",
            value: scholarship.requirements.join(", ") || "-",
          },
          { label: "Notes", value: scholarship.notes || "-" },
        ],
      }));
    }

    return summary.scheduledMeetings.map((meeting) => ({
      id: meeting.id,
      title: `${mentors.find((mentor) => mentor.id === meeting.mentorId)?.name ?? meeting.mentorId} · ${formatDate(meeting.date)}`,
      subtitle: meeting.notes || "No notes",
      meta: `${meeting.duration} min · ${meeting.status}`,
      details: [
        {
          label: "Mentor",
          value: mentors.find((mentor) => mentor.id === meeting.mentorId)?.name ?? meeting.mentorId,
        },
        { label: "Student ID", value: meeting.studentId },
        { label: "Date", value: formatDate(meeting.date) },
        { label: "Duration", value: `${meeting.duration} minutes` },
        { label: "Status", value: meeting.status },
        { label: "Notes", value: meeting.notes || "-" },
        {
          label: "Action Items",
          value: meeting.actionItems.join(", ") || "-",
        },
      ],
    }));
  }, [activeSummaryView, mentors, students, summary, summaryStudentSearch]);

  const selectedSummaryItem = useMemo(() => {
    if (activeSummaryView === "students") return null;
    return summaryViewItems.find((item) => item.id === selectedSummaryItemId) ?? null;
  }, [activeSummaryView, selectedSummaryItemId, summaryViewItems]);

  const resetStudentForm = () => {
    setStudentForm(emptyStudentForm());
    setStudentFormMode("create");
    setSelectedStudentId(null);
    setProfile(null);
    setMeetingRows([]);
  };

  const loadDashboardSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await fetchDashboardSummary();
      setSummary(result);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Could not load dashboard summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadStudents = async () => {
    setStudentLoading(true);
    setStudentError(null);

    try {
      const result = await fetchStudents({
        search: search.trim() || undefined,
        academicYear,
        enrollmentStatus: enrollmentFilter,
        major: majorFilter || undefined,
      });

      setStudents(result.students);

      if (result.students.length === 0) {
        setSelectedStudentId(null);
        setProfile(null);
        setMeetingRows([]);
        return;
      }

      if (!selectedStudentId || !result.students.some((item) => item.id === selectedStudentId)) {
        setSelectedStudentId(result.students[0].id);
      }
    } catch (error) {
      setStudentError(error instanceof Error ? error.message : "Could not load students");
    } finally {
      setStudentLoading(false);
    }
  };

  const loadMentors = async () => {
    setMentorLoading(true);
    try {
      const result = await fetchMentors();
      setMentors(result);
    } finally {
      setMentorLoading(false);
    }
  };

  const loadStudentProfile = async (studentId: string) => {
    setProfileLoading(true);
    setProfileError(null);

    try {
      const result = await fetchStudentProfile(studentId);
      setProfile(result);
      setStudentForm(mapProfileToStudentForm(result));
      setStudentFormMode("edit");
      setEnrollmentDraft(result.student.enrollmentStatus);
      setMentorDraft(result.mentorship.mentor?.id ?? "");
      setMeetingRows(result.mentorship.meetings);
      setMeetingForm((prev) => ({
        ...prev,
        mentorId: result.mentorship.mentor?.id ?? prev.mentorId,
      }));
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not load profile");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardSummary();
    void loadMentors();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadStudents();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search, academicYear, enrollmentFilter, majorFilter]);

  useEffect(() => {
    if (!selectedStudentId) return;
    void loadStudentProfile(selectedStudentId);
  }, [selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) return;

    const timeout = window.setTimeout(async () => {
      try {
        const result = await fetchMeetings(selectedStudentId, meetingSearch.trim() || undefined);
        setMeetingRows(result);
      } catch {
        setActionError("Could not refresh meetings for the search term.");
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [meetingSearch, selectedStudentId]);

  useEffect(() => {
    if (activeSummaryView === "students") {
      setSelectedSummaryItemId(null);
      return;
    }

    if (summaryViewItems.length === 0) {
      setSelectedSummaryItemId(null);
      return;
    }

    if (!selectedSummaryItemId || !summaryViewItems.some((item) => item.id === selectedSummaryItemId)) {
      setSelectedSummaryItemId(summaryViewItems[0].id);
    }
  }, [activeSummaryView, selectedSummaryItemId, summaryViewItems]);

  const withAction = async (runner: () => Promise<void>) => {
    setSaving(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await runner();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const handleEnrollmentSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedStudentId) return;

    void withAction(async () => {
      await updateStudent(selectedStudentId, {
        enrollmentStatus: enrollmentDraft,
      });
      await loadStudentProfile(selectedStudentId);
      await loadStudents();
      setActionMessage("Enrollment status updated with timestamped history.");
    });
  };

  const handleStudentFormSubmit = (event: FormEvent) => {
    event.preventDefault();

    const payload = {
      firstName: studentForm.firstName.trim(),
      lastName: studentForm.lastName.trim(),
      email: studentForm.email.trim(),
      avatarUrl: studentForm.avatarUrl.trim() || undefined,
      academicYear: studentForm.academicYear,
      major: studentForm.major.trim(),
      gpa: Number(studentForm.gpa),
      enrollmentStatus: studentForm.enrollmentStatus,
      creditsCompleted: Number(studentForm.creditsCompleted),
      creditsRequired: Number(studentForm.creditsRequired),
      expectedGraduation: new Date(studentForm.expectedGraduation).toISOString(),
      demographics: {
        firstGeneration: studentForm.firstGeneration,
        lowIncome: studentForm.lowIncome,
        underrepresentedMinority: studentForm.underrepresentedMinority,
      },
      assignedMentorId: studentForm.assignedMentorId || null,
    };

    void withAction(async () => {
      if (studentFormMode === "create") {
        const created = await createStudent(payload);
        setSelectedStudentId(created.id);
        await loadDashboardSummary();
        await loadStudents();
        await loadStudentProfile(created.id);
        setActionMessage("Student created.");
        return;
      }

      if (!selectedStudentId) return;
      await updateStudent(selectedStudentId, payload);
      await loadDashboardSummary();
      await loadStudents();
      await loadStudentProfile(selectedStudentId);
      setActionMessage("Student updated.");
    });
  };

  const handleDeleteStudent = () => {
    if (!selectedStudentId) return;

    const confirmed = window.confirm("Delete this student and related scholarships/meetings?");
    if (!confirmed) return;

    void withAction(async () => {
      await deleteStudent(selectedStudentId);
      resetStudentForm();
      await loadDashboardSummary();
      await loadStudents();
      setActionMessage("Student deleted.");
    });
  };

  const handleEditInForm = () => {
    if (!profile) return;

    setStudentForm(mapProfileToStudentForm(profile));
    setStudentFormMode("edit");
    studentFormPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleMentorAssign = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedStudentId || !mentorDraft) return;

    void withAction(async () => {
      await assignMentor(selectedStudentId, mentorDraft);
      await loadStudentProfile(selectedStudentId);
      await loadMentors();
      setActionMessage("Mentor assignment updated.");
    });
  };

  const handleScholarshipSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedStudentId) return;

    void withAction(async () => {
      await createScholarship(selectedStudentId, {
        name: scholarshipForm.name,
        provider: scholarshipForm.provider,
        amount: Number(scholarshipForm.amount),
        currency: scholarshipForm.currency || "USD",
        status: scholarshipForm.status,
        deadline: new Date(scholarshipForm.deadline).toISOString(),
        requirements: scholarshipForm.requirements
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        essayRequired: scholarshipForm.essayRequired,
        essaySubmitted: scholarshipForm.essayRequired
          ? scholarshipForm.essaySubmitted
          : undefined,
        notes: scholarshipForm.notes,
        dateApplied: scholarshipForm.dateApplied
          ? new Date(scholarshipForm.dateApplied).toISOString()
          : undefined,
      });

      await loadStudentProfile(selectedStudentId);
      setScholarshipForm(defaultScholarshipForm);
      setActionMessage("Scholarship application added.");
    });
  };

  const handleScholarshipStatusChange = (scholarship: Scholarship, nextStatus: ScholarshipStatus) => {
    if (!selectedStudentId) return;

    void withAction(async () => {
      await updateScholarship(scholarship.id, { status: nextStatus });
      await loadStudentProfile(selectedStudentId);
      setActionMessage(`Scholarship moved to ${nextStatus}.`);
    });
  };

  const handleMeetingSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedStudentId) return;

    void withAction(async () => {
      await createMeeting(selectedStudentId, {
        mentorId: meetingForm.mentorId || undefined,
        date: new Date(meetingForm.date).toISOString(),
        duration: Number(meetingForm.duration),
        status: meetingForm.status,
        notes: meetingForm.notes,
        actionItems: meetingForm.actionItems
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });

      await loadStudentProfile(selectedStudentId);
      setMeetingForm(defaultMeetingForm);
      setActionMessage("New mentorship meeting scheduled.");
    });
  };

  const handleMeetingStatusChange = (meeting: Meeting, status: MeetingStatus) => {
    if (!selectedStudentId) return;

    void withAction(async () => {
      await updateMeeting(meeting.id, { status });
      const refreshed = await fetchMeetings(selectedStudentId, meetingSearch.trim() || undefined);
      setMeetingRows(refreshed);
      setActionMessage(`Meeting status updated to ${status}.`);
    });
  };

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Access to Education</p>
          <h1>Student Information Dashboard</h1>
          <p>
            Real-time counselor workspace for academics, scholarships, and mentorship
            continuity.
          </p>
        </div>

        {summaryLoading ? (
          <p role="status" className="loading-inline">
            Loading summary...
          </p>
        ) : summaryError ? (
          <p role="alert" className="error-inline">
            {summaryError}
          </p>
        ) : summary ? (
          <div className="summary-grid" aria-label="Program summary">
            <button
              type="button"
              className={`metric-button ${activeSummaryView === "students" ? "is-active" : ""}`}
              onClick={() => setActiveSummaryView("students")}
            >
              <MetricCard label="Students" value={summary.totalStudents} />
            </button>
            <button
              type="button"
              className={`metric-button ${activeSummaryView === "mentors" ? "is-active" : ""}`}
              onClick={() => setActiveSummaryView("mentors")}
            >
              <MetricCard label="Mentors" value={summary.totalMentors} />
            </button>
            <button
              type="button"
              className={`metric-button ${activeSummaryView === "scholarships" ? "is-active" : ""}`}
              onClick={() => setActiveSummaryView("scholarships")}
            >
              <MetricCard label="Scholarships" value={summary.totalScholarships} />
            </button>
            <button
              type="button"
              className={`metric-button ${activeSummaryView === "meetings" ? "is-active" : ""}`}
              onClick={() => setActiveSummaryView("meetings")}
            >
              <MetricCard label="Meetings" value={summary.totalMeetings} />
            </button>
          </div>
        ) : null}
      </header>

      {summary ? (
        <section className="panel summary-drilldown" aria-label={`${summaryViewTitle}`}>
          <div className="panel-header">
            <h2>{summaryViewTitle}</h2>
            <p>Click any top card to switch the list.</p>
            {activeSummaryView === "students" ? (
              <label className="summary-search">
                Find student in this list
                <input
                  type="search"
                  value={summaryStudentSearch}
                  onChange={(event) => setSummaryStudentSearch(event.target.value)}
                  placeholder="Search name, email, major"
                />
              </label>
            ) : null}
          </div>

          <div className="summary-list-wrap">
            {summaryViewItems.length === 0 ? (
              <p className="muted">No items available.</p>
            ) : (
              <>
                <ul className="summary-list" aria-label={summaryViewTitle}>
                  {summaryViewItems.map((item) => {
                    const isSelected =
                      activeSummaryView !== "students" && selectedSummaryItemId === item.id;

                    return (
                      <li
                        key={item.id}
                        className={`summary-list-item ${isSelected ? "is-selected" : ""}`}
                      >
                        {activeSummaryView === "students" ? (
                          <button
                            type="button"
                            className="summary-list-button"
                            onClick={() => {
                              setSelectedStudentId(item.id);
                              setModuleTab("dashboard");
                            }}
                            aria-label={`Open profile for ${item.title}`}
                          >
                            <div>
                              <strong>{item.title}</strong>
                              <p>{item.subtitle}</p>
                            </div>
                            <span>{item.meta}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="summary-list-button"
                            onClick={() => setSelectedSummaryItemId(item.id)}
                            aria-label={`Show details for ${item.title}`}
                          >
                            <div>
                              <strong>{item.title}</strong>
                              <p>{item.subtitle}</p>
                            </div>
                            <span>{item.meta}</span>
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {activeSummaryView !== "students" && selectedSummaryItem ? (
                  <article className="summary-detail-card" aria-label={`${selectedSummaryItem.title} details`}>
                    <h3>{selectedSummaryItem.title}</h3>
                    <p>{selectedSummaryItem.subtitle}</p>
                    <dl className="summary-detail-grid">
                      {selectedSummaryItem.details.map((detail) => (
                        <div key={`${selectedSummaryItem.id}-${detail.label}`}>
                          <dt>{detail.label}</dt>
                          <dd>{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ) : null}
              </>
            )}
          </div>
        </section>
      ) : null}

      <div className="layout-grid">
        <aside className="panel directory-panel" aria-label="Module 1 student directory">
          <div className="panel-header">
            <h2>Module 01 - Student Directory</h2>
            <p>Search, create, update, and delete students</p>
          </div>

          <div className="filter-grid">
            <label>
              Search
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, email, major"
              />
            </label>

            <label>
              Academic Year
              <select
                value={academicYear}
                onChange={(event) =>
                  setAcademicYear(
                    event.target.value as "All" | "Freshman" | "Sophomore" | "Junior" | "Senior",
                  )
                }
              >
                <option value="All">All</option>
                <option value="Freshman">Freshman</option>
                <option value="Sophomore">Sophomore</option>
                <option value="Junior">Junior</option>
                <option value="Senior">Senior</option>
              </select>
            </label>

            <label>
              Enrollment
              <select
                value={enrollmentFilter}
                onChange={(event) =>
                  setEnrollmentFilter(event.target.value as "All" | EnrollmentStatus)
                }
              >
                <option value="All">All</option>
                {enrollmentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Major
              <select value={majorFilter} onChange={(event) => setMajorFilter(event.target.value)}>
                <option value="">All majors</option>
                {majors.map((major) => (
                  <option key={major} value={major}>
                    {major}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="directory-list-zone" aria-label="Student results">
            {studentLoading ? (
              <p role="status" className="loading-inline">
                Loading students...
              </p>
            ) : studentError ? (
              <p role="alert" className="error-inline">
                {studentError}
              </p>
            ) : students.length === 0 ? (
              <p className="muted">No students match these filters.</p>
            ) : (
              <ul className="directory-list" aria-label="Student cards">
                {students.map((student) => {
                  const isActive = student.id === selectedStudentId;
                  return (
                    <li key={student.id}>
                      <button
                        className={`student-card ${isActive ? "is-active" : ""}`}
                        onClick={() => setSelectedStudentId(student.id)}
                        aria-pressed={isActive}
                      >
                        <img
                          src={student.avatarUrl || "https://api.dicebear.com/9.x/thumbs/svg?seed=Student"}
                          alt={`${student.name} avatar`}
                        />
                        <div>
                          <h3>{student.name}</h3>
                          <p>{student.major}</p>
                          <p>{student.academicYear}</p>
                          <div className="row-inline">
                            <StatusPill text={student.enrollmentStatus} />
                            <span>{student.quickStats.gpa.toFixed(2)} GPA</span>
                          </div>
                          <small>
                            {student.quickStats.creditsCompleted}/{student.quickStats.creditsRequired} credits
                          </small>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="directory-mode-row" aria-label="Student form options">
            <span>Add/Update options</span>
            <div className="row-inline">
              <button
                type="button"
                className={`ghost-button ${studentFormMode === "create" ? "is-selected" : ""}`}
                onClick={resetStudentForm}
              >
                Add student
              </button>
              <button
                type="button"
                className={`ghost-button ${studentFormMode === "edit" ? "is-selected" : ""}`}
                onClick={handleEditInForm}
                disabled={!profile}
              >
                Update student
              </button>
            </div>
          </div>

          <div className="form-panel" ref={studentFormPanelRef}>
            <div className="row-inline spread">
              <strong>{studentFormMode === "create" ? "Add Student" : "Update Student"}</strong>
              {studentFormMode === "edit" && profile ? (
                <small>
                  Editing {profile.student.firstName} {profile.student.lastName}
                </small>
              ) : null}
            </div>

            <form className="form-grid compact-form" onSubmit={handleStudentFormSubmit}>
              <div className="two-col">
                <label>
                  First name
                  <input
                    required
                    value={studentForm.firstName}
                    onChange={(event) =>
                      setStudentForm((prev) => ({ ...prev, firstName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Last name
                  <input
                    required
                    value={studentForm.lastName}
                    onChange={(event) =>
                      setStudentForm((prev) => ({ ...prev, lastName: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label>
                Email
                <input
                  required
                  type="email"
                  value={studentForm.email}
                  onChange={(event) =>
                    setStudentForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </label>

              <label>
                Avatar URL
                <input
                  value={studentForm.avatarUrl}
                  onChange={(event) =>
                    setStudentForm((prev) => ({ ...prev, avatarUrl: event.target.value }))
                  }
                />
              </label>

              <div className="two-col">
                <label>
                  Academic year
                  <select
                    value={studentForm.academicYear}
                    onChange={(event) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        academicYear: event.target.value as StudentFormState["academicYear"],
                      }))
                    }
                  >
                    <option value="Freshman">Freshman</option>
                    <option value="Sophomore">Sophomore</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                  </select>
                </label>
                <label>
                  Enrollment status
                  <select
                    value={studentForm.enrollmentStatus}
                    onChange={(event) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        enrollmentStatus: event.target.value as EnrollmentStatus,
                      }))
                    }
                  >
                    {enrollmentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Major
                <input
                  required
                  value={studentForm.major}
                  onChange={(event) =>
                    setStudentForm((prev) => ({ ...prev, major: event.target.value }))
                  }
                />
              </label>

              <div className="two-col">
                <label>
                  GPA
                  <input
                    required
                    type="number"
                    min={0}
                    max={4}
                    step="0.01"
                    value={studentForm.gpa}
                    onChange={(event) =>
                      setStudentForm((prev) => ({ ...prev, gpa: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Credits completed
                  <input
                    required
                    type="number"
                    min={0}
                    value={studentForm.creditsCompleted}
                    onChange={(event) =>
                      setStudentForm((prev) => ({ ...prev, creditsCompleted: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="two-col">
                <label>
                  Credits required
                  <input
                    required
                    type="number"
                    min={1}
                    value={studentForm.creditsRequired}
                    onChange={(event) =>
                      setStudentForm((prev) => ({ ...prev, creditsRequired: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Expected graduation
                  <input
                    required
                    type="datetime-local"
                    value={studentForm.expectedGraduation}
                    onChange={(event) =>
                      setStudentForm((prev) => ({ ...prev, expectedGraduation: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label>
                Assigned mentor
                <select
                  value={studentForm.assignedMentorId}
                  onChange={(event) =>
                    setStudentForm((prev) => ({ ...prev, assignedMentorId: event.target.value }))
                  }
                >
                  <option value="">No mentor</option>
                  {mentors.map((mentor) => (
                    <option key={mentor.id} value={mentor.id}>
                      {mentor.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="two-col">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={studentForm.firstGeneration}
                    onChange={(event) =>
                      setStudentForm((prev) => ({ ...prev, firstGeneration: event.target.checked }))
                    }
                  />
                  First generation
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={studentForm.lowIncome}
                    onChange={(event) =>
                      setStudentForm((prev) => ({ ...prev, lowIncome: event.target.checked }))
                    }
                  />
                  Low income
                </label>
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={studentForm.underrepresentedMinority}
                  onChange={(event) =>
                    setStudentForm((prev) => ({
                      ...prev,
                      underrepresentedMinority: event.target.checked,
                    }))
                  }
                />
                Underrepresented minority
              </label>

              <button type="submit" disabled={saving}>
                {studentFormMode === "create" ? "Create student" : "Update student"}
              </button>
            </form>
          </div>
        </aside>

        <main className="panel workspace-panel">
          <div className="panel-header">
            <h2>Student Workspace</h2>
            <p>Modules 02, 03, and 04</p>
          </div>

          <div className="tab-row" role="tablist" aria-label="Dashboard modules">
            <button
              role="tab"
              aria-selected={moduleTab === "dashboard"}
              className={moduleTab === "dashboard" ? "active" : ""}
              onClick={() => setModuleTab("dashboard")}
            >
              Module 02 - Profile Dashboard
            </button>
            <button
              role="tab"
              aria-selected={moduleTab === "scholarships"}
              className={moduleTab === "scholarships" ? "active" : ""}
              onClick={() => setModuleTab("scholarships")}
            >
              Module 03 - Scholarship Management
            </button>
            <button
              role="tab"
              aria-selected={moduleTab === "mentorship"}
              className={moduleTab === "mentorship" ? "active" : ""}
              onClick={() => setModuleTab("mentorship")}
            >
              Module 04 - Mentorship & Meetings
            </button>
          </div>

          {actionMessage ? (
            <p role="status" className="success-inline">
              {actionMessage}
            </p>
          ) : null}

          {actionError ? (
            <p role="alert" className="error-inline">
              {actionError}
            </p>
          ) : null}

          {!selectedStudentId ? (
            <p className="muted">Select a student from Module 01 to view dashboard details.</p>
          ) : profileLoading ? (
            <p role="status" className="loading-inline">
              Loading student profile...
            </p>
          ) : profileError ? (
            <p role="alert" className="error-inline">
              {profileError}
            </p>
          ) : !profile ? null : moduleTab === "dashboard" ? (
            <section aria-label="Module 2 student profile dashboard" className="module-grid">
              <article className="module-card profile-header">
                <div>
                  <p className="eyebrow">Profile Header</p>
                  <h3>
                    {profile.student.firstName} {profile.student.lastName}
                  </h3>
                  <p>{profile.student.email}</p>
                  <p>
                    {profile.student.major} | {profile.student.academicYear}
                  </p>
                  <div className="row-inline">
                    <StatusPill text={profile.student.enrollmentStatus} />
                    <span>Expected graduation: {formatDateOnly(profile.student.expectedGraduation)}</span>
                  </div>
                  <div className="row-inline action-row">
                    <button type="button" className="ghost-button" onClick={handleEditInForm}>
                      Edit in form
                    </button>
                    <button type="button" className="danger-button" onClick={handleDeleteStudent}>
                      Delete student
                    </button>
                  </div>
                </div>

                <form className="inline-form" onSubmit={handleEnrollmentSubmit}>
                  <label>
                    Update enrollment status
                    <select
                      value={enrollmentDraft}
                      onChange={(event) => setEnrollmentDraft(event.target.value as EnrollmentStatus)}
                    >
                      {enrollmentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" disabled={saving}>
                    Save status
                  </button>
                </form>
              </article>

              <article className="module-card">
                <p className="eyebrow">Academic Progress</p>
                <h3>GPA Trend</h3>
                <div className="chart-wrap" aria-label="GPA trend chart">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={profile.academicProgress.gpaTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.15)" />
                      <XAxis dataKey="term" />
                      <YAxis domain={[0, 4]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="gpa" stroke="#1d4ed8" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="progress-row" aria-label="Credit completion">
                  <div>
                    <p>Credits completed</p>
                    <strong>
                      {profile.academicProgress.creditsCompleted}/
                      {profile.academicProgress.creditsRequired}
                    </strong>
                  </div>
                  <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profile.academicProgress.completionPercent}>
                    <span style={{ width: `${profile.academicProgress.completionPercent}%` }} />
                  </div>
                  <p>{profile.academicProgress.completionPercent}% completed</p>
                </div>
              </article>

              <article className="module-card">
                <p className="eyebrow">Scholarship Snapshot</p>
                <h3>Current Pipeline</h3>
                <div className="status-summary-grid">
                  {scholarshipStatuses.map((status) => (
                    <div key={status}>
                      <span>{status}</span>
                      <strong>{scholarshipSummary[status]}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="module-card">
                <p className="eyebrow">Mentorship Panel</p>
                <h3>Assigned Mentor</h3>
                {profile.mentorship.mentor ? (
                  <>
                    <p>
                      {profile.mentorship.mentor.name} - {profile.mentorship.mentor.title}
                    </p>
                    <p>{profile.mentorship.mentor.company}</p>
                    <p>{profile.mentorship.mentor.email}</p>
                  </>
                ) : (
                  <p>No mentor assigned yet.</p>
                )}
                <p>
                  Meetings logged: <strong>{profile.mentorship.meetings.length}</strong>
                </p>
              </article>
            </section>
          ) : moduleTab === "scholarships" ? (
            <section aria-label="Module 3 scholarship management" className="module-grid scholarship-layout">
              <article className="module-card wide-card">
                <p className="eyebrow">Scholarship Tracker</p>
                <h3>Applications</h3>
                {profile.scholarships.length === 0 ? (
                  <p className="muted">No scholarship records yet.</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Provider</th>
                          <th>Amount</th>
                          <th>Deadline</th>
                          <th>Status</th>
                          <th>Requirements</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.scholarships.map((scholarship) => (
                          <tr key={scholarship.id}>
                            <td>{scholarship.name}</td>
                            <td>{scholarship.provider}</td>
                            <td>{formatCurrency(scholarship.amount, scholarship.currency)}</td>
                            <td>{formatDateOnly(scholarship.deadline)}</td>
                            <td>
                              <select
                                value={scholarship.status}
                                onChange={(event) =>
                                  handleScholarshipStatusChange(
                                    scholarship,
                                    event.target.value as ScholarshipStatus,
                                  )
                                }
                                disabled={saving}
                                aria-label={`Update status for ${scholarship.name}`}
                              >
                                {scholarshipStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>{scholarship.requirements.join(", ") || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <article className="module-card">
                <p className="eyebrow">Add Scholarship</p>
                <h3>New Application</h3>
                <form className="form-grid" onSubmit={handleScholarshipSubmit}>
                  <label>
                    Scholarship name
                    <input
                      required
                      value={scholarshipForm.name}
                      onChange={(event) =>
                        setScholarshipForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Provider
                    <input
                      required
                      value={scholarshipForm.provider}
                      onChange={(event) =>
                        setScholarshipForm((prev) => ({ ...prev, provider: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Amount
                    <input
                      required
                      type="number"
                      min={1}
                      value={scholarshipForm.amount}
                      onChange={(event) =>
                        setScholarshipForm((prev) => ({ ...prev, amount: Number(event.target.value) }))
                      }
                    />
                  </label>

                  <label>
                    Deadline
                    <input
                      required
                      type="datetime-local"
                      value={scholarshipForm.deadline}
                      onChange={(event) =>
                        setScholarshipForm((prev) => ({ ...prev, deadline: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Initial status
                    <select
                      value={scholarshipForm.status}
                      onChange={(event) =>
                        setScholarshipForm((prev) => ({
                          ...prev,
                          status: event.target.value as ScholarshipStatus,
                        }))
                      }
                    >
                      {scholarshipStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={scholarshipForm.essayRequired}
                      onChange={(event) =>
                        setScholarshipForm((prev) => ({
                          ...prev,
                          essayRequired: event.target.checked,
                        }))
                      }
                    />
                    Essay required
                  </label>

                  <label>
                    Requirements (one per line)
                    <textarea
                      rows={3}
                      value={scholarshipForm.requirements}
                      onChange={(event) =>
                        setScholarshipForm((prev) => ({ ...prev, requirements: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Notes
                    <textarea
                      rows={3}
                      value={scholarshipForm.notes}
                      onChange={(event) =>
                        setScholarshipForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                    />
                  </label>

                  <button type="submit" disabled={saving}>
                    Add scholarship
                  </button>
                </form>
              </article>
            </section>
          ) : (
            <section aria-label="Module 4 mentorship and meetings" className="module-grid mentorship-layout">
              <article className="module-card">
                <p className="eyebrow">Mentor Assignment</p>
                <h3>Current Mentor</h3>
                {profile.mentorship.mentor ? (
                  <div className="mentor-card">
                    <p>{profile.mentorship.mentor.name}</p>
                    <p>{profile.mentorship.mentor.title}</p>
                    <p>{profile.mentorship.mentor.company}</p>
                    <p>{profile.mentorship.mentor.email}</p>
                  </div>
                ) : (
                  <p className="muted">No mentor currently assigned.</p>
                )}

                <form className="inline-form" onSubmit={handleMentorAssign}>
                  <label>
                    Assign / reassign mentor
                    <select
                      value={mentorDraft}
                      onChange={(event) => setMentorDraft(event.target.value)}
                      disabled={mentorLoading}
                    >
                      <option value="">Choose mentor</option>
                      {mentors.map((mentor) => (
                        <option key={mentor.id} value={mentor.id}>
                          {mentor.name} ({mentor.activeMentees ?? 0}/{mentor.maxMentees})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" disabled={saving || !mentorDraft}>
                    Save mentor
                  </button>
                </form>
              </article>

              <article className="module-card">
                <p className="eyebrow">Schedule Meeting</p>
                <h3>New Session</h3>
                <form className="form-grid" onSubmit={handleMeetingSubmit}>
                  <label>
                    Date and time
                    <input
                      required
                      type="datetime-local"
                      value={meetingForm.date}
                      onChange={(event) =>
                        setMeetingForm((prev) => ({ ...prev, date: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Duration (minutes)
                    <input
                      required
                      type="number"
                      min={10}
                      max={300}
                      value={meetingForm.duration}
                      onChange={(event) =>
                        setMeetingForm((prev) => ({ ...prev, duration: Number(event.target.value) }))
                      }
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={meetingForm.status}
                      onChange={(event) =>
                        setMeetingForm((prev) => ({
                          ...prev,
                          status: event.target.value as MeetingStatus,
                        }))
                      }
                    >
                      {meetingStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Mentor
                    <select
                      value={meetingForm.mentorId}
                      onChange={(event) =>
                        setMeetingForm((prev) => ({ ...prev, mentorId: event.target.value }))
                      }
                    >
                      <option value="">Assigned mentor</option>
                      {mentors.map((mentor) => (
                        <option key={mentor.id} value={mentor.id}>
                          {mentor.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Notes
                    <textarea
                      rows={3}
                      value={meetingForm.notes}
                      onChange={(event) =>
                        setMeetingForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Action items (one per line)
                    <textarea
                      rows={3}
                      value={meetingForm.actionItems}
                      onChange={(event) =>
                        setMeetingForm((prev) => ({ ...prev, actionItems: event.target.value }))
                      }
                    />
                  </label>

                  <button type="submit" disabled={saving}>
                    Schedule meeting
                  </button>
                </form>
              </article>

              <article className="module-card wide-card">
                <div className="row-inline spread">
                  <div>
                    <p className="eyebrow">Meeting History</p>
                    <h3>Chronological Log</h3>
                  </div>
                  <label>
                    Search notes
                    <input
                      type="search"
                      value={meetingSearch}
                      onChange={(event) => setMeetingSearch(event.target.value)}
                      placeholder="Search notes or action items"
                    />
                  </label>
                </div>

                {meetingRows.length === 0 ? (
                  <p className="muted">No meetings match this search.</p>
                ) : (
                  <ul className="timeline-list">
                    {meetingRows.map((meeting) => (
                      <li key={meeting.id} className="timeline-item">
                        <div>
                          <p>
                            <strong>{formatDate(meeting.date)}</strong> - {meeting.duration} minutes
                          </p>
                          <p>{meeting.mentorName || "Mentor"}</p>
                          <p>{meeting.notes || "No notes"}</p>
                          {meeting.actionItems.length > 0 ? (
                            <p>Action items: {meeting.actionItems.join(" | ")}</p>
                          ) : null}
                        </div>
                        <div className="timeline-actions">
                          <StatusPill text={meeting.status} />
                          <select
                            value={meeting.status}
                            onChange={(event) =>
                              handleMeetingStatusChange(
                                meeting,
                                event.target.value as MeetingStatus,
                              )
                            }
                            disabled={saving}
                            aria-label={`Update meeting status for ${meeting.id}`}
                          >
                            {meetingStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
