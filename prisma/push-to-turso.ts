import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join } from "path";

// Load .env file manually
const envPath = join(__dirname, "..", ".env");
const envContent = readFileSync(envPath, "utf-8");
const envLines = envContent.split("\n");
for (const line of envLines) {
  const match = line.match(/^([^=]+)=["']?([^"'\r\n]*)["']?$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
}

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
  process.exit(1);
}

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

const migration = `
-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "mustChangePassword" INTEGER NOT NULL DEFAULT 0,
    "googleId" TEXT,
    "lastLoginAt" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cohorts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'HYBRID',
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "maxStudents" INTEGER NOT NULL DEFAULT 25,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "isArchived" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "enrollments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "completedAt" TEXT,
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("cohortId") REFERENCES "cohorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "staff_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'INSTRUCTOR',
    "assignedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("cohortId") REFERENCES "cohorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isPublished" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohortId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'HYBRID',
    "location" TEXT,
    "moduleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("cohortId") REFERENCES "cohorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("moduleId") REFERENCES "modules" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cohort_modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohortId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "startDate" TEXT,
    "endDate" TEXT,
    "unlockedAt" TEXT,
    "isLocked" INTEGER NOT NULL DEFAULT 1,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY ("cohortId") REFERENCES "cohorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("moduleId") REFERENCES "modules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "lessons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER',
    "estimatedTime" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" INTEGER NOT NULL DEFAULT 0,
    "prerequisiteIds" TEXT,
    "videoUrl" TEXT,
    "resources" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("moduleId") REFERENCES "modules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "lesson_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TEXT,
    "completedAt" TEXT,
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("lessonId") REFERENCES "lessons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohortId" TEXT NOT NULL,
    "moduleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "lateDeadline" TEXT,
    "maxPoints" INTEGER NOT NULL DEFAULT 100,
    "passingScore" INTEGER NOT NULL DEFAULT 60,
    "rubric" TEXT,
    "submissionType" TEXT NOT NULL DEFAULT 'FILE',
    "maxFileSize" INTEGER NOT NULL DEFAULT 10,
    "allowedFormats" TEXT,
    "isPublished" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("cohortId") REFERENCES "cohorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("moduleId") REFERENCES "modules" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "githubUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "score" INTEGER,
    "feedback" TEXT,
    "gradedAt" TEXT,
    "gradedById" TEXT,
    FOREIGN KEY ("assignmentId") REFERENCES "assignments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPrivate" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("submissionId") REFERENCES "submissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cohort_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohortId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "description" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("cohortId") REFERENCES "cohorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("uploadedById") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "announcements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohortId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isPinned" INTEGER NOT NULL DEFAULT 0,
    "isArchived" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TEXT,
    "expiresAt" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("cohortId") REFERENCES "cohorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "announcement_reads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("announcementId") REFERENCES "announcements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'DIRECT',
    "name" TEXT,
    "avatarUrl" TEXT,
    "cohortId" TEXT,
    "createdById" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "conversation_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "lastReadAt" TEXT,
    "isTyping" INTEGER NOT NULL DEFAULT 0,
    "typingAt" TEXT,
    "isMuted" INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'TEXT',
    "isEdited" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" INTEGER NOT NULL DEFAULT 0,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "fileMimeType" TEXT,
    "replyToId" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("replyToId") REFERENCES "messages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "message_reactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "message_read_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "message_pins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "pinnedById" TEXT NOT NULL,
    "pinnedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("pinnedById") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_presence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "checkInAt" TEXT,
    "checkOutAt" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const indexes = `
