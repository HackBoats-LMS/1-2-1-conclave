"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserCard } from "./UserCard";
import { SelfSpeakerTimer } from "./SelfSpeakerTimer";

interface TableRoomOrchestratorProps {
  tableUsers: any[];
  myAssignmentTable: {
    roundId: string;
    tableNumber: number;
  };
  userId: string;
}

export function TableRoomOrchestrator({ tableUsers, myAssignmentTable, userId }: TableRoomOrchestratorProps) {
  const [activeSpeakerTimer, setActiveSpeakerTimer] = useState<{ userId: string; type: string; targetEndTime: number } | null>(null);

  useEffect(() => {
    setActiveSpeakerTimer(null);
    if (!myAssignmentTable.roundId || !myAssignmentTable.tableNumber) return;

    const channelName = `room_${myAssignmentTable.roundId}_table_${myAssignmentTable.tableNumber}`;
    const channel = supabase.channel(channelName);

    channel.on('broadcast', { event: 'timer_start' }, ({ payload }) => {
      const offset = (payload.timestamp || Date.now()) - Date.now();
      const targetEndTime = (payload.timestamp || Date.now()) + payload.durationSec * 1000;
      setActiveSpeakerTimer({
        userId: payload.userId,
        type: payload.type,
        targetEndTime: targetEndTime - offset
      });
    });

    channel.on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
      const captainSentTime = payload.timestamp || (payload.targetEndTime - payload.durationSec * 1000);
      const offset = captainSentTime - Date.now();
      setActiveSpeakerTimer({
        userId: payload.userId,
        type: payload.type,
        targetEndTime: payload.targetEndTime - offset
      });
    });

    channel.on('broadcast', { event: 'timer_stop' }, ({ payload }) => {
      setActiveSpeakerTimer(prev => {
        if (!payload.userId || (prev && payload.userId === prev.userId)) {
          return null;
        }
        return prev;
      });
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'sync_request',
          payload: {}
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myAssignmentTable.roundId, myAssignmentTable.tableNumber]);

  return (
    <>
      {/* Self Timer Overlay (only active when it is current user's turn) */}
      <SelfSpeakerTimer 
        activeSpeakerTimer={activeSpeakerTimer} 
        userId={userId} 
      />

      {/* Other Table Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tableUsers.map((tu: any) => (
          <UserCard 
            key={tu.user.id} 
            tu={{ ...tu, table: myAssignmentTable }} 
            activeSpeakerTimer={activeSpeakerTimer}
          />
        ))}
        {tableUsers.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-[#0D2421]/30 rounded-[2rem] bg-white space-y-4">
            <div className="w-16 h-16 bg-[#FAF8F4] border border-[#0D2421]/35 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-[#0D2421]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="font-black text-sm uppercase text-[#0D2421]/70">No other members assigned to this table yet</p>
              <p className="text-xs font-semibold text-[#0D2421]/50 uppercase tracking-wider">Please wait for partners to log in or ask the admin to allocate table coordinates.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
