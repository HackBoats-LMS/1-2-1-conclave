"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function LiveLeaderboardClient() {
  const router = useRouter();

  useEffect(() => {
    // Subscribe to the global events channel
    const channel = supabase.channel("global_events");

    channel.on("broadcast", { event: "new_referral" }, () => {
      // Whenever a new referral is broadcasted, tell Next.js to re-fetch the Server Component data
      router.refresh();
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null; // This component is invisible, it just handles the Realtime data sync
}
