"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function LiveLeaderboardClient() {
  const router = useRouter();

  useEffect(() => {
    // Subscribe to the global events channel
    const channel = supabase.channel("global_events");

    let debounceTimer: NodeJS.Timeout;

    channel.on("broadcast", { event: "new_referral" }, () => {
      // Whenever a new referral is broadcasted, tell Next.js to re-fetch the Server Component data
      // Debounced by 3 seconds to avoid DDoS on high frequency referrals
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        router.refresh();
      }, 3000);
    });

    channel.on("broadcast", { event: "round_state_change" }, () => {
      // Refresh to update the shifting timer or active round status instantly (no debounce needed as this is low frequency)
      router.refresh();
    });

    channel.subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null; // This component is invisible, it just handles the Realtime data sync
}
