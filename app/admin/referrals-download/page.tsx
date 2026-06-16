import { prisma } from "@/lib/prisma";
import { UserSearchFilter } from "../UserSearchFilter";
import { Suspense } from "react";
import { LiveReferralsTotalBadge, LiveReferralsContent } from "./LiveReferralsTotalBadge";

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
    orderBy: { receivedReferralsCount: "desc" },
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
            <LiveReferralsTotalBadge initialTotal={totalReferrals} initialUsers={users} />
            <div className="flex flex-col items-center bg-[#FAF8F4] border-2 border-[#0D2421] px-5 py-3 rounded-2xl shadow-[3px_3px_0px_#0D2421]">
              <span className="text-3xl font-black leading-none">{users.length}</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-[#0D2421]/60 mt-0.5">Participants</span>
            </div>
          </div>
        </header>

        <Suspense><UserSearchFilter /></Suspense>

        <LiveReferralsContent initialTotal={totalReferrals} initialUsers={users} />

      </div>
    </div>
  );
}
