"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminUserSummary, fetchAdminSummary, isSupabaseConfigured } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [rows, setRows] = useState<AdminUserSummary[] | null>(null);

  useEffect(() => {
    if (!mounted || !isSupabaseConfigured) return;

    const load = async () => {
      const data = await fetchAdminSummary();
      setRows(data || []);
    };

    void load();
  }, [mounted]);

  return (
    <main className="min-h-screen bg-[#0B1020] text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Admin (개발용)</h1>
        <p className="text-sm text-gray-400 mb-6">익명 유저별 방어 기록 요약입니다. 인증 없이 열립니다.</p>

        {!isSupabaseConfigured && (
          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-4">
            NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 설정이 필요합니다.
          </div>
        )}

        {mounted && isSupabaseConfigured && rows === null && <p>불러오는 중...</p>}

        {rows !== null && isSupabaseConfigured && (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full text-sm">
              <thead className="bg-white/10 text-left">
                <tr>
                  <th className="p-3">userId</th>
                  <th className="p-3">총 기록 수</th>
                  <th className="p-3">총 포인트</th>
                  <th className="p-3">최근 기록</th>
                  <th className="p-3">방어 금액</th>
                  <th className="p-3">카테고리</th>
                  <th className="p-3">날짜</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.user_id}
                    className="border-t border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/users/${row.user_id}`)}
                  >
                    <td className="p-3 font-mono">
                      <Link href={`/admin/users/${row.user_id}`} className="underline-offset-2 hover:underline">
                        {row.user_id}
                      </Link>
                    </td>
                    <td className="p-3">{row.total_records}</td>
                    <td className="p-3">{row.total_points}</td>
                    <td className="p-3">{row.last_record_at ? "있음" : "-"}</td>
                    <td className="p-3">{row.last_record_amount ? `₩${row.last_record_amount.toLocaleString()}` : "-"}</td>
                    <td className="p-3">{row.last_record_category || "-"}</td>
                    <td className="p-3">
                      {row.last_record_at ? (
                        <Link href={`/admin/users/${row.user_id}`} className="block w-full">
                          {new Date(row.last_record_at).toLocaleString("ko-KR")}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
