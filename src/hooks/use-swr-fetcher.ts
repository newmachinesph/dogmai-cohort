import useSWR, { SWRConfiguration, mutate } from "swr";
import useSWRMutation from "swr/mutation";

// ============================================
// Base Fetcher
// ============================================

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    const data = await res.json().catch(() => ({}));
    (error as Error & { info?: unknown; status?: number }).info = data;
    (error as Error & { info?: unknown; status?: number }).status = res.status;
    throw error;
  }

  return res.json();
}

// ============================================
// Mutation Fetchers
// ============================================

export async function postFetcher<T>(
  url: string,
  { arg }: { arg: unknown }
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const error = new Error("An error occurred while posting data.");
    const data = await res.json().catch(() => ({}));
    (error as Error & { info?: unknown; status?: number }).info = data;
    (error as Error & { info?: unknown; status?: number }).status = res.status;
    throw error;
  }

  return res.json();
}

export async function putFetcher<T>(
  url: string,
  { arg }: { arg: unknown }
): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const error = new Error("An error occurred while updating data.");
    const data = await res.json().catch(() => ({}));
    (error as Error & { info?: unknown; status?: number }).info = data;
    (error as Error & { info?: unknown; status?: number }).status = res.status;
    throw error;
  }

  return res.json();
}

export async function patchFetcher<T>(
  url: string,
  { arg }: { arg: unknown }
): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const error = new Error("An error occurred while patching data.");
    const data = await res.json().catch(() => ({}));
    (error as Error & { info?: unknown; status?: number }).info = data;
    (error as Error & { info?: unknown; status?: number }).status = res.status;
    throw error;
  }

  return res.json();
}

export async function deleteFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "DELETE" });

  if (!res.ok) {
    const error = new Error("An error occurred while deleting data.");
    const data = await res.json().catch(() => ({}));
    (error as Error & { info?: unknown; status?: number }).info = data;
    (error as Error & { info?: unknown; status?: number }).status = res.status;
    throw error;
  }

  return res.json();
}

// ============================================
// Custom Hooks
// ============================================

interface UseDataOptions<T> extends SWRConfiguration<T> {
  enabled?: boolean;
}

export function useData<T>(
  url: string | null,
  options?: UseDataOptions<T>
) {
  const { enabled = true, ...swrOptions } = options || {};

  return useSWR<T>(
    enabled && url ? url : null,
    fetcher,
    {
      revalidateOnFocus: false,
      ...swrOptions,
    }
  );
}

export function useMutation<T, A = unknown>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST"
) {
  const fetcherFn =
    method === "POST"
      ? postFetcher<T>
      : method === "PUT"
      ? putFetcher<T>
      : method === "PATCH"
      ? patchFetcher<T>
      : async () => deleteFetcher<T>(url);

  return useSWRMutation<T, Error, string, A>(url, fetcherFn);
}

// ============================================
// Data Type Specific Hooks
// ============================================

// User hooks
interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  role: "ADMIN" | "STAFF" | "STUDENT";
  isActive: boolean;
  avatarUrl?: string | null;
  bio?: string | null;
}

interface UsersResponse {
  users: User[];
  total?: number;
}

interface MeResponse {
  user: User;
}

export function useCurrentUser() {
  return useData<MeResponse>("/api/auth/me");
}

export function useUsers(params?: { role?: string; cohortId?: string; q?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set("role", params.role);
  if (params?.cohortId) searchParams.set("cohortId", params.cohortId);
  if (params?.q) searchParams.set("q", params.q);

  const queryString = searchParams.toString();
  const url = `/api/users${queryString ? `?${queryString}` : ""}`;

  return useData<UsersResponse>(url);
}

export function useUser(id: string | null) {
  return useData<{ user: User }>(id ? `/api/users/${id}` : null);
}

// Cohort hooks
interface Cohort {
  id: string;
  name: string;
  description?: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  startDate?: string | null;
  endDate?: string | null;
  maxStudents?: number | null;
  _count?: {
    enrollments: number;
    assignments: number;
  };
}

interface CohortsResponse {
  cohorts: Cohort[];
}

export function useCohorts(status?: string) {
  const url = status ? `/api/cohorts?status=${status}` : "/api/cohorts";
  return useData<CohortsResponse>(url);
}

export function useCohort(id: string | null) {
  return useData<{ cohort: Cohort }>(id ? `/api/cohorts/${id}` : null);
}

// Assignment hooks
interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  dueDate?: string | null;
  maxPoints: number;
  passingScore?: number | null;
  isPublished: boolean;
  cohort: { id: string; name: string };
}

