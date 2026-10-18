import { z } from "zod";

// ============================================
// Common Schemas
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const idSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const searchSchema = z.object({
  q: z.string().optional(),
  query: z.string().optional(),
});

// ============================================
// User Schemas
// ============================================

export const roleSchema = z.enum(["ADMIN", "STAFF", "STUDENT"]);

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  displayName: z.string().max(100).optional(),
  role: roleSchema.default("STUDENT"),
});

export const updateUserSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    )
    .optional(),
  displayName: z.string().max(100).optional().nullable(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const userSearchSchema = z.object({
  q: z.string().optional(),
  role: roleSchema.optional(),
  cohortId: z.string().optional(),
  excludeIds: z.string().optional(), // comma-separated IDs
});

// ============================================
// Cohort Schemas
// ============================================

export const cohortStatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]);

export const createCohortSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(1000).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  status: cohortStatusSchema.default("DRAFT"),
  maxStudents: z.number().int().positive().optional().nullable(),
});

export const updateCohortSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  status: cohortStatusSchema.optional(),
  maxStudents: z.number().int().positive().optional().nullable(),
});

// ============================================
// Assignment Schemas
// ============================================

export const assignmentTypeSchema = z.enum([
  "HOMEWORK",
  "PROJECT",
  "QUIZ",
  "EXAM",
  "LAB",
  "OTHER",
]);

export const createAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  cohortId: z.string().min(1, "Cohort is required"),
  lessonId: z.string().optional().nullable(),
  type: assignmentTypeSchema.default("HOMEWORK"),
  dueDate: z.string().datetime().optional().nullable(),
  maxPoints: z.number().int().positive().default(100),
  passingScore: z.number().int().min(0).optional().nullable(),
  isPublished: z.boolean().default(false),
  allowLateSubmissions: z.boolean().default(true),
  instructions: z.string().optional(),
});

export const updateAssignmentSchema = createAssignmentSchema.partial();

// ============================================
// Submission Schemas
// ============================================

export const submissionStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "GRADED",
  "RETURNED",
  "LATE",
]);

export const createSubmissionSchema = z.object({
  assignmentId: z.string().min(1, "Assignment is required"),
  content: z.string().optional(),
  fileUrl: z.string().url().optional().nullable(),
});

export const gradeSubmissionSchema = z.object({
  score: z.number().int().min(0),
  feedback: z.string().max(5000).optional(),
  status: z.enum(["GRADED", "RETURNED"]).default("GRADED"),
});

export const addCommentSchema = z.object({
  content: z.string().min(1, "Comment is required").max(2000),
});

// ============================================
// Lesson Schemas
// ============================================

export const lessonTypeSchema = z.enum([
  "VIDEO",
  "ARTICLE",
  "QUIZ",
  "ASSIGNMENT",
  "LIVE_SESSION",
]);

export const createLessonSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  moduleId: z.string().min(1, "Module is required"),
  type: lessonTypeSchema.default("VIDEO"),
  content: z.string().optional(),
  videoUrl: z.string().url().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  order: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(false),
});

export const updateLessonSchema = createLessonSchema.partial();

export const updateProgressSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
  progressPercent: z.number().int().min(0).max(100).optional(),
  lastPosition: z.number().int().min(0).optional(),
});

// ============================================
// Conversation/Message Schemas
// ============================================

export const createConversationSchema = z.object({
  participantIds: z.array(z.string()).min(1, "At least one participant is required"),
  subject: z.string().max(200).optional(),
  initialMessage: z.string().min(1, "Message is required").max(10000).optional(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1, "Message is required").max(10000),
});

export const conversationSearchSchema = z.object({
  q: z.string().min(1, "Search query is required"),
});

// ============================================
// Attendance Schemas
// ============================================

export const attendanceStatusSchema = z.enum([
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
]);

export const recordAttendanceSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
  userId: z.string().min(1, "User is required"),
  status: attendanceStatusSchema,
  notes: z.string().max(500).optional(),
});

export const bulkAttendanceSchema = z.object({
  sessionId: z.string().min(1, "Session is required"),
  records: z.array(
    z.object({
      userId: z.string().min(1),
      status: attendanceStatusSchema,
      notes: z.string().max(500).optional(),
    })
  ),
});

// ============================================
// Bulk Operations Schemas
// ============================================

export const bulkImportStudentSchema = z.object({
  email: z.string().email("Invalid email"),
  username: z.string().min(3).max(30),
  displayName: z.string().max(100).optional(),
  password: z.string().min(8).optional(),
});

export const bulkGradeSchema = z.object({
  studentEmail: z.string().email("Invalid email"),
  assignmentId: z.string().min(1),
  grade: z.number().int().min(0),
  feedback: z.string().max(5000).optional(),
});

// ============================================
// Settings Schemas
// ============================================

export const updateSettingsSchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  siteDescription: z.string().max(500).optional(),
  timezone: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  allowRegistration: z.boolean().optional(),
  defaultRole: roleSchema.optional(),
});

// ============================================
// Announcement Schemas
// ============================================

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required").max(10000),
  cohortId: z.string().optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  isPublished: z.boolean().default(true),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

// ============================================
// Activity Schemas
// ============================================

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  type: z.string().optional(),
  userId: z.string().optional(),
  cohortId: z.string().optional(),
});

// ============================================
// Type exports
// ============================================

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCohortInput = z.infer<typeof createCohortSchema>;
export type UpdateCohortInput = z.infer<typeof updateCohortSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