-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "users_googleId_key" ON "users"("googleId");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE UNIQUE INDEX IF NOT EXISTS "cohorts_slug_key" ON "cohorts"("slug");
CREATE INDEX IF NOT EXISTS "cohorts_status_idx" ON "cohorts"("status");
CREATE INDEX IF NOT EXISTS "cohorts_location_idx" ON "cohorts"("location");
CREATE INDEX IF NOT EXISTS "enrollments_cohortId_idx" ON "enrollments"("cohortId");
CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_userId_cohortId_key" ON "enrollments"("userId", "cohortId");
CREATE INDEX IF NOT EXISTS "staff_assignments_cohortId_idx" ON "staff_assignments"("cohortId");
CREATE UNIQUE INDEX IF NOT EXISTS "staff_assignments_userId_cohortId_key" ON "staff_assignments"("userId", "cohortId");
CREATE INDEX IF NOT EXISTS "sessions_cohortId_date_idx" ON "sessions"("cohortId", "date");
CREATE INDEX IF NOT EXISTS "sessions_date_idx" ON "sessions"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "modules_slug_key" ON "modules"("slug");
CREATE INDEX IF NOT EXISTS "modules_orderIndex_idx" ON "modules"("orderIndex");
CREATE INDEX IF NOT EXISTS "cohort_modules_cohortId_orderIndex_idx" ON "cohort_modules"("cohortId", "orderIndex");
CREATE UNIQUE INDEX IF NOT EXISTS "cohort_modules_cohortId_moduleId_key" ON "cohort_modules"("cohortId", "moduleId");
CREATE INDEX IF NOT EXISTS "lessons_moduleId_idx" ON "lessons"("moduleId");
CREATE UNIQUE INDEX IF NOT EXISTS "lessons_moduleId_slug_key" ON "lessons"("moduleId", "slug");
CREATE INDEX IF NOT EXISTS "lesson_progress_userId_idx" ON "lesson_progress"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_progress_userId_lessonId_key" ON "lesson_progress"("userId", "lessonId");
CREATE INDEX IF NOT EXISTS "assignments_cohortId_idx" ON "assignments"("cohortId");
CREATE INDEX IF NOT EXISTS "assignments_dueDate_idx" ON "assignments"("dueDate");
CREATE INDEX IF NOT EXISTS "submissions_assignmentId_idx" ON "submissions"("assignmentId");
CREATE INDEX IF NOT EXISTS "submissions_userId_idx" ON "submissions"("userId");
CREATE INDEX IF NOT EXISTS "submissions_status_idx" ON "submissions"("status");
CREATE INDEX IF NOT EXISTS "comments_submissionId_idx" ON "comments"("submissionId");
CREATE INDEX IF NOT EXISTS "cohort_files_cohortId_idx" ON "cohort_files"("cohortId");
CREATE INDEX IF NOT EXISTS "cohort_files_uploadedById_idx" ON "cohort_files"("uploadedById");
CREATE INDEX IF NOT EXISTS "cohort_files_category_idx" ON "cohort_files"("category");
CREATE INDEX IF NOT EXISTS "announcements_cohortId_idx" ON "announcements"("cohortId");
CREATE INDEX IF NOT EXISTS "announcements_publishedAt_idx" ON "announcements"("publishedAt");
CREATE INDEX IF NOT EXISTS "announcements_isArchived_idx" ON "announcements"("isArchived");
CREATE INDEX IF NOT EXISTS "announcement_reads_userId_idx" ON "announcement_reads"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "announcement_reads_announcementId_userId_key" ON "announcement_reads"("announcementId", "userId");
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt");
CREATE INDEX IF NOT EXISTS "conversations_updatedAt_idx" ON "conversations"("updatedAt");
CREATE INDEX IF NOT EXISTS "conversations_cohortId_idx" ON "conversations"("cohortId");
CREATE INDEX IF NOT EXISTS "conversation_participants_userId_idx" ON "conversation_participants"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_participants_conversationId_userId_key" ON "conversation_participants"("conversationId", "userId");
CREATE INDEX IF NOT EXISTS "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "messages_senderId_idx" ON "messages"("senderId");
CREATE INDEX IF NOT EXISTS "messages_replyToId_idx" ON "messages"("replyToId");
CREATE INDEX IF NOT EXISTS "message_reactions_messageId_idx" ON "message_reactions"("messageId");
CREATE UNIQUE INDEX IF NOT EXISTS "message_reactions_messageId_userId_emoji_key" ON "message_reactions"("messageId", "userId", "emoji");
CREATE INDEX IF NOT EXISTS "message_read_receipts_messageId_idx" ON "message_read_receipts"("messageId");
CREATE UNIQUE INDEX IF NOT EXISTS "message_read_receipts_messageId_userId_key" ON "message_read_receipts"("messageId", "userId");
CREATE INDEX IF NOT EXISTS "message_pins_conversationId_idx" ON "message_pins"("conversationId");
CREATE UNIQUE INDEX IF NOT EXISTS "message_pins_messageId_conversationId_key" ON "message_pins"("messageId", "conversationId");
CREATE UNIQUE INDEX IF NOT EXISTS "user_presence_userId_key" ON "user_presence"("userId");
CREATE INDEX IF NOT EXISTS "attendance_sessionId_idx" ON "attendance"("sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_userId_sessionId_key" ON "attendance"("userId", "sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "settings_key_key" ON "settings"("key");
CREATE INDEX IF NOT EXISTS "settings_category_idx" ON "settings"("category");
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
`;

async function main() {
  console.log("Pushing schema to Turso...");
  console.log(`URL: ${tursoUrl}`);

  // Execute the table creation statements
  // Split by semicolon followed by whitespace and "-- CreateTable" or end of string
  const tableStatements = migration
    .split(/-- CreateTable/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.includes("CREATE TABLE"));

  console.log(`\nCreating ${tableStatements.length} tables...`);

  for (const statement of tableStatements) {
    try {
      // Remove trailing comments and clean up
      const cleanStatement = statement.replace(/\n--[^\n]*/g, "").trim();
      await client.execute(cleanStatement);
      const tableName = cleanStatement.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1];
      if (tableName) console.log(`  - Created table: ${tableName}`);
    } catch (error) {
      console.error(`Error executing statement`);
      console.error(error);
      throw error;
    }
  }

  // Execute index creation
  const indexStatements = indexes
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`\nCreating ${indexStatements.length} indexes...`);

  for (const statement of indexStatements) {
    try {
      await client.execute(statement + ";");
    } catch (error) {
      // Ignore index errors as they might already exist
    }
  }

  console.log("\nSchema pushed to Turso successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    client.close();
  });
