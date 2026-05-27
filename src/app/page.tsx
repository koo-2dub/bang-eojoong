"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import CountUp from "react-countup";
import { toPng } from "html-to-image";

type RecordItem = {
  category?: string;
  reason: string;
  amount: number;
  date: string;
};

type RewardType = "base" | "double";

type Milestone = {
  percent: number;
  amount: number;
  key: string;
  reached: boolean;
  claimed: boolean;
};

const POINTS_STORAGE_KEY = "bang_points";
const CLAIMED_STORAGE_KEY = "bang_claimed_milestones";
const RECORDS_STORAGE_KEY = "records";
const GOAL_STORAGE_KEY = "bang_goal";
const GOAL_LOCKED_STORAGE_KEY = "bang_goal_locked";
const MILESTONE_PERCENTAGES = [10, 25, 40, 55, 70, 85, 100];
const FALLBACK_CATEGORY_EMOJI = "💸";

export default function Home() {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("☕");
  const [records, setRecords] = useState<RecordItem[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(RECORDS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [goal, setGoal] = useState(() => (typeof window === "undefined" ? "" : localStorage.getItem(GOAL_STORAGE_KEY) || ""));
  const [goalLocked, setGoalLocked] = useState(() => (typeof window === "undefined" ? false : localStorage.getItem(GOAL_LOCKED_STORAGE_KEY) === "true"));
  const [points, setPoints] = useState(() => (typeof window === "undefined" ? 0 : Number(localStorage.getItem(POINTS_STORAGE_KEY) || "0")));
  const [claimedMilestones, setClaimedMilestones] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem(CLAIMED_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const captureRef = useRef<HTMLDivElement>(null);

  const getSafeCategory = (record: RecordItem) => {
    if (typeof record.category !== "string") return FALLBACK_CATEGORY_EMOJI;
    const trimmed = record.category.trim();
    return trimmed ? trimmed : FALLBACK_CATEGORY_EMOJI;
  };


  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  }, [mounted, records]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(POINTS_STORAGE_KEY, String(points));
  }, [mounted, points]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(CLAIMED_STORAGE_KEY, JSON.stringify(claimedMilestones));
  }, [mounted, claimedMilestones]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(GOAL_STORAGE_KEY, goal);
    localStorage.setItem(GOAL_LOCKED_STORAGE_KEY, String(goalLocked));
  }, [mounted, goal, goalLocked]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 1600);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const today = new Date().toLocaleDateString("ko-KR");
  const totalAmount = records.reduce((sum, record) => sum + record.amount, 0);
  const todayRecords = records.filter((record) => record.date === today);
  const todayAmount = todayRecords.reduce((sum, record) => sum + record.amount, 0);
  const oldRecords = records.filter((record) => record.date !== today);
  const hasTodayRecord = todayRecords.length > 0;

  const parsedGoal = Number(goal);
  const hasValidGoal = parsedGoal > 0;
  const goalReady = goalLocked && hasValidGoal;
  const progress = goalReady ? Math.min((todayAmount / parsedGoal) * 100, 100) : 0;


  const milestones: Milestone[] = !goalReady
    ? []
    : MILESTONE_PERCENTAGES.map((percent) => {
        const milestoneAmount = Math.round((parsedGoal * percent) / 100);
        const key = `${today}-${parsedGoal}-${milestoneAmount}`;
        return {
          percent,
          amount: milestoneAmount,
          key,
          reached: todayAmount >= milestoneAmount,
          claimed: Boolean(claimedMilestones[key]),
        };
      });

  const goalMessage =
    progress >= 100
      ? "오늘 소비 방어 성공 🔥"
      : progress >= 80
        ? "거의 다 왔어요. 조금만 더 방어해요"
        : progress >= 50
          ? "절반 넘게 방어했어요"
          : progress > 0
            ? "좋은 시작이에요"
            : "오늘 첫 방어를 기록해보세요 🔥";

  const goalAchieved = goalReady && todayAmount >= parsedGoal;
  const uniqueDates = [...new Set(records.map((record) => record.date))];
  const categoryCount: Record<string, number> = {};
  records.forEach((record) => {
    const safeCategory = getSafeCategory(record);
    categoryCount[safeCategory] = (categoryCount[safeCategory] || 0) + 1;
  });

  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || FALLBACK_CATEGORY_EMOJI;

  let streak = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    const compareDate = new Date();
    compareDate.setDate(compareDate.getDate() - i);
    const compare = compareDate.toLocaleDateString("ko-KR");
    if (uniqueDates.includes(compare)) streak++;
    else break;
  }

  const addRecord = () => {
    if (!reason || !amount) return;
    const newRecord = { category, reason, amount: Number(amount.replace(/,/g, "")), date: today };
    setRecords([newRecord, ...records]);
    setReason("");
    setAmount("");
  };

  const deleteRecord = (indexToDelete: number) => {
    setRecords(records.filter((_, index) => index !== indexToDelete));
  };

  const grantReward = (milestoneKey: string, rewardType: RewardType) => {
    const pointAmount = rewardType === "double" ? 40 : 20;
    setPoints((prev) => prev + pointAmount);
    setClaimedMilestones((prev) => ({ ...prev, [milestoneKey]: true }));
    setToastMessage(`+${pointAmount}P 획득!`);
    setSelectedMilestone(null);
    setIsWatchingAd(false);
  };

  const handleDoubleReward = async (milestoneKey: string) => {
    setIsWatchingAd(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    grantReward(milestoneKey, "double");
  };

  const shareImage = async () => {
    if (!captureRef.current) return;
    const image = await toPng(captureRef.current, { backgroundColor: "#0B1020", cacheBust: true });
    const link = document.createElement("a");
    link.href = image;
    link.download = "bang-eojoong.png";
    link.click();
  };

  const remainingForSelected = selectedMilestone ? Math.max(selectedMilestone.amount - todayAmount, 0) : 0;

  return (
    <main className="min-h-screen bg-[#0B1020] text-white px-4 py-6 relative">
      {toastMessage && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#7CFF5B] text-black font-bold px-4 py-2 rounded-full shadow-lg animate-pulse">{toastMessage}</div>}

      {selectedMilestone && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121a30] rounded-3xl p-5 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Milestone 보상</p>
            <p className="text-lg font-bold mb-2">{selectedMilestone.percent}% 구간 🎁</p>
            <p className="text-sm text-gray-300 mb-1">이 보상은 {selectedMilestone.amount.toLocaleString()}원 방어 시 열려요</p>
            <p className="text-sm text-gray-300 mb-1">현재 {todayAmount.toLocaleString()}원 방어중</p>
            {remainingForSelected > 0 && <p className="text-sm text-[#7CFF5B] mb-5">{remainingForSelected.toLocaleString()}원 더 방어하면 받을 수 있어요</p>}
            {remainingForSelected === 0 && !selectedMilestone.claimed && <p className="text-sm text-[#7CFF5B] mb-5">보상 열림</p>}
            {selectedMilestone.claimed && <p className="text-sm text-gray-400 mb-5">이미 보상을 받았어요 ✅</p>}

            <button onClick={() => grantReward(selectedMilestone.key, "base")} className="w-full py-3 rounded-2xl font-semibold bg-[#7CFF5B] text-black active:scale-95 mb-3 disabled:opacity-40" disabled={isWatchingAd || remainingForSelected > 0 || selectedMilestone.claimed}>
              기본 보상 +20P 받기
            </button>
            <button onClick={() => handleDoubleReward(selectedMilestone.key)} className="w-full py-3 rounded-2xl font-semibold bg-white/10 text-white active:scale-95 disabled:opacity-40" disabled={isWatchingAd || remainingForSelected > 0 || selectedMilestone.claimed}>
              {isWatchingAd ? "영상 확인 중..." : "2배 보상: 영상 보고 +40P"}
            </button>
            <button onClick={() => !isWatchingAd && setSelectedMilestone(null)} className="w-full mt-3 py-3 rounded-2xl text-gray-400">닫기</button>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
        <div ref={captureRef} className="text-center mb-7 mt-3 bg-[#0B1020] px-2 py-4 rounded-3xl">
          <div className="bg-white/5 rounded-3xl p-6">
            <div className="flex justify-end mb-4"><div className="bg-[#7CFF5B]/20 text-[#7CFF5B] px-3 py-1 rounded-full text-sm font-semibold">현재 포인트 {points.toLocaleString()}P</div></div>
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-2">오늘 지켜낸 돈</p>
              <h1 className="text-6xl font-bold mb-5">{hasTodayRecord ? <>₩<CountUp end={todayAmount} duration={0.5} separator="," /></> : "-"}</h1>
              {!hasTodayRecord && <div className="bg-white/5 rounded-2xl px-4 py-4"><p className="font-semibold mb-1">아직 오늘 방어한 돈이 없어요</p><p className="text-sm text-gray-400">오늘 첫 방어를 기록해보세요 🔥</p></div>}
            </div>

            <div className="space-y-4 mb-5">
              <div className="bg-white/5 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2"><p className="text-sm text-gray-400">오늘 목표</p><p className={`text-sm ${goalReady ? "text-green-400" : "text-gray-500"}`}>{goalReady ? `${progress.toFixed(0)}%` : "설정 전"}</p></div>
                <div className={`w-full h-3 rounded-full overflow-hidden mb-3 ${goalReady ? "bg-white/10" : "bg-white/5"}`}><div className={`h-full transition-all ${goalReady ? "bg-[#7CFF5B]" : "bg-white/20"}`} style={{ width: `${progress}%` }} /></div>

                {goalReady && (
                  <div className="mb-4 px-1">
                    <div className="flex items-center justify-between">{milestones.map((milestone) => (
                      <button key={milestone.key} onClick={() => setSelectedMilestone(milestone)} className={`text-lg transition ${milestone.reached ? "opacity-100" : "opacity-30"}`} aria-label={`${milestone.percent}% milestone`}>
                        {milestone.claimed ? "✅" : "🎁"}
                      </button>
                    ))}</div>
                    <div className="flex items-center justify-between mt-2">{milestones.map((milestone) => <span key={milestone.key + "-label"} className={`text-[10px] ${milestone.reached ? "text-gray-300" : "text-gray-500"}`}>{milestone.percent}%</span>)}</div>
                  </div>
                )}

                <div className="mt-3">
                  <label className="text-sm text-gray-400 block mb-2">목표 금액</label>
                  <div className="flex items-center border border-white/10 rounded-2xl px-4 py-3"><input type="text" value={goal ? Number(goal).toLocaleString() : ""} onChange={(e) => {
                    const value = e.target.value.replace(/,/g, "");
                    if (!isNaN(Number(value))) setGoal(value);
                  }} disabled={goalLocked} placeholder="오늘 얼마나 방어할까요?" className="w-full bg-transparent outline-none text-white placeholder:text-gray-500 disabled:text-gray-400" /></div>
                  <button onClick={() => setGoalLocked(true)} disabled={goalLocked || !hasValidGoal} className={`w-full mt-4 py-3 rounded-2xl font-semibold ${goalLocked ? "bg-white/5 text-gray-500" : "bg-[#7CFF5B] text-black active:scale-95"}`}>{goalLocked ? "오늘 목표 설정 완료" : "오늘 목표 설정하기"}</button>
                </div>

                {goalReady && goalAchieved && <div className="bg-[#7CFF5B] text-black rounded-2xl p-5 mt-4"><p className="text-2xl font-bold mb-1">🎉 목표 달성!</p><p>{goalMessage}</p></div>}
                {!goalReady && <p className="text-xs text-gray-500 text-left">목표를 설정하면 진행률과 보상이 활성화돼요.</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-2xl p-4 text-left"><p className="text-sm text-gray-400 mb-1">이번 달</p><p className="text-xl font-bold">₩{totalAmount.toLocaleString()}</p></div>
                <div className="bg-white/5 rounded-2xl p-4 text-left"><p className="text-sm text-gray-400 mb-1">연속 방어</p><p className="text-xl font-bold text-green-400">🔥 {streak}일</p></div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 text-left"><p className="text-sm text-gray-400 mb-1">가장 많이 참은 소비</p><p className="text-xl font-bold">{topCategory}</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 p-5 rounded-3xl mb-6">
          <div className="grid grid-cols-4 gap-2 mb-4">{["☕", "🍔", "🚕", "🛍"].map((item) => <button key={item} onClick={() => setCategory(item)} className={`py-3 rounded-2xl text-xl ${category === item ? "bg-[#7CFF5B] text-black" : "bg-white/10 text-white"}`}>{item}</button>)}</div>
          <input type="text" placeholder="뭘 참았나요?" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full bg-transparent border border-white/10 rounded-2xl px-4 py-3 mb-4 outline-none" />
          <input type="text" placeholder="얼마를 지켰나요?" value={amount} onChange={(e) => {
            const value = e.target.value.replace(/,/g, "");
            if (!isNaN(Number(value))) setAmount(Number(value).toLocaleString());
          }} onKeyDown={(e) => {
            if (e.key === "Enter" && reason && amount) addRecord();
          }} className="w-full bg-transparent border border-white/10 rounded-2xl px-4 py-3 mb-4 outline-none" />
          <button onClick={addRecord} disabled={!reason || !amount} className={`w-full font-semibold py-4 rounded-2xl transition-all duration-200 ${!reason || !amount ? "bg-white/10 text-gray-500" : "bg-[#7CFF5B] text-black active:scale-95"}`}>+ 방어 기록하기</button>
          <button onClick={shareImage} className="w-full mt-3 bg-white/10 text-white py-4 rounded-2xl">공유 이미지 저장하기</button>
        </div>

        <div className="space-y-3">
          {todayRecords.length > 0 && <div className="mb-6"><p className="text-sm text-gray-400 mb-3">오늘</p><div className="space-y-3">{todayRecords.map((record, index) => <div key={index} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between"><div><p className="font-semibold">{getSafeCategory(record)} {record.reason}</p><p className="text-sm text-gray-400">{record.date}</p></div><div className="flex items-center gap-3"><p className="text-green-400 font-bold">₩{record.amount.toLocaleString()}</p><button onClick={() => deleteRecord(index)} className="text-red-400">✕</button></div></div>)}</div></div>}
          {oldRecords.length > 0 && <div><p className="text-sm text-gray-400 mb-3">이전 기록</p><div className="space-y-3">{oldRecords.map((record, index) => <div key={index} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between"><div><p className="font-semibold">{getSafeCategory(record)} {record.reason}</p><p className="text-sm text-gray-400">{record.date}</p></div><p className="text-green-400 font-bold">₩{record.amount.toLocaleString()}</p></div>)}</div></div>}
        </div>
      </div>
    </main>
  );
}
