"use client";

import { useEffect, useState, useRef } from "react";
import { AdminReferralsDownloadClient } from "./AdminReferralsDownloadClient";
import { supabase } from "@/lib/supabaseClient";

export interface ReferralUser {
  id: string;
  name: string | null;
  email: string | null;
  businessName: string | null;
  businessCategory: string | null;
  role: string;
  receivedReferrals: {
    createdAt: Date | string;
    note: string | null;
    fromUser: {
      name: string | null;
      email: string | null;
      businessName: string | null;
      businessCategory: string | null;
      contactNumber: string | null;
    };
  }[];
}

function useLiveReferrals(initialTotal: number, initialUsers: ReferralUser[]) {
  const [total, setTotal] = useState(initialTotal);
  const [users, setUsers] = useState<ReferralUser[]>(initialUsers);
  const totalRef = useRef(initialTotal);
  const isFetchingRef = useRef(false);

  const fetchReferrals = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await fetch("/api/game-state", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.referralUsers) {
        const newTotal = data.referralUsers.reduce(
          (a: number, u: ReferralUser) => a + u.receivedReferrals.length, 0
        );
        totalRef.current = newTotal;
        setTotal(newTotal);
        setUsers(data.referralUsers);
      }
    } catch (_) {
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("leaderboard_page_refresh")
      .on("broadcast", { event: "referral_sent" }, () => {
        setTimeout(fetchReferrals, 500);
      })
      .on("broadcast", { event: "round_state_change" }, () => {
        setTimeout(fetchReferrals, 500);
      })
      .subscribe();

    const fallbackInterval = setInterval(fetchReferrals, 60_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallbackInterval);
    };
  }, []);

  return { total, users };
}

// Just the badge — accepts pre-computed total as prop (no separate poll)
export function LiveReferralsTotalBadge({
  total,
}: {
  total: number;
  initialTotal?: number;
  initialUsers?: ReferralUser[];
}) {
  return (
    <div className="flex flex-col items-center bg-[#BEF03C] border-2 border-[#0D2421] px-5 py-3 rounded-2xl shadow-[3px_3px_0px_#0D2421]">
      <span className="text-3xl font-black leading-none">{total}</span>
      <span className="text-[8px] font-black uppercase tracking-widest text-[#0D2421]/60 mt-0.5">Total Referrals</span>
    </div>
  );
}

// Wrapper that owns the single poll — used by the page to share state with both children
export function LiveReferralsWrapper({
  initialTotal,
  initialUsers,
}: {
  initialTotal: number;
  initialUsers: ReferralUser[];
}) {
  const { total, users } = useLiveReferrals(initialTotal, initialUsers);
  return (
    <>
      <LiveReferralsTotalBadge total={total} />
      <LiveReferralsContent users={users} total={total} />
    </>
  );
}


