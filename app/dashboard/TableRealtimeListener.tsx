"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export function TableRealtimeListener({
  roundId,
  tableNumber,
}: {
  roundId: string;
  tableNumber: number;
}) {
  useEffect(() => {
    if (!roundId || !tableNumber) return;

    const channelName = `room_${roundId}_table_${tableNumber}`;
    const channel = supabase.channel(channelName);

    channel.on("broadcast", { event: "timer_start" }, ({ payload }) => {
      window.dispatchEvent(
        new CustomEvent("conclave_timer_start", { detail: payload })
      );
    });

    channel.on("broadcast", { event: "timer_sync" }, ({ payload }) => {
      window.dispatchEvent(
        new CustomEvent("conclave_timer_sync", { detail: payload })
      );
    });

    channel.on("broadcast", { event: "timer_stop" }, ({ payload }) => {
      window.dispatchEvent(
        new CustomEvent("conclave_timer_stop", { detail: payload })
      );
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "request_state_sync",
          payload: { timestamp: Date.now() }
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId, tableNumber]);

  return null;
}
