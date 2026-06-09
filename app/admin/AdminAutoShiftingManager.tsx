"use client";

import { useEffect, useRef } from "react";

export function AdminAutoShiftingManager({ 
  lastCompletedRoundEndedAt, 
  shiftDurationMinutes, 
  nextRoundId,
  isAutoMode,
  onStartRound
}: { 
  lastCompletedRoundEndedAt: Date | string | null;
  shiftDurationMinutes: number;
  nextRoundId: string | null;
  isAutoMode: boolean;
  onStartRound: (roundId: string) => void;
}) {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!isAutoMode || !nextRoundId || !lastCompletedRoundEndedAt) {
      hasTriggeredRef.current = false;
      return;
    }

    const checkTime = () => {
      const endTime = new Date(lastCompletedRoundEndedAt).getTime() + (shiftDurationMinutes * 60 * 1000);
      const now = new Date().getTime();
      
      if (now >= endTime && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        onStartRound(nextRoundId);
      }
    };

    // Initial check
    checkTime();

    // Polling interval
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);

  }, [isAutoMode, nextRoundId, lastCompletedRoundEndedAt, shiftDurationMinutes, onStartRound]);

  return null; // Invisible component
}
