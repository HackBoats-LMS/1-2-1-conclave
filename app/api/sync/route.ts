import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const getCachedState = unstable_cache(
  async () => {
    const gameState = await prisma.gameState.findFirst();
    const rounds = await prisma.round.findMany({
      include: { slot: true },
      orderBy: { roundNumber: 'asc' },
    });
    return { gameState, rounds };
  },
  ['api-sync-state'],
  { tags: ['global-state'], revalidate: 10 }
);

export async function GET() {
  try {
    const data = await getCachedState();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Sync API Error:", error);
    return NextResponse.json({ error: "Failed to sync state" }, { status: 500 });
  }
}