interface AssignmentsResponse {
  assignments: Assignment[];
}

export function useAssignments(params?: { cohortId?: string; status?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.cohortId) searchParams.set("cohortId", params.cohortId);
  if (params?.status) searchParams.set("status", params.status);

  const queryString = searchParams.toString();
  const url = `/api/assignments${queryString ? `?${queryString}` : ""}`;

  return useData<AssignmentsResponse>(url);
}

export function useAssignment(id: string | null) {
  return useData<{ assignment: Assignment }>(id ? `/api/assignments/${id}` : null);
}

// Submission hooks
interface Submission {
  id: string;
  status: string;
  score?: number | null;
  feedback?: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
  user: { id: string; username: string; displayName?: string | null };
  assignment: { id: string; title: string; maxPoints: number };
}

interface SubmissionsResponse {
  submissions: Submission[];
}

export function useSubmissions(params?: {
  assignmentId?: string;
  userId?: string;
  status?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.assignmentId) searchParams.set("assignmentId", params.assignmentId);
  if (params?.userId) searchParams.set("userId", params.userId);
  if (params?.status) searchParams.set("status", params.status);

  const queryString = searchParams.toString();
  const url = `/api/submissions${queryString ? `?${queryString}` : ""}`;

  return useData<SubmissionsResponse>(url);
}

export function useSubmission(id: string | null) {
  return useData<{ submission: Submission }>(id ? `/api/submissions/${id}` : null);
}

// Conversation hooks
interface Conversation {
  id: string;
  subject?: string | null;
  updatedAt: string;
  participants: { user: User }[];
  messages: { content: string; createdAt: string }[];
  _count?: { messages: number };
}

interface ConversationsResponse {
  conversations: Conversation[];
}

export function useConversations() {
  return useData<ConversationsResponse>("/api/conversations");
}

export function useConversation(id: string | null) {
  return useData<{ conversation: Conversation }>(
    id ? `/api/conversations/${id}` : null
  );
}

export function useUnreadCount() {
  return useData<{ unreadCount: number }>("/api/conversations/unread");
}

// Analytics hooks
interface AnalyticsData {
  overview: {
    totalStudents: number;
    totalCohorts: number;
    totalAssignments: number;
    averageGrade: number;
  };
  submissions: {
    total: number;
    graded: number;
    pending: number;
  };
  attendance: {
    rate: number;
    present: number;
    absent: number;
  };
}

export function useAnalytics(cohortId?: string) {
  const url = cohortId
    ? `/api/analytics?cohortId=${cohortId}`
    : "/api/analytics";
  return useData<AnalyticsData>(url);
}

// ============================================
// Revalidation Helpers
// ============================================

export function revalidateUsers() {
  mutate((key) => typeof key === "string" && key.startsWith("/api/users"));
}

export function revalidateCohorts() {
  mutate((key) => typeof key === "string" && key.startsWith("/api/cohorts"));
}

export function revalidateAssignments() {
  mutate((key) => typeof key === "string" && key.startsWith("/api/assignments"));
}

export function revalidateSubmissions() {
  mutate((key) => typeof key === "string" && key.startsWith("/api/submissions"));
}

export function revalidateConversations() {
  mutate((key) => typeof key === "string" && key.startsWith("/api/conversations"));
}

export function revalidateAll() {
  mutate(() => true);
}
