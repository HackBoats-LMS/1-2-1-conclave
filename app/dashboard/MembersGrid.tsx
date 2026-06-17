"use client";

import React, { useState, useEffect, useRef } from "react";
import { UserCard } from "./UserCard";

interface MembersGridProps {
  tableUsers: any[];
  table: any;
  sentReferralUserIds: string[];
}

export function MembersGrid({ tableUsers, table, sentReferralUserIds }: MembersGridProps) {
  const [activeTimer, setActiveTimer] = useState<{ userId: string; type: string; timeLeft: number } | null>(null);
  const localIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sentReferralsSet = new Set(sentReferralUserIds);

  useEffect(() => {
    if (!table?.roundId || !table?.tableNumber) return;

    let targetEndTime: number | null = null;
    let lastProcessedTimestamp = 0;

    const activateTimer = (payloadUserId: string, payloadType: string, payloadTargetEndTime: number, msgTimestamp?: number) => {
      if (msgTimestamp && msgTimestamp < lastProcessedTimestamp) {
        return;
      }
      if (msgTimestamp) {
        lastProcessedTimestamp = msgTimestamp;
      }

      // Check if the payload speaker exists in our active table users
      const belongsToTable = tableUsers.some((tu) => tu.user.id === payloadUserId);
      if (!belongsToTable) {
        setActiveTimer(null);
        if (localIntervalRef.current) clearInterval(localIntervalRef.current);
        targetEndTime = null;
        return;
      }

      if (targetEndTime === payloadTargetEndTime) return;

      targetEndTime = payloadTargetEndTime;
      const remaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));

      if (remaining > 0) {
        setActiveTimer({ userId: payloadUserId, type: payloadType, timeLeft: remaining });
        if (localIntervalRef.current) clearInterval(localIntervalRef.current);

        localIntervalRef.current = setInterval(() => {
          if (!targetEndTime) return;
          const currentRemaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
          if (currentRemaining <= 0) {
            setActiveTimer(null);
            if (localIntervalRef.current) clearInterval(localIntervalRef.current);
            targetEndTime = null;
          } else {
            setActiveTimer({ userId: payloadUserId, type: payloadType, timeLeft: currentRemaining });
          }
        }, 250);
      } else {
        setActiveTimer(null);
        if (localIntervalRef.current) clearInterval(localIntervalRef.current);
        targetEndTime = null;
      }
    };

    const handleTimerStart = (e: any) => {
      const payload = e.detail;
      const initialTarget = Date.now() + payload.durationSec * 1000;
      activateTimer(payload.userId, payload.type, initialTarget, payload.timestamp);
    };

    const handleTimerSync = (e: any) => {
      const payload = e.detail;
      activateTimer(payload.userId, payload.type, payload.targetEndTime, payload.timestamp);
    };

    const handleTimerStop = (e: any) => {
      const payload = e.detail;
      const msgTimestamp = payload.timestamp || 0;
      if (msgTimestamp && msgTimestamp < lastProcessedTimestamp) {
        return;
      }
      if (msgTimestamp) {
        lastProcessedTimestamp = msgTimestamp;
      }

      setActiveTimer(null);
      if (localIntervalRef.current) clearInterval(localIntervalRef.current);
      targetEndTime = null;
    };

    window.addEventListener("conclave_timer_start", handleTimerStart);
    window.addEventListener("conclave_timer_sync", handleTimerSync);
    window.addEventListener("conclave_timer_stop", handleTimerStop);

    return () => {
      if (localIntervalRef.current) clearInterval(localIntervalRef.current);
      window.removeEventListener("conclave_timer_start", handleTimerStart);
      window.removeEventListener("conclave_timer_sync", handleTimerSync);
      window.removeEventListener("conclave_timer_stop", handleTimerStop);
    };
  }, [table?.roundId, table?.tableNumber, tableUsers]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
      {tableUsers.map((tu: any) => {
        const isTimerActive = activeTimer && activeTimer.userId === tu.user.id;
        return (
          <UserCard
            key={tu.user.id}
            tu={{ ...tu, table }}
            alreadyReferred={sentReferralsSet.has(tu.userId)}
            activeTimer={isTimerActive ? { type: activeTimer.type, timeLeft: activeTimer.timeLeft } : null}
          />
        );
      })}
    </div>
  );
}
