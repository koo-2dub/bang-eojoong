"use client";

import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { toPng } from "html-to-image";
import { useRef } from "react";

type RecordItem = {
  category: string;
  reason: string;
  amount: number;
  date: string;
};

export default function Home() {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("☕");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [goal, setGoal] = useState("");
  const [goalLocked, setGoalLocked] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedRecords = localStorage.getItem("records");
    if (savedRecords) {
      setRecords(JSON.parse(savedRecords));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("records", JSON.stringify(records));
  }, [records]);

  const today = new Date().toLocaleDateString("ko-KR");

  const addRecord = () => {
    if (!reason || !amount) return;

    const newRecord = {
      category,
      reason,
      amount: Number(amount.replace(/,/g, "")),
      date: today,
    };

    setRecords([newRecord, ...records]);
    setReason("");
    setAmount("");
  };

  const totalAmount = records.reduce((sum, record) => sum + record.amount, 0);

  const monthlyAmount = totalAmount;
  const parsedGoal = Number(goal);
  const hasValidGoal = parsedGoal > 0;
  const progress = hasValidGoal
    ? Math.min((totalAmount / parsedGoal) * 100, 100)
    : 0;
  const goalMessage =
    progress >= 100
      ? "오늘 소비 방어 성공 🔥"
      : progress >= 80
        ? "거의 다 왔어요. 조금만 더 방어해요"
        : progress >= 50
          ? "절반 넘게 방어했어요"
          : progress > 0
            ? "좋은 시작이에요"
            : "오늘 첫 방어를 기록해보세요";
  const goalAchieved = goalLocked && hasValidGoal && totalAmount >= parsedGoal;
  const todayRecords = records.filter((record) => record.date === today);
  const oldRecords = records.filter((record) => record.date !== today);
  const hasTodayRecord = todayRecords.length > 0;
  const uniqueDates = [...new Set(records.map((record) => record.date))];
  const categoryCount: Record<string, number> = {};

  records.forEach((record) => {
    categoryCount[record.category] =
      (categoryCount[record.category] || 0) + 1;
  });

  const topCategory =
    Object.entries(categoryCount).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "☕";

  let streak = 0;

  for (let i = 0; i < uniqueDates.length; i++) {
    const compareDate = new Date();
    compareDate.setDate(compareDate.getDate() - i);

    const compare = compareDate.toLocaleDateString("ko-KR");

    if (uniqueDates.includes(compare)) {
      streak++;
    } else {
      break;
    }
  }

  const deleteRecord = (indexToDelete: number) => {
    const updatedRecords = records.filter((_, index) => index !== indexToDelete);
    setRecords(updatedRecords);
  };
  const shareImage = async () => {
    if (!captureRef.current) return;

    const image = await toPng(captureRef.current, {
      backgroundColor: "#0B1020",
      cacheBust: true,
    });

    const link = document.createElement("a");
    link.href = image;
    link.download = "bang-eojoong.png";
    link.click();
  };
  return (
    <main className="min-h-screen bg-[#0B1020] text-white p-6">
      <div className="max-w-md mx-auto">
        {records.length === 0 ? (
          <div className="text-center mb-10 mt-20">
            <p className="text-2xl font-bold mb-3">
              아직 방어한 돈이 없어요
            </p>
            <p className="text-gray-400">
              오늘 첫 방어를 기록해보세요 🔥
            </p>
          </div>
        ) : (
          <div>
            {!hasTodayRecord && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-5">
                <p className="text-red-400 font-semibold mb-1">
                  🔥 오늘 아직 방어 기록이 없어요
                </p>

                <p className="text-sm text-gray-400">
                  streak가 끊어질 수 있어요
                </p>
              </div>
            )}

            <div
              ref={captureRef}
              className="text-center mb-10 mt-10 bg-[#0B1020] px-8 py-10 rounded-3xl"
            >
              <p className="text-sm text-gray-400 mb-2">
                오늘 지켜낸 돈
              </p>

              <h1 className="text-6xl font-bold mb-5">
                ₩
                <CountUp end={totalAmount} duration={0.5} separator="," />
              </h1>

              <div className="space-y-4 mb-5">
                <div className="bg-white/5 rounded-2xl p-4">

                  <div className="flex items-center justify-between mb-2">

                    <p className="text-sm text-gray-400">
                      오늘 목표
                    </p>

                    <p className="text-sm text-green-400">
                      {progress.toFixed(0)}%
                    </p>

                  </div>
                </div>

                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-3">

                  <div
                    className="h-full bg-[#7CFF5B]"
                    style={{
                      width: `${progress}%`,
                    }}
                  />

                </div>

                <div className="mt-3">
                  <label className="text-sm text-gray-400 block mb-2">
                    목표 금액
                  </label>

                  <div className="flex items-center border border-white/10 rounded-2xl px-4 py-3">
                    <span className="text-gray-400 mr-2">₩</span>

                    <input
                      type="text"
                      value={goal ? Number(goal).toLocaleString() : ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, "");

                        if (!isNaN(Number(value))) {
                          setGoal(value);
                        }
                      }}
                      disabled={goalLocked}
                      className="w-full bg-transparent outline-none text-white"
                    />
                  </div>
                  <button
                    onClick={() => setGoalLocked(true)}
                    disabled={goalLocked || !hasValidGoal}
                    className={`w-full mt-4 py-3 rounded-2xl font-semibold ${goalLocked
                      ? "bg-white/5 text-gray-500"
                      : "bg-[#7CFF5B] text-black active:scale-95"
                      }`}
                  >
                    {goalLocked ? "오늘 목표 설정 완료" : "오늘 목표 설정하기"}
                  </button>
                </div>

                {goalAchieved && (
                  <div className="bg-[#7CFF5B] text-black rounded-2xl p-5 mt-4">

                    <p className="text-2xl font-bold mb-1">
                      🎉 목표 달성!
                    </p>

                    <p>
                      {goalMessage}
                    </p>

                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-2xl p-4 text-left">
                    <p className="text-sm text-gray-400 mb-1">
                      이번 달
                    </p>
                    <p className="text-xl font-bold">
                      ₩{monthlyAmount.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-4 text-left">
                    <p className="text-sm text-gray-400 mb-1">
                      연속 방어
                    </p>
                    <p className="text-xl font-bold text-green-400">
                      🔥 {streak}일
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 text-left">
                  <p className="text-sm text-gray-400 mb-1">
                    가장 많이 참은 소비
                  </p>

                  <p className="text-xl font-bold">
                    {topCategory}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/5 p-5 rounded-3xl mb-6">
          <div className="grid grid-cols-4 gap-2 mb-4">
            {["☕", "🍔", "🚕", "🛍"].map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`py-3 rounded-2xl text-xl ${category === item
                  ? "bg-[#7CFF5B] text-black"
                  : "bg-white/10 text-white"
                  }`}
              >
                {item}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="뭘 참았나요?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-transparent border border-white/10 rounded-2xl px-4 py-3 mb-4 outline-none"
          />

          <input
            type="text"
            placeholder="얼마를 지켰나요?"
            value={amount}
            onChange={(e) => {
              const value = e.target.value.replace(/,/g, "");
              if (!isNaN(Number(value))) {
                setAmount(Number(value).toLocaleString());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && reason && amount) {
                addRecord();
              }
            }}
            className="w-full bg-transparent border border-white/10 rounded-2xl px-4 py-3 mb-4 outline-none"
          />

          <button
            onClick={addRecord}
            disabled={!reason || !amount}
            className={`w-full font-semibold py-4 rounded-2xl transition-all duration-200 ${!reason || !amount
              ? "bg-white/10 text-gray-500"
              : "bg-[#7CFF5B] text-black active:scale-95"
              }`}
          >
            + 방어 기록하기
          </button>
          <button
            onClick={shareImage}
            className="w-full mt-3 bg-white/10 text-white py-4 rounded-2xl"
          >
            공유 이미지 저장하기
          </button>
        </div>

        <div className="space-y-3">
          {todayRecords.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-3">오늘</p>

              <div className="space-y-3">
                {todayRecords.map((record, index) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold">
                        {record.category} {record.reason}
                      </p>
                      <p className="text-sm text-gray-400">{record.date}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="text-green-400 font-bold">
                        ₩{record.amount.toLocaleString()}
                      </p>

                      <button
                        onClick={() => deleteRecord(index)}
                        className="text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {oldRecords.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-3">이전 기록</p>

              <div className="space-y-3">
                {oldRecords.map((record, index) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold">
                        {record.category} {record.reason}
                      </p>
                      <p className="text-sm text-gray-400">{record.date}</p>
                    </div>

                    <p className="text-green-400 font-bold">
                      ₩{record.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
