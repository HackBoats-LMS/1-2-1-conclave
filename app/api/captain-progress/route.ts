import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "CAPTAIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      roundId,
      tableId,
      currentPhase,
      activeSpeakerId,
      speakerType,
      speakerEndTime,
      pitchedUserIds,
      referredUserIds,
    } = body;

    if (!roundId || !tableId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const data: any = {};
    if (currentPhase !== undefined) data.currentPhase = currentPhase;
    if (activeSpeakerId !== undefined) data.activeSpeakerId = activeSpeakerId;
    if (speakerType !== undefined) data.speakerTimerType = speakerType;
    if (speakerEndTime !== undefined) {
      data.speakerEndTime = speakerEndTime ? new Date(speakerEndTime) : null;
    }
    if (pitchedUserIds !== undefined) data.pitchedUserIds = pitchedUserIds;
    if (referredUserIds !== undefined) data.referredUserIds = referredUserIds;

    const progress = await prisma.roundProgress.upsert({
      where: {
        tableId: tableId,
      },
      update: data,
      create: {
        tableId,
        currentPhase: currentPhase || 1,
        activeSpeakerId: activeSpeakerId || null,
        speakerTimerType: speakerType || null,
        speakerEndTime: speakerEndTime ? new Date(speakerEndTime) : null,
        pitchedUserIds: pitchedUserIds || [],
        referredUserIds: referredUserIds || [],
      },
    });

    return NextResponse.json({ success: true, progress });
  } catch (error: any) {
    console.error("Failed to update round progress", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
