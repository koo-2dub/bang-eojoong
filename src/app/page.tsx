"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import CountUp from "react-countup";
import { toPng } from "html-to-image";
import { ensureAnonymousUser, insertPointEvent, insertRecord, isSupabaseConfigured } from "@/lib/supabase";

type RecordItem = {
  category?: string;
  reason: string;
  amount: number;
  date: string;
};

type Milestone = {
  percent: number;
  amount: number;
  key: string;
  reached: boolean;
  claimed: boolean;
};

type RewardResult = {
  amount: number;
};

type RevealStage = "info" | "base" | "ad-loading" | "upgraded";

const POINTS_STORAGE_KEY = "bang_points";
const CLAIMED_STORAGE_KEY = "bang_claimed_milestones";
const RECORDS_STORAGE_KEY = "records";
const GOAL_STORAGE_KEY = "bang_goal";
const GOAL_LOCKED_STORAGE_KEY = "bang_goal_locked";
const USER_ID_STORAGE_KEY = "bang_eojoong_user_id";
const MILESTONE_PERCENTAGES = [10, 25, 40, 55, 70, 85, 100];
const FALLBACK_CATEGORY_EMOJI = "💸";
const SINGLE_ENTRY_LIMIT = 20000;
const DAILY_REWARD_CAP = 50000;

const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const drawBaseReward = (): RewardResult => ({ amount: getRandomInt(2, 5) });
const drawUpgradedReward = (): number => getRandomInt(4, 10);

