"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin, setSuccess, setError, verifyDeletePassword } from "./utils";
import { broadcast } from "@/lib/broadcaster";

export async function startRound(formData: FormData) {
  await requireAdmin();
  const roundId = formData.get("roundId") as string;

  try {
    const round = await prisma.round.findUnique({
      where: { id: roundId }
    });

    const durationMinutesStr = formData.get("durationMinutes");
    let durationMinutes = round?.durationMinutes || 15;
    if (durationMinutesStr && typeof durationMinutesStr === "string") {
      durationMinutes = parseInt(durationMinutesStr, 10);
    }

    // If we are resuming, backdate the startTime so clients calculate the correct elapsed time!
    let newStartTime = new Date();
    if (round?.elapsedSeconds) {
      newStartTime = new Date(Date.now() - round.elapsedSeconds * 1000);
    }

    const updatedRound = await prisma.round.update({
      where: { id: roundId },
      data: {
        status: "IN_PROGRESS",
        startTime: newStartTime,
        durationMinutes
      }
    });

    let updatedGameState = await prisma.gameState.findFirst();
    if (updatedGameState) {
      updatedGameState = await prisma.gameState.update({
        where: { id: updatedGameState.id },
        data: { currentRoundId: roundId }
      });
    } else {
      updatedGameState = await prisma.gameState.create({
        data: { currentRoundId: roundId }
      });
    }

    await broadcast('round_state_change', { action: 'start', round: updatedRound, gameState: updatedGameState });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (e) {
    console.error("Failed to start round", e);
  }
}

export async function stopRound(payload: FormData | string) {
  await requireAdmin();
  try {
    const roundId = typeof payload === "string" ? payload : payload.get("roundId") as string;
    const updatedRound = await prisma.round.update({
      where: { id: roundId },
      data: { status: "COMPLETED", endedAt: new Date() }
    });
    let updatedGameState = await prisma.gameState.findFirst();
    if (updatedGameState?.currentRoundId === roundId) {
      updatedGameState = await prisma.gameState.update({ where: { id: updatedGameState.id }, data: { currentRoundId: null } });
    }

    const nextPendingRound = await prisma.round.findFirst({
      where: { status: "PENDING" },
      orderBy: [{ slot: { slotNumber: "asc" } }, { roundNumber: "asc" }],
      select: { id: true },
    });
    const pendingCount = await prisma.round.count({ where: { status: "PENDING" } });

    await broadcast('round_state_change', {
      action: 'stop',
      round: updatedRound,
      gameState: updatedGameState,
      nextRoundId: nextPendingRound?.id || null,
      allRoundsCompleted: pendingCount === 0
    });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (e) {
    console.error(e);
  }
}

export async function pauseRound(formData: FormData) {
  await requireAdmin();
  try {
    const roundId = formData.get("roundId") as string;

    const round = await prisma.round.findUnique({ where: { id: roundId } });
    let updatedRound = round;
    
    if (round?.startTime && round.status === "IN_PROGRESS") {
      const elapsedSec = round.elapsedSeconds + Math.floor((Date.now() - round.startTime.getTime()) / 1000);
      
      updatedRound = await prisma.round.update({
        where: { id: roundId },
        data: { 
          status: `PAUSED_${elapsedSec}`,
          elapsedSeconds: elapsedSec,
          startTime: null
        }
      });
    }

    const gameState = await prisma.gameState.findFirst();

    await broadcast('round_state_change', { action: 'pause', round: updatedRound, gameState });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (e) {
    console.error(e);
  }
}

export async function resetAllRounds() {
  await requireAdmin();
  try {
    await prisma.round.updateMany({
      data: { status: "PENDING", elapsedSeconds: 0, startTime: null, endedAt: null }
    });
    let updatedGameState = await prisma.gameState.findFirst();
    if (updatedGameState) {
      updatedGameState = await prisma.gameState.update({ where: { id: updatedGameState.id }, data: { currentRoundId: null } });
    }

    const nextPendingRound = await prisma.round.findFirst({
      where: { status: "PENDING" },
      orderBy: [{ slot: { slotNumber: "asc" } }, { roundNumber: "asc" }],
      select: { id: true },
    });

    await broadcast('round_state_change', {
      action: 'reset',
      gameState: updatedGameState,
      nextRoundId: nextPendingRound?.id || null,
      allRoundsCompleted: false
    });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
  } catch (e) {
    console.error(e);
  }
}

export async function updateAllRoundsDuration(formData: FormData) {
  await requireAdmin();
  const duration = parseInt(formData.get("duration") as string, 10);
  if (isNaN(duration) || duration <= 0) {
    await setError("Invalid duration");
    revalidatePath("/admin");
    return;
  }
  try {
    await prisma.round.updateMany({
      data: { durationMinutes: duration }
    });
  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to update round duration");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("updated_duration");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function updateShiftDuration(formData: FormData) {
  await requireAdmin();
  const duration = parseInt(formData.get("shiftDuration") as string, 10);
  if (isNaN(duration) || duration <= 0) {
    await setError("Invalid duration");
    revalidatePath("/admin");
    return;
  }
  try {
    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({
        where: { id: state.id },
        data: { shiftDuration: duration }
      });
    } else {
      await prisma.gameState.create({
        data: { shiftDuration: duration }
      });
    }
  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to update shift duration");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("updated_shift");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function updateRoundTimers(formData: FormData) {
  await requireAdmin();
  const briefingDuration = parseInt(formData.get("briefingDuration") as string, 10);
  const pitchDuration = parseInt(formData.get("pitchDuration") as string, 10);
  const referralDuration = parseInt(formData.get("referralDuration") as string, 10);

  if (isNaN(briefingDuration) || isNaN(pitchDuration) || isNaN(referralDuration)) {
    await setError("Invalid durations provided");
    revalidatePath("/admin");
    return;
  }

  try {
    const state = await prisma.gameState.findFirst();
    let updatedState;
    if (state) {
      updatedState = await prisma.gameState.update({
        where: { id: state.id },
        data: { briefingDuration, pitchDuration, referralDuration }
      });
    } else {
      updatedState = await prisma.gameState.create({
        data: { briefingDuration, pitchDuration, referralDuration }
      });
    }

    // Broadcast instantly so open dashboards can snap to the new config
    const { broadcast } = await import("@/lib/broadcaster");
    await broadcast('round_state_change', { action: 'update_timers', gameState: updatedState });

  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to update round timers");
    revalidatePath("/admin");
    return;
  }
  await setSuccess("updated_timers");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function toggleAutoMode() {
  await requireAdmin();
  try {
    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({
        where: { id: state.id },
        data: { isAutoMode: !state.isAutoMode }
      });
    }
  } catch (e) {
    console.error(e);
  }
  revalidatePath("/admin");
}

export async function toggleOpenLogin() {
  await requireAdmin();
  try {
    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({
        where: { id: state.id },
        data: { isOpenLogins: !state.isOpenLogins }
      });
    } else {
      await prisma.gameState.create({
        data: { isOpenLogins: true }
      });
    }
  } catch (e) {
    console.error(e);
  }
  revalidatePath("/admin");
}

export async function endConclave(formData: FormData) {
  await requireAdmin();
  try {
    const password = formData.get("password") as string;
    verifyDeletePassword(password);

    await prisma.round.updateMany({
      data: { status: "COMPLETED", endedAt: new Date() }
    });

    const state = await prisma.gameState.findFirst();
    if (state) {
      await prisma.gameState.update({
        where: { id: state.id },
        data: { currentRoundId: null }
      });
    }

    await broadcast('round_state_change', { action: 'end_conclave' });
    await setSuccess("ended_conclave");
  } catch (e: any) {
    console.error(e);
    await setError(e.message || "Failed to end conclave");
  }
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
