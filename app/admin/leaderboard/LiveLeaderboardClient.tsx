"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Refreshes page on round_state_change so activeRound/leaderboard data stays current.
// Uses a dedicated channel name to avoid colliding with LiveTotalCount's "global_events".
export function LiveLeaderboardClient() {
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel("leaderboard_page_refresh")
      .on("broadcast", { event: "round_state_change" }, ({ payload }: { payload: Record<string, string> }) => {
        // Only refresh on start so the new round's timer/data appears.
        // Do NOT refresh on stop — that would reset BigShiftingTimerClient's local state.
        if (payload?.action === "start") {
          router.refresh();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