// Podium + full list — accepts pre-fetched users as props (no separate poll)
export function LiveReferralsContent({
  users,
  total: _total,
  initialTotal,
  initialUsers,
}: {
  users?: ReferralUser[];
  total?: number;
  initialTotal?: number;
  initialUsers?: ReferralUser[];
}) {
  // Fallback: if used standalone (not via LiveReferralsWrapper), initialUsers is used directly
  const resolvedUsers = users ?? initialUsers ?? [];

  return (
    <div className="space-y-6">
      {/* Top 3 podium */}
      {resolvedUsers.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {/* 2nd */}
          <div className="bg-white border-2 border-[#0D2421] rounded-3xl p-5 shadow-[4px_4px_0px_#0D2421] flex flex-col items-center gap-3 mt-8">
            <div className="w-10 h-10 bg-slate-200 border-2 border-[#0D2421] rounded-xl flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_#0D2421]">2</div>
            <div className="w-14 h-14 bg-[#BEF03C] border-2 border-[#0D2421] rounded-2xl flex items-center justify-center font-black text-2xl shadow-[2px_2px_0px_#0D2421]">
              {resolvedUsers[1].name?.charAt(0) || resolvedUsers[1].email?.charAt(0) || "?"}
            </div>
            <div className="text-center min-w-0 w-full">
              <p className="font-black text-sm uppercase truncate">{resolvedUsers[1].name || resolvedUsers[1].email?.split("@")[0]}</p>
              <p className="text-[9px] font-bold text-[#0D2421]/50 uppercase truncate">{resolvedUsers[1].businessCategory || "Participant"}</p>
            </div>
            <div className="text-3xl font-black">{resolvedUsers[1].receivedReferrals.length}</div>
            <AdminReferralsDownloadClient userName={resolvedUsers[1].name || resolvedUsers[1].email?.split("@")[0] || "User"} referrals={resolvedUsers[1].receivedReferrals} />
          </div>

          {/* 1st */}
          <div className="bg-[#BEF03C]/20 border-2 border-[#0D2421] rounded-3xl p-5 shadow-[6px_6px_0px_#0D2421] flex flex-col items-center gap-3 ring-4 ring-amber-400/40">
            <div className="w-12 h-12 bg-amber-400 border-2 border-[#0D2421] rounded-xl flex items-center justify-center font-black text-xl shadow-[2px_2px_0px_#0D2421]">🏆</div>
            <div className="w-16 h-16 bg-[#0D2421] border-2 border-[#0D2421] rounded-2xl flex items-center justify-center font-black text-3xl text-[#BEF03C] shadow-[3px_3px_0px_#BEF03C]">
              {resolvedUsers[0].name?.charAt(0) || resolvedUsers[0].email?.charAt(0) || "?"}
            </div>
            <div className="text-center min-w-0 w-full">
              <p className="font-black text-base uppercase truncate">{resolvedUsers[0].name || resolvedUsers[0].email?.split("@")[0]}</p>
              <p className="text-[9px] font-bold text-[#0D2421]/50 uppercase truncate">{resolvedUsers[0].businessCategory || "Participant"}</p>
            </div>
            <div className="text-4xl font-black">{resolvedUsers[0].receivedReferrals.length}</div>
            <AdminReferralsDownloadClient userName={resolvedUsers[0].name || resolvedUsers[0].email?.split("@")[0] || "User"} referrals={resolvedUsers[0].receivedReferrals} />
          </div>

          {/* 3rd */}
          <div className="bg-white border-2 border-[#0D2421] rounded-3xl p-5 shadow-[4px_4px_0px_#0D2421] flex flex-col items-center gap-3 mt-8">
            <div className="w-10 h-10 bg-orange-400 border-2 border-[#0D2421] rounded-xl flex items-center justify-center font-black text-lg text-white shadow-[2px_2px_0px_#0D2421]">3</div>
            <div className="w-14 h-14 bg-[#BEF03C] border-2 border-[#0D2421] rounded-2xl flex items-center justify-center font-black text-2xl shadow-[2px_2px_0px_#0D2421]">
              {resolvedUsers[2].name?.charAt(0) || resolvedUsers[2].email?.charAt(0) || "?"}
            </div>
            <div className="text-center min-w-0 w-full">
              <p className="font-black text-sm uppercase truncate">{resolvedUsers[2].name || resolvedUsers[2].email?.split("@")[0]}</p>
              <p className="text-[9px] font-bold text-[#0D2421]/50 uppercase truncate">{resolvedUsers[2].businessCategory || "Participant"}</p>
            </div>
            <div className="text-3xl font-black">{resolvedUsers[2].receivedReferrals.length}</div>
            <AdminReferralsDownloadClient userName={resolvedUsers[2].name || resolvedUsers[2].email?.split("@")[0] || "User"} referrals={resolvedUsers[2].receivedReferrals} />
          </div>
        </div>
      )}

      {/* Full ranked list */}
      <div className="bg-white border-2 border-[#0D2421] rounded-3xl shadow-[6px_6px_0px_#0D2421] overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b-2 border-[#0D2421] bg-[#FAF8F4]">
          <h3 className="text-lg font-black uppercase tracking-wide">All Participants</h3>
          <span className="text-[9px] font-black bg-[#0D2421] text-[#BEF03C] px-2 py-1 rounded-lg uppercase tracking-widest">Ranked</span>
        </div>
        <div className="divide-y-2 divide-[#0D2421]/10">
          {resolvedUsers.map((user, index) => (
            <div key={user.id} className="flex items-center gap-4 p-4 md:p-5 hover:bg-[#FAF8F4]/60 transition-colors">
              <div className={`w-9 h-9 rounded-xl border-2 border-[#0D2421] flex items-center justify-center font-black text-sm shrink-0 shadow-[2px_2px_0px_#0D2421] ${index === 0 ? "bg-amber-400" : index === 1 ? "bg-slate-200" : index === 2 ? "bg-orange-400 text-white" : "bg-[#FAF8F4]"}`}>
                {index === 0 ? "🏆" : index + 1}
              </div>
              <div className={`w-11 h-11 rounded-2xl border-2 border-[#0D2421] flex items-center justify-center font-black text-lg shrink-0 shadow-[2px_2px_0px_#0D2421] ${user.role === "CAPTAIN" ? "bg-amber-400" : "bg-[#BEF03C]"}`}>
                {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm uppercase truncate">{user.name || user.email?.split("@")[0]}</span>
                  {user.role === "CAPTAIN" && (
                    <span className="text-[8px] font-black bg-amber-400 border border-[#0D2421] px-1.5 py-0.5 rounded uppercase shrink-0">👑 Captain</span>
                  )}
                </div>
                <p className="text-[9px] font-bold text-[#0D2421]/50 uppercase tracking-wide truncate">
                  {user.businessCategory || "Participant"}{user.businessName ? ` · ${user.businessName}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-center shrink-0 bg-[#FAF8F4] border-2 border-[#0D2421] px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_#0D2421] min-w-[56px]">
                <span className="text-xl font-black leading-none">{user.receivedReferrals.length}</span>
                <span className="text-[7px] font-black uppercase tracking-widest text-[#0D2421]/50">rcvd</span>
              </div>
              <AdminReferralsDownloadClient
                userName={user.name || user.email?.split("@")[0] || "User"}
                referrals={user.receivedReferrals}
              />
            </div>
          ))}
          {resolvedUsers.length === 0 && (
            <div className="py-16 text-center">
              <p className="font-black text-sm uppercase text-[#0D2421]/40">No onboarded participants yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


