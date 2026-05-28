"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AdminUserSummary,
  DailyPointEvent,
  DailyRecord,
  DailyRewardClaim,
  fetchAdminSummary,
  fetchDailyPointEvents,
  fetchDailyRecords,
  fetchDailyRewardClaims,
  isSupabaseConfigured,
} from "@/lib/supabase";

type DashboardAnalytics = {
  activeUsers: number;
  totalDefenseAmount: number;
  totalGrantedPoints: number;
  rewardClaims: number;
  adUpgradeCount: number;
  topCategory: string;
  activityFeed: string[];
  eventTypeBreakdown: Record<string, number>;
};

const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);

const buildAnalytics = (records: DailyRecord[], pointEvents: DailyPointEvent[], rewardClaims: DailyRewardClaim[]): DashboardAnalytics => {
  const activeUsers = new Set<string>();
  const categoryMap = new Map<string, number>();
  const eventTypeBreakdown: Record<string, number> = {};

  records.forEach((record) => {
    activeUsers.add(record.user_id);
    categoryMap.set(record.category, (categoryMap.get(record.category) || 0) + 1);
  });

  pointEvents.forEach((event) => {
    activeUsers.add(event.user_id);
    eventTypeBreakdown[event.event_type] = (eventTypeBreakdown[event.event_type] || 0) + event.points;
  });

  rewardClaims.forEach((claim) => {
    activeUsers.add(claim.user_id);
  });

  const topCategory = [...categoryMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  const totalDefenseAmount = records.reduce((sum, record) => sum + record.amount, 0);
  const totalGrantedPoints = pointEvents.reduce((sum, event) => sum + event.points, 0);
  const adUpgradeCount = pointEvents.filter((event) => event.event_type === "upgraded_reward").length;

  const recordActivities = records.slice(0, 4).map((record) => `${record.category} 소비 ${record.amount.toLocaleString("ko-KR")}원 방어`);
  const pointActivities = pointEvents
    .slice(0, 4)
    .map((event) => `${event.user_id.slice(0, 10)} 님이 ${event.points}P 획득 (${event.event_type})`);
  const rewardActivities = rewardClaims
    .slice(0, 4)
    .map((claim) => `${claim.user_id.slice(0, 10)} 님이 광고 보고 2배 reward 획득`);

  return {
    activeUsers: activeUsers.size,
    totalDefenseAmount,
    totalGrantedPoints,
    rewardClaims: rewardClaims.length,
    adUpgradeCount,
    topCategory,
    activityFeed: [...pointActivities, ...recordActivities, ...rewardActivities].slice(0, 8),
    eventTypeBreakdown,
  };
};

export default function AdminPage() {
  const router = useRouter();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [rows, setRows] = useState<AdminUserSummary[] | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState(false);

  useEffect(() => {
    if (!mounted || !isSupabaseConfigured) return;

    const load = async () => {
      const today = getTodayIsoDate();
      const [summaryData, dailyRecords, dailyPointEvents, dailyRewardClaims] = await Promise.all([
        fetchAdminSummary(),
        fetchDailyRecords(today),
        fetchDailyPointEvents(today),
        fetchDailyRewardClaims(today),
      ]);

      setRows(summaryData || []);

      if (!dailyRecords || !dailyPointEvents || !dailyRewardClaims) {
        setAnalyticsError(true);
        setAnalytics(null);
        return;
      }

      setAnalyticsError(false);
      setAnalytics(buildAnalytics(dailyRecords, dailyPointEvents, dailyRewardClaims));
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

        {isSupabaseConfigured && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-cyan-200">운영 대시보드</h2>

            {analyticsError ? (
              <div className="rounded-2xl border border-red-400/40 bg-red-400/10 p-5 text-red-200">데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</div>
            ) : analytics ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                  {[
                    ["🔥 오늘 방어 금액", `₩${analytics.totalDefenseAmount.toLocaleString("ko-KR")}`],
                    ["🎁 오늘 지급 포인트", `${analytics.totalGrantedPoints.toLocaleString("ko-KR")}P`],
                    ["👥 오늘 활성 유저", `${analytics.activeUsers}명`],
                    ["🏆 오늘 reward claim", `${analytics.rewardClaims}회`],
                    ["📺 2배 보상 사용", `${analytics.adUpgradeCount}회`],
                    ["☕ 가장 많이 참은 소비", analytics.topCategory],
                  ].map(([title, value]) => (
                    <div key={title} className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#111A33] to-[#0C1326] p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]">
                      <p className="text-sm text-cyan-100/80 mb-2">{title}</p>
                      <p className="text-3xl font-extrabold tracking-tight text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h3 className="text-lg font-semibold mb-3">포인트 이벤트 분포</h3>
                    <ul className="space-y-2 text-sm text-gray-200">
                      {Object.entries(analytics.eventTypeBreakdown).length === 0 ? (
                        <li className="text-gray-400">오늘 발생한 포인트 이벤트가 없습니다.</li>
                      ) : (
                        Object.entries(analytics.eventTypeBreakdown).map(([eventType, points]) => (
                          <li key={eventType} className="flex justify-between border-b border-white/10 pb-1">
                            <span>{eventType}</span>
                            <span className="font-semibold">{points}P</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h3 className="text-lg font-semibold mb-3">최근 Activity</h3>
                    <ul className="space-y-2 text-sm text-gray-200">
                      {analytics.activityFeed.length ? (
                        analytics.activityFeed.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)
                      ) : (
                        <li className="text-gray-400">오늘 활동 기록이 없습니다.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-gray-300">대시보드 데이터를 불러오는 중입니다.</div>
            )}
          </section>
        )}

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
