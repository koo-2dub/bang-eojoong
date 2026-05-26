"use client";

import { useEffect, useState } from "react";
import CountUp from "react-countup";

export default function Home() {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const [records, setRecords] = useState<
  { reason: string; amount: number; date: string }[]
>([]);
useEffect(() => {
  const savedRecords = localStorage.getItem("records");

  if (savedRecords) {
    setRecords(JSON.parse(savedRecords));
  }
}, []);

useEffect(() => {
  localStorage.setItem(
    "records",
    JSON.stringify(records)
  );
}, [records]);
  const addRecord = () => {
    if (!reason || !amount) return;

    const newRecord = {
  reason,
  amount: Number(amount.replace(/,/g, "")),
date: new Date().toLocaleDateString("ko-KR"),
};

    setRecords([newRecord, ...records]);

    setReason("");
    setAmount("");
  };

  const totalAmount = records.reduce(
    (sum, record) => sum + record.amount,
    0
  );
  const today = new Date().toLocaleDateString("ko-KR");

const todayRecords = records.filter(
  (record) => record.date === today
);

const oldRecords = records.filter(
  (record) => record.date !== today
);
const uniqueDates = [
  ...new Set(records.map((record) => record.date)),
];

const sortedDates = uniqueDates.sort(
  (a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
);

let streak = 0;

for (let i = 0; i < sortedDates.length; i++) {
  const currentDate = new Date(sortedDates[i]);

  const compareDate = new Date();
  compareDate.setDate(compareDate.getDate() - i);

  const current = currentDate.toLocaleDateString("ko-KR");
  const compare = compareDate.toLocaleDateString("ko-KR");

  if (current === compare) {
    streak++;
  } else {
    break;
  }
}
  const deleteRecord = (indexToDelete: number) => {
  const updatedRecords = records.filter(
    (_, index) => index !== indexToDelete
  );

  setRecords(updatedRecords);
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
          <div className="text-center mb-10 mt-10">

            <p className="text-sm text-gray-400 mb-2">
              오늘 지켜낸 돈
            </p>

            <h1 className="text-6xl font-bold mb-3">
  ₩
  <CountUp
    end={totalAmount}
    duration={0.5}
    separator=","
  />
</h1>

        <div className="flex items-center justify-center gap-2 text-green-400">

  <p>
    방어중
  </p>

  <p>
    🔥 {streak}일 연속
  </p>

</div>

          </div>
        )}

        <div className="bg-white/5 p-5 rounded-3xl mb-6">

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
}}  onKeyDown={(e) => {
    if (
      e.key === "Enter" &&
      reason &&
      amount
    ) {
      addRecord();
    }
  }}
  className="w-full bg-transparent border border-white/10 rounded-2xl px-4 py-3 mb-4 outline-none"
/>

          <button
  onClick={addRecord}
  disabled={!reason || !amount}
  className={`w-full font-semibold py-4 rounded-2xl transition-all duration-200 ${
    !reason || !amount
      ? "bg-white/10 text-gray-500"
      : "bg-[#7CFF5B] text-black active:scale-95"
  }`}
>
  + 방어 기록하기
</button>

        </div>

        <div className="space-y-3">

  {records.length > 0 && (
    <p className="text-sm text-gray-400 mb-2">
      오늘의 방어 기록
    </p>
  )}
{todayRecords.length > 0 && (
  <div className="mb-6">

    <p className="text-sm text-gray-400 mb-3">
      오늘
    </p>

    <div className="space-y-3">
      {todayRecords.map((record, index) => (
        <div
          key={index}
          className="bg-white/5 rounded-2xl p-4 flex items-center justify-between"
        >

          <div>
            <p className="font-semibold">
              {record.reason}
            </p>

            <p className="text-sm text-gray-400">
              {record.date}
            </p>
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

    <p className="text-sm text-gray-400 mb-3">
      이전 기록
    </p>

    <div className="space-y-3">
      {oldRecords.map((record, index) => (
        <div
          key={index}
          className="bg-white/5 rounded-2xl p-4 flex items-center justify-between"
        >

          <div>
            <p className="font-semibold">
              {record.reason}
            </p>

            <p className="text-sm text-gray-400">
              {record.date}
            </p>
          </div>

          <div className="flex items-center gap-3">

            <p className="text-green-400 font-bold">
              ₩{record.amount.toLocaleString()}
            </p>

          </div>

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
