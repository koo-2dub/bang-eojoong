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
  await requestSupabase("anonymous_users", "POST", {
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
  await requestSupabase("records", "POST", { body: payload });
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
