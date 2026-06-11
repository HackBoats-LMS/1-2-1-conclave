import { prisma } from "@/lib/prisma";
import { AdminReferralsDownloadClient } from "./AdminReferralsDownloadClient";
import { UserSearchFilter } from "../UserSearchFilter";
import { Suspense } from "react";
import { LiveReferralsTotalBadge } from "./LiveReferralsTotalBadge";

export const dynamic = "force-dynamic";

export default async function AdminReferralsDownloadPage({ searchParams }: { searchParams?: Promise<{ search?: string }> }) {
  const { search } = (await searchParams) ?? {};
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["USER", "CAPTAIN"] },
      onboardingCompleted: true,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { businessName: { contains: search, mode: "insensitive" } },
          { businessCategory: { contains: search, mode: "insensitive" } },
        ]
      } : {})
    },
    select: {
      id: true,
      name: true,
      email: true,
      businessName: true,
      businessCategory: true,
      role: true,
      receivedReferrals: {
        orderBy: { createdAt: "desc" },
        include: {
          fromUser: {
            select: {
              name: true,
              email: true,
              businessName: true,
              businessCategory: true,
              contactNumber: true,
            },
          },
        },
      },
    },
    orderBy: { receivedReferrals: { _count: "desc" } },
  });

  const totalReferrals = users.reduce((a, u) => a + u.receivedReferrals.length, 0);

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#0D2421] p-4 md:p-8 font-sans selection:bg-[#BEF03C]/40 relative overflow-x-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#0d2421_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>

      <div className="max-w-6xl mx-auto relative z-10 space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between bg-white border-2 border-[#0D2421] p-5 md:p-6 rounded-3xl shadow-[4px_4px_0px_#0D2421] gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#0D2421] rounded-xl flex items-center justify-center shadow-[3px_3px_0px_#BEF03C] shrink-0">
              <span className="text-xl">📥</span>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0D2421] text-[#BEF03C] rounded-full text-[9px] font-black tracking-widest uppercase mb-1">
                ADMIN TOOL
              </div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none">
                Referrals Leaderboard
              </h1>
              <p className="text-[10px] font-bold text-[#0D2421]/50 uppercase tracking-wider mt-0.5">
                Ranked by received referrals · Download PDF for any participant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <LiveReferralsTotalBadge initialTotal={totalReferrals} />
            <div className="flex flex-col items-center bg-[#FAF8F4] border-2 border-[#0D2421] px-5 py-3 rounded-2xl shadow-[3px_3px_0px_#0D2421]">
              <span className="text-3xl font-black leading-none">{users.length}</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-[#0D2421]/60 mt-0.5">Participants</span>
            </div>
          </div>
        </header>

        <Suspense><UserSearchFilter /></Suspense>

        {/* Top 3 podium */}
        {users.length >= 3 && (
          <div className="grid grid-cols-3 gap-4">
            {/* 2nd place */}
            <div className="bg-white border-2 border-[#0D2421] rounded-3xl p-5 shadow-[4px_4px_0px_#0D2421] flex flex-col items-center gap-3 mt-8">
              <div className="w-10 h-10 bg-slate-200 border-2 border-[#0D2421] rounded-xl flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_#0D2421]">2</div>
              <div className="w-14 h-14 bg-[#BEF03C] border-2 border-[#0D2421] rounded-2xl flex items-center justify-center font-black text-2xl shadow-[2px_2px_0px_#0D2421]">
                {users[1].name?.charAt(0) || users[1].email?.charAt(0) || "?"}
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="font-black text-sm uppercase truncate">{users[1].name || users[1].email?.split("@")[0]}</p>
                <p className="text-[9px] font-bold text-[#0D2421]/50 uppercase truncate">{users[1].businessCategory || "Participant"}</p>
              </div>
              <div className="text-3xl font-black">{users[1].receivedReferrals.length}</div>
              <AdminReferralsDownloadClient
                userName={users[1].name || users[1].email?.split("@")[0] || "User"}
                referrals={users[1].receivedReferrals.map(r => ({ createdAt: r.createdAt, note: r.note, fromUser: r.fromUser }))}
              />
            </div>

            {/* 1st place */}
            <div className="bg-[#BEF03C]/20 border-2 border-[#0D2421] rounded-3xl p-5 shadow-[6px_6px_0px_#0D2421] flex flex-col items-center gap-3 ring-4 ring-amber-400/40">
              <div className="w-12 h-12 bg-amber-400 border-2 border-[#0D2421] rounded-xl flex items-center justify-center font-black text-xl shadow-[2px_2px_0px_#0D2421]">🏆</div>
              <div className="w-16 h-16 bg-[#0D2421] border-2 border-[#0D2421] rounded-2xl flex items-center justify-center font-black text-3xl text-[#BEF03C] shadow-[3px_3px_0px_#BEF03C]">
                {users[0].name?.charAt(0) || users[0].email?.charAt(0) || "?"}
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="font-black text-base uppercase truncate">{users[0].name || users[0].email?.split("@")[0]}</p>
                <p className="text-[9px] font-bold text-[#0D2421]/50 uppercase truncate">{users[0].businessCategory || "Participant"}</p>
              </div>
              <div className="text-4xl font-black">{users[0].receivedReferrals.length}</div>
              <AdminReferralsDownloadClient
                userName={users[0].name || users[0].email?.split("@")[0] || "User"}
                referrals={users[0].receivedReferrals.map(r => ({ createdAt: r.createdAt, note: r.note, fromUser: r.fromUser }))}
              />
            </div>

            {/* 3rd place */}
            <div className="bg-white border-2 border-[#0D2421] rounded-3xl p-5 shadow-[4px_4px_0px_#0D2421] flex flex-col items-center gap-3 mt-8">
              <div className="w-10 h-10 bg-orange-400 border-2 border-[#0D2421] rounded-xl flex items-center justify-center font-black text-lg text-white shadow-[2px_2px_0px_#0D2421]">3</div>
              <div className="w-14 h-14 bg-[#BEF03C] border-2 border-[#0D2421] rounded-2xl flex items-center justify-center font-black text-2xl shadow-[2px_2px_0px_#0D2421]">
                {users[2].name?.charAt(0) || users[2].email?.charAt(0) || "?"}
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="font-black text-sm uppercase truncate">{users[2].name || users[2].email?.split("@")[0]}</p>
                <p className="text-[9px] font-bold text-[#0D2421]/50 uppercase truncate">{users[2].businessCategory || "Participant"}</p>
              </div>
              <div className="text-3xl font-black">{users[2].receivedReferrals.length}</div>
              <AdminReferralsDownloadClient
                userName={users[2].name || users[2].email?.split("@")[0] || "User"}
                referrals={users[2].receivedReferrals.map(r => ({ createdAt: r.createdAt, note: r.note, fromUser: r.fromUser }))}
              />
            </div>
          </div>
        )}

        {/* Rest of the list */}
        <div className="bg-white border-2 border-[#0D2421] rounded-3xl shadow-[6px_6px_0px_#0D2421] overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b-2 border-[#0D2421] bg-[#FAF8F4]">
            <h3 className="text-lg font-black uppercase tracking-wide">All Participants</h3>
            <span className="text-[9px] font-black bg-[#0D2421] text-[#BEF03C] px-2 py-1 rounded-lg uppercase tracking-widest">Ranked</span>
          </div>

          <div className="divide-y-2 divide-[#0D2421]/10">
            {users.map((user, index) => (
              <div key={user.id} className="flex items-center gap-4 p-4 md:p-5 hover:bg-[#FAF8F4]/60 transition-colors">
                {/* Rank */}
                <div className={`w-9 h-9 rounded-xl border-2 border-[#0D2421] flex items-center justify-center font-black text-sm shrink-0 shadow-[2px_2px_0px_#0D2421] ${
                  index === 0 ? "bg-amber-400" : index === 1 ? "bg-slate-200" : index === 2 ? "bg-orange-400 text-white" : "bg-[#FAF8F4]"
                }`}>
                  {index === 0 ? "🏆" : index + 1}
                </div>

                {/* Avatar */}
                <div className={`w-11 h-11 rounded-2xl border-2 border-[#0D2421] flex items-center justify-center font-black text-lg shrink-0 shadow-[2px_2px_0px_#0D2421] ${
                  user.role === "CAPTAIN" ? "bg-amber-400" : "bg-[#BEF03C]"
                }`}>
                  {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm uppercase truncate">
                      {user.name || user.email?.split("@")[0]}
                    </span>
                    {user.role === "CAPTAIN" && (
                      <span className="text-[8px] font-black bg-amber-400 border border-[#0D2421] px-1.5 py-0.5 rounded uppercase shrink-0">👑 Captain</span>
                    )}
                  </div>
                  <p className="text-[9px] font-bold text-[#0D2421]/50 uppercase tracking-wide truncate">
                    {user.businessCategory || "Participant"}{user.businessName ? ` · ${user.businessName}` : ""}
                  </p>
                </div>

                {/* Count */}
                <div className="flex flex-col items-center shrink-0 bg-[#FAF8F4] border-2 border-[#0D2421] px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_#0D2421] min-w-[56px]">
                  <span className="text-xl font-black leading-none">{user.receivedReferrals.length}</span>
                  <span className="text-[7px] font-black uppercase tracking-widest text-[#0D2421]/50">rcvd</span>
                </div>

                {/* Download */}
                <AdminReferralsDownloadClient
                  userName={user.name || user.email?.split("@")[0] || "User"}
                  referrals={user.receivedReferrals.map(r => ({
                    createdAt: r.createdAt,
                    note: r.note,
                    fromUser: r.fromUser,
                  }))}
                />
              </div>
            ))}

            {users.length === 0 && (
              <div className="py-16 text-center">
                <p className="font-black text-sm uppercase text-[#0D2421]/40">No onboarded participants yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