export default function Home() {
  const mounted = useSyncExternalStore(() => () => { }, () => true, () => false);
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
  const [revealStage, setRevealStage] = useState<RevealStage>("info");
  const [isAnimatingReward, setIsAnimatingReward] = useState(false);
  const [baseReward, setBaseReward] = useState<RewardResult | null>(null);
  const [finalRewardPoint, setFinalRewardPoint] = useState(0);
  const [isAdUpgraded, setIsAdUpgraded] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const [userId] = useState(() => {
    if (typeof window === "undefined") return "";
    const savedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
    const nextUserId = savedUserId || `user_${Math.random().toString(36).slice(2, 10)}`;
    if (!savedUserId) localStorage.setItem(USER_ID_STORAGE_KEY, nextUserId);
    return nextUserId;
  });
  const captureRef = useRef<HTMLDivElement>(null);

  ;

  useEffect(() => {
    if (!mounted || !toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 1700);
    return () => clearTimeout(timer);
  }, [mounted, toastMessage]);


  useEffect(() => {
    if (!mounted || !userId || !isSupabaseConfigured) return;
    void ensureAnonymousUser(userId);
  }, [mounted, userId]);
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

  const today = new Date().toLocaleDateString("ko-KR");
  const totalAmount = records.reduce((sum, record) => sum + record.amount, 0);
  const todayRecords = records.filter((record) => record.date === today);
  const todayAmount = todayRecords.reduce((sum, record) => sum + record.amount, 0);
  const eligibleTodayAmount = Math.min(todayAmount, DAILY_REWARD_CAP);
  const oldRecords = records.filter((record) => record.date !== today);
  const hasTodayRecord = todayRecords.length > 0;
  const parsedGoal = Number(goal);
  const hasValidGoal = parsedGoal > 0;
  const goalReady = goalLocked && hasValidGoal;
  const progress = goalReady ? Math.min((todayAmount / parsedGoal) * 100, 100) : 0;

  const milestones: Milestone[] = !goalReady ? [] : MILESTONE_PERCENTAGES.map((percent) => {
    const milestoneAmount = Math.round((parsedGoal * percent) / 100);
    const cappedMilestoneAmount = Math.min(milestoneAmount, DAILY_REWARD_CAP);
    const key = `${today}-${parsedGoal}-${milestoneAmount}`;
    return { percent, amount: milestoneAmount, key, reached: eligibleTodayAmount >= cappedMilestoneAmount, claimed: Boolean(claimedMilestones[key]) };
  });

  const goalMessage = progress >= 100 ? "오늘 소비 방어 성공 🔥" : progress >= 80 ? "거의 다 왔어요. 조금만 더 방어해요" : progress >= 50 ? "절반 넘게 방어했어요" : progress > 0 ? "좋은 시작이에요" : "오늘 첫 방어를 기록해보세요 🔥";
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
    if (uniqueDates.includes(compareDate.toLocaleDateString("ko-KR"))) streak++;
    else break;
  }

  const addRecord = async () => {
    if (!reason || !amount) return;
    const numericAmount = Number(amount.replace(/,/g, ""));
    if (numericAmount > SINGLE_ENTRY_LIMIT) {
      setToastMessage("한 번에 너무 큰 금액은 기록할 수 없어요");
      return;
    }
    const newRecord = { category, reason, amount: numericAmount, date: today };
    setRecords([newRecord, ...records]);
    setReason("");
    setAmount("");
  };

  const deleteRecord = (indexToDelete: number) => setRecords(records.filter((_, index) => index !== indexToDelete));
  const openGoalModal = () => {
    setGoalDraft(goal ? Number(goal).toLocaleString() : "");
    setIsGoalModalOpen(true);
  };

  const saveGoal = () => {
    const numericGoal = Number(goalDraft.replace(/,/g, ""));
    if (!numericGoal || Number.isNaN(numericGoal)) return;
    setGoal(String(numericGoal));
    setGoalLocked(true);
    setIsGoalModalOpen(false);
  };

  const openMilestone = (milestone: Milestone) => {
    const isClaimable = milestone.reached && !milestone.claimed;
    setSelectedMilestone(milestone);
    setIsAnimatingReward(false);
    setIsAdUpgraded(false);

    if (isClaimable) {
      const result = drawBaseReward();
      setBaseReward(result);
      setFinalRewardPoint(result.amount);
      setRevealStage("base");
      setPoints((prev) => prev + result.amount);
      if (userId && isSupabaseConfigured) {
        void insertPointEvent({
          user_id: userId,
          event_type: "milestone_claim",
          points: result.amount,
          metadata: { milestone_key: milestone.key, percent: milestone.percent },
          occurred_at: new Date().toISOString(),
        });
      }
      setClaimedMilestones((prev) => ({ ...prev, [milestone.key]: true }));
      setIsAnimatingReward(true);
      setTimeout(() => setIsAnimatingReward(false), 650);
      return;
    }

    setRevealStage("info");
    setBaseReward(null);
    setFinalRewardPoint(0);
  };

  const upgradeRewardWithAd = async () => {
    if (!selectedMilestone || !baseReward || isAnimatingReward || isAdUpgraded) return;
    setRevealStage("ad-loading");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsAnimatingReward(true);
    const upgraded = Math.max(baseReward.amount * 2, drawUpgradedReward());
    const extraPoint = upgraded - baseReward.amount;
    if (extraPoint > 0) setPoints((prev) => prev + extraPoint);
    setFinalRewardPoint(upgraded);
    setRevealStage("upgraded");
    setIsAdUpgraded(true);
    setTimeout(() => setIsAnimatingReward(false), 650);
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

  return <main className="min-h-screen bg-[#0B1020] text-white px-4 py-6 relative">
    {toastMessage && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] bg-black/80 border border-white/20 px-4 py-2 rounded-xl text-sm">{toastMessage}</div>}
    {selectedMilestone && <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-gradient-to-b from-[#1b2649] to-[#10172e] p-5 shadow-[0_0_60px_rgba(124,255,91,0.2)]">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-1">Reward Box</p>
        <p className="text-lg font-bold mb-4">{selectedMilestone.percent}% Milestone 🎁</p>

        {revealStage === "info" && <>
          <div className="space-y-1 text-sm text-gray-300 mb-5">
            <p>기준 금액: <span className="text-white font-semibold">{selectedMilestone.amount.toLocaleString()}원</span></p>
            <p>현재 방어 금액: <span className="text-white font-semibold">{todayAmount.toLocaleString()}원</span></p>
            <p>부족한 금액: <span className="text-[#7CFF5B] font-semibold">{remainingForSelected.toLocaleString()}원</span></p>
          </div>
          <button onClick={() => setSelectedMilestone(null)} className="w-full py-3 rounded-2xl font-semibold bg-white text-black active:scale-95">확인</button>
        </>}

        {(revealStage === "base" || revealStage === "upgraded") && <>
          <div className="mb-5 rounded-3xl p-6 text-center border border-[#7CFF5B]/40 bg-black/30">
            <p className="text-2xl font-bold mb-3 text-[#7CFF5B]">보상 획득!</p>
            <div className={`text-6xl font-black ${isAnimatingReward ? "animate-bounce" : ""} text-[#7CFF5B] drop-shadow-[0_0_12px_rgba(124,255,91,0.9)]`}>
              +<CountUp key={`${revealStage}-${finalRewardPoint}`} end={finalRewardPoint} duration={0.8} />P
            </div>
            <p className="text-xs text-gray-400 mt-3">🎉 ✨ 🎉</p>
          </div>
          {revealStage === "base" && <button onClick={upgradeRewardWithAd} className="w-full py-3 rounded-2xl font-semibold bg-white text-black active:scale-95">광고 보고 2배 받기</button>}
          {revealStage === "upgraded" && <p className="text-center text-sm text-[#7CFF5B] mb-3">업그레이드 완료! 더 큰 보상을 획득했어요</p>}
          <button onClick={() => setSelectedMilestone(null)} className="w-full mt-3 py-3 rounded-2xl font-semibold bg-[#7CFF5B] text-black active:scale-95">확인</button>
        </>}

        {revealStage === "ad-loading" && <div className="py-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-white/20 border-t-[#7CFF5B] animate-spin mb-4" />
          <p className="text-lg font-semibold mb-1">영상 확인 중...</p>
          <p className="text-sm text-gray-400">광고 보상을 계산하고 있어요</p>
        </div>}

        {revealStage === "ad-loading" && <button onClick={() => !isAnimatingReward && setSelectedMilestone(null)} className="w-full mt-3 py-3 rounded-2xl text-gray-400">닫기</button>}
      </div>
    </div>}
    {isGoalModalOpen && <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#10172e] p-5">
        <h2 className="text-lg font-bold mb-1">오늘 목표 설정</h2>
        <p className="text-sm text-gray-400 mb-4">오늘 지키고 싶은 금액을 입력해 주세요.</p>
        <input type="text" value={goalDraft} onChange={(e) => {
          const value = e.target.value.replace(/,/g, "");
          if (!Number.isNaN(Number(value))) setGoalDraft(value ? Number(value).toLocaleString() : "");
        }} placeholder="예: 30,000" className="w-full bg-transparent border border-white/10 rounded-2xl px-4 py-3 mb-4 outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setIsGoalModalOpen(false)} className="w-full py-3 rounded-2xl font-semibold bg-white/10 text-white">취소</button>
          <button onClick={saveGoal} disabled={!Number(goalDraft.replace(/,/g, ""))} className={`w-full py-3 rounded-2xl font-semibold ${Number(goalDraft.replace(/,/g, "")) ? "bg-[#7CFF5B] text-black active:scale-95" : "bg-white/5 text-gray-500"}`}>저장</button>
        </div>
      </div>
    </div>}

    <div className="max-w-md mx-auto">
      <div ref={captureRef} className="text-center mb-7 mt-3 bg-[#0B1020] px-2 py-4 rounded-3xl"><div className="bg-white/5 rounded-3xl p-6">
        <div className="flex justify-end mb-4"><div className="bg-[#7CFF5B]/20 text-[#7CFF5B] px-3 py-1 rounded-full text-sm font-semibold">현재 포인트 {mounted ? points.toLocaleString() : "0"}P</div></div>
        <div className="mb-6"><p className="text-sm text-gray-400 mb-2">오늘 지켜낸 돈</p><h1 className="text-6xl font-bold mb-3">{hasTodayRecord ? <>₩<CountUp end={todayAmount} duration={0.5} separator="," /></> : "-"}</h1>{!hasTodayRecord && <div className="bg-white/5 rounded-2xl px-4 py-4"><p className="font-semibold mb-1">아직 오늘 방어한 돈이 없어요</p><p className="text-sm text-gray-400">오늘 첫 방어를 기록해보세요 🔥</p></div>}</div>
        <p className="text-sm text-left mb-3 text-[#b8ffa6]">오늘 {todayAmount.toLocaleString()}원 방어중 🔥</p>
        {todayAmount >= DAILY_REWARD_CAP && <p className="text-sm text-left mb-3 text-[#7CFF5B] font-semibold">오늘 방어 한도 달성 🎉</p>}
        <div className="space-y-4 mb-5"><div className="bg-white/5 rounded-2xl p-4"><div className="flex items-center justify-between mb-2"><p className="text-sm text-gray-400">오늘 목표</p><p className={`text-sm ${goalReady ? "text-green-400" : "text-gray-500"}`}>{goalReady ? `${progress.toFixed(0)}%` : "설정 전"}</p></div><button onClick={openGoalModal} className="w-full text-left bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-3 transition active:scale-[0.99]"><p className={`font-semibold ${goalReady ? "text-white" : "text-gray-300"}`}>{goalReady ? `오늘 목표 ₩${parsedGoal.toLocaleString()}` : "오늘은 얼마나 방어할까요?"}</p></button><div className={`w-full h-3 rounded-full overflow-hidden mb-3 ${goalReady ? "bg-white/10" : "bg-white/5"}`}><div className={`h-full transition-all ${goalReady ? "bg-[#7CFF5B]" : "bg-white/20"}`} style={{ width: `${progress}%` }} /></div>

          {goalReady && <div className="mb-4"><div className="milestone-scroll flex gap-2 overflow-x-auto pb-2 pr-1 snap-x snap-mandatory">{milestones.map((m) => {
            const shortStatus = m.claimed ? "완료" : m.reached ? "열림" : "잠김";
            return <button key={m.key} onClick={() => openMilestone(m)} className={`min-w-[78px] snap-start flex-shrink-0 rounded-2xl border px-3 py-3 text-left transition ${m.claimed ? "border-emerald-300/40 bg-emerald-400/10" : m.reached ? "border-[#7CFF5B]/50 bg-[#7CFF5B]/10 shadow-[0_0_20px_rgba(124,255,91,0.3)] animate-pulse" : "border-white/10 bg-white/5 opacity-55"}`} aria-label={`${m.percent}% milestone`}><div className="flex items-center justify-between"><span className={`text-lg leading-none ${m.reached && !m.claimed ? "drop-shadow-[0_0_10px_rgba(124,255,91,0.8)]" : ""}`}>{m.claimed ? "✅" : "🎁"}</span><span className={`text-[11px] font-semibold ${m.reached ? "text-gray-200" : "text-gray-500"}`}>{m.percent}%</span></div><span className={`mt-2 block text-[11px] font-medium ${m.claimed ? "text-emerald-200" : m.reached ? "text-[#b8ffa6]" : "text-gray-500"}`}>{shortStatus}</span></button>;
          })}</div></div>}

          {goalReady && goalAchieved && <div className="bg-[#7CFF5B] text-black rounded-2xl p-5 mt-4"><p className="text-2xl font-bold mb-1">🎉 목표 달성!</p><p>{goalMessage}</p></div>}
          <div className="mt-3 space-y-1 text-left text-xs text-gray-500">
            <p>포인트 인정은 하루 최대 50,000원까지 가능해요</p>
            <p>목표를 설정하면 진행률과 보상이 열려요</p>
          </div>
        </div>
          <div className="grid grid-cols-2 gap-3"><div className="bg-white/5 rounded-2xl p-4 text-left"><p className="text-sm text-gray-400 mb-1">이번 달</p><p className="text-xl font-bold">₩{totalAmount.toLocaleString()}</p></div><div className="bg-white/5 rounded-2xl p-4 text-left"><p className="text-sm text-gray-400 mb-1">연속 방어</p><p className="text-xl font-bold text-green-400">🔥 {streak}일</p></div></div>
          <div className="bg-white/5 rounded-2xl p-4 text-left"><p className="text-sm text-gray-400 mb-1">가장 많이 참은 소비</p><p className="text-xl font-bold">{topCategory}</p></div>
        </div></div></div>

      <div className="bg-white/5 p-5 rounded-3xl mb-6">
        <div className="grid grid-cols-4 gap-2 mb-4">{["☕", "🍔", "🚕", "🛍"].map((item) => <button key={item} onClick={() => setCategory(item)} className={`py-3 rounded-2xl text-xl ${category === item ? "bg-[#7CFF5B] text-black" : "bg-white/10 text-white"}`}>{item}</button>)}</div>
        <input type="text" placeholder="뭘 참았나요?" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full bg-transparent border border-white/10 rounded-2xl px-4 py-3 mb-4 outline-none" />
        <input type="text" placeholder="얼마를 지켰나요?" value={amount} onChange={(e) => { const value = e.target.value.replace(/,/g, ""); if (!isNaN(Number(value))) setAmount(Number(value).toLocaleString()); }} onKeyDown={(e) => { if (e.key === "Enter" && reason && amount) addRecord(); }} className="w-full bg-transparent border border-white/10 rounded-2xl px-4 py-3 mb-2 outline-none" />
        <p className="text-xs text-gray-500 mb-4">1회 최대 기록 가능 금액: 20,000원</p>
        <button onClick={addRecord} disabled={!reason || !amount} className={`w-full font-semibold py-4 rounded-2xl transition-all duration-200 ${!reason || !amount ? "bg-white/10 text-gray-500" : "bg-[#7CFF5B] text-black active:scale-95"}`}>+ 방어 기록하기</button>
        <button onClick={shareImage} className="w-full mt-3 bg-white/10 text-white py-4 rounded-2xl">공유 이미지 저장하기</button>
      </div>

      <div className="space-y-3">{todayRecords.length > 0 && <div className="mb-6"><p className="text-sm text-gray-400 mb-3">오늘</p><div className="space-y-3">{todayRecords.map((record, index) => <div key={index} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between"><div><p className="font-semibold">{getSafeCategory(record)} {record.reason}</p><p className="text-sm text-gray-400">{record.date}</p></div><div className="flex items-center gap-3"><p className="text-green-400 font-bold">₩{record.amount.toLocaleString()}</p><button onClick={() => deleteRecord(index)} className="text-red-400">✕</button></div></div>)}</div></div>}
        {oldRecords.length > 0 && <div><p className="text-sm text-gray-400 mb-3">이전 기록</p><div className="space-y-3">{oldRecords.map((record, index) => <div key={index} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between"><div><p className="font-semibold">{getSafeCategory(record)} {record.reason}</p><p className="text-sm text-gray-400">{record.date}</p></div><p className="text-green-400 font-bold">₩{record.amount.toLocaleString()}</p></div>)}</div></div>}</div>
    </div>
  </main>;
}
