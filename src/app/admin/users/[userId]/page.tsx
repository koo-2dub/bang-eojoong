"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  fetchAnonymousUserById,
  fetchPointEventsByUserId,
  fetchRecordsByUserId,
  fetchRewardClaimsByUserId,
  isSupabaseConfigured,
  UserPointEvent,
  UserRecord,
  RewardClaim,
} from "@/lib/supabase";

type DetailState = {
  records: UserRecord[];
  pointEvents: UserPointEvent[];
  rewardClaims: RewardClaim[];
};

export default function AdminUserDetailPage() {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<DetailState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted || !isSupabaseConfigured) return;

    const load = async () => {
      if (!userId) {
        setError("유저 ID가 없습니다.");
        return;
      }

      setError(null);
      const user = await fetchAnonymousUserById(userId);
      if (!user) {
        setData({ records: [], pointEvents: [], rewardClaims: [] });
        return;
      }

      const [records, pointEvents, rewardClaims] = await Promise.all([
        fetchRecordsByUserId(userId),
        fetchPointEventsByUserId(userId),
        fetchRewardClaimsByUserId(userId),
      ]);

      if (records === null || pointEvents === null || rewardClaims === null) {
        setError("Supabase 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      setData({ records, pointEvents, rewardClaims });
    };

    void load();
  }, [mounted, userId]);

  const summary = useMemo(() => {
    if (!data) return null;

    const totalRecords = data.records.length;
    const totalPoints = data.pointEvents.reduce((sum, row) => sum + row.points, 0);
    const totalDefenseAmount = data.records.reduce((sum, row) => sum + row.amount, 0);
    const latestRecordAt = data.records[0]?.recorded_at ?? null;

    const categoryCountMap = new Map<string, number>();
    data.records.forEach((row) => {
      categoryCountMap.set(row.category, (categoryCountMap.get(row.category) ?? 0) + 1);
    });

    const topCategory = Array.from(categoryCountMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

    return { totalRecords, totalPoints, totalDefenseAmount, latestRecordAt, topCategory };
  }, [data]);

  return (
    <main className="min-h-screen bg-[#0B1020] text-white px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">유저 상세 (Admin)</h1>
            <p className="text-sm text-gray-400 mt-1 font-mono break-all">{userId || "unknown user"}</p>
          </div>
          <Link href="/admin" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
            ← 뒤로가기
          </Link>
        </div>

        {!isSupabaseConfigured && (
          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-4">
            NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 설정이 필요합니다.
          </div>
        )}

        {error && <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 text-red-100">{error}</div>}

        {mounted && isSupabaseConfigured && !data && !error && <p>불러오는 중...</p>}

        {data && summary && (
          <>
            <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoCard title="총 기록 수" value={`${summary.totalRecords}`} />
              <InfoCard title="총 포인트" value={`${summary.totalPoints.toLocaleString()} pt`} />
              <InfoCard title="총 방어 금액" value={`₩${summary.totalDefenseAmount.toLocaleString()}`} />
              <InfoCard title="최근 기록 일자" value={summary.latestRecordAt ? new Date(summary.latestRecordAt).toLocaleString("ko-KR") : "-"} />
              <InfoCard title="가장 많이 참은 카테고리" value={summary.topCategory} />
              <InfoCard title="userId" value={userId || "-"} mono />
            </section>

            {data.records.length === 0 && data.pointEvents.length === 0 && data.rewardClaims.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">조회된 데이터가 없습니다.</div>
            )}

            <DataTable
              title="기록 리스트"
              headers={["날짜", "카테고리", "이유", "금액"]}
              rows={data.records.map((row) => [
                new Date(row.recorded_at).toLocaleString("ko-KR"),
                row.category,
                row.reason,
                `₩${row.amount.toLocaleString()}`,
              ])}
            />

            <DataTable
              title="포인트 이벤트 리스트"
              headers={["날짜", "이벤트 타입", "포인트"]}
              rows={data.pointEvents.map((row) => [
                new Date(row.occurred_at).toLocaleString("ko-KR"),
                row.event_type,
                `${row.points.toLocaleString()} pt`,
              ])}
            />

            <DataTable
              title="Reward Claim 리스트"
              headers={["milestone key", "base points", "upgraded points", "claimed_at"]}
              rows={data.rewardClaims.map((row) => [
                row.milestone_key,
                `${row.base_points.toLocaleString()} pt`,
                `${row.upgraded_points.toLocaleString()} pt`,
                new Date(row.claimed_at).toLocaleString("ko-KR"),
              ])}
            />
          </>
        )}
      </div>
    </main>
  );
}

function InfoCard({ title, value, mono = false }: { title: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-gray-400 mb-1">{title}</p>
      <p className={`text-sm md:text-base font-semibold ${mono ? "font-mono break-all" : ""}`}>{value}</p>
    </div>
  );
}

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h2 className="font-semibold">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-gray-400">데이터가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/10 text-left">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="p-3 whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`} className="border-t border-white/10 align-top">
                  {row.map((col, colIndex) => (
                    <td key={`${title}-${rowIndex}-${colIndex}`} className="p-3 whitespace-pre-wrap break-words">
                      {col}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
