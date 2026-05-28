const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const createHeaders = () => {
  if (!SUPABASE_ANON_KEY) return null;
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
};

const requestSupabase = async <T>(
  table: string,
  method: "GET" | "POST",
  options?: { body?: unknown; query?: string },
): Promise<T | null> => {
  if (!SUPABASE_URL) return null;
  const headers = createHeaders();
  if (!headers) return null;

  const query = options?.query ? `?${options.query}` : "";
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[supabase:${table}]`, errorText);
    return null;
  }

  if (response.status === 204) return null;
  return (await response.json()) as T;
};

export const ensureAnonymousUser = async (userId: string) => {
  return requestSupabase("anonymous_users", "POST", {
    body: { user_id: userId },
    query: "on_conflict=user_id",
  });
};

export const insertRecord = async (payload: {
  user_id: string;
  category: string;
  reason: string;
  amount: number;
  recorded_at: string;
}) => {
  return requestSupabase("records", "POST", { body: payload });
};

export const insertPointEvent = async (payload: {
  user_id: string;
  event_type: string;
  points: number;
  metadata?: Record<string, unknown>;
  occurred_at: string;
}) => {
  await requestSupabase("point_events", "POST", { body: payload });
};

export type AdminUserSummary = {
  user_id: string;
  total_records: number;
  total_points: number;
  last_record_at: string | null;
  last_record_amount: number | null;
  last_record_category: string | null;
};

export const fetchAdminSummary = async () => {
  return requestSupabase<AdminUserSummary[]>("admin_user_summaries", "GET", {
    query: "select=user_id,total_records,total_points,last_record_at,last_record_amount,last_record_category&order=last_record_at.desc.nullslast",
  });
};

export type AnonymousUser = {
  user_id: string;
  created_at: string;
};

export type UserRecord = {
  id: number;
  user_id: string;
  category: string;
  reason: string;
  amount: number;
  recorded_at: string;
};

export type UserPointEvent = {
  id: number;
  user_id: string;
  event_type: string;
  points: number;
  occurred_at: string;
};

export type RewardClaim = {
  id: number;
  user_id: string;
  milestone_key: string;
  base_points: number;
  upgraded_points: number;
  claimed_at: string;
};

export const fetchAnonymousUserById = async (userId: string) => {
  const encodedId = encodeURIComponent(userId);
  const rows = await requestSupabase<AnonymousUser[]>("anonymous_users", "GET", {
    query: `select=user_id,created_at&user_id=eq.${encodedId}&limit=1`,
  });
  return rows?.[0] ?? null;
};

export const fetchRecordsByUserId = async (userId: string) => {
  const encodedId = encodeURIComponent(userId);
  return requestSupabase<UserRecord[]>("records", "GET", {
    query: `select=id,user_id,category,reason,amount,recorded_at&user_id=eq.${encodedId}&order=recorded_at.desc`,
  });
};

export const fetchPointEventsByUserId = async (userId: string) => {
  const encodedId = encodeURIComponent(userId);
  return requestSupabase<UserPointEvent[]>("point_events", "GET", {
    query: `select=id,user_id,event_type,points,occurred_at&user_id=eq.${encodedId}&order=occurred_at.desc`,
  });
};

export const fetchRewardClaimsByUserId = async (userId: string) => {
  const encodedId = encodeURIComponent(userId);
  return requestSupabase<RewardClaim[]>("reward_claims", "GET", {
    query: `select=id,user_id,milestone_key,base_points,upgraded_points,claimed_at&user_id=eq.${encodedId}&order=claimed_at.desc`,
  });
};
