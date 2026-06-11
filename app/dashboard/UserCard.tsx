"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { sendReferral } from "./actions";
import { supabase } from "@/lib/supabaseClient";

interface UserCardProps {
  tu: any;
  alreadyReferred?: boolean;
}

export function UserCard({ tu, alreadyReferred = false }: UserCardProps) {
  const user = tu.user;
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [showAnimation, setShowAnimation] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requireNoteLocally, setRequireNoteLocally] = useState(alreadyReferred);
  
  const [activeTimer, setActiveTimer] = useState<{ type: string, timeLeft: number } | null>(null);
  const localIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!tu.table?.roundId || !tu.table?.tableNumber) return;
    
    const channelName = `room_${tu.table.roundId}_table_${tu.table.tableNumber}`;
    const channel = supabase.channel(channelName);
    
    let targetEndTime: number | null = null;
    
    // Shared function to initialize or adopt a timer
    const activateTimer = (payloadUserId: string, payloadType: string, payloadTargetEndTime: number) => {
      if (payloadUserId === user.id) {
        // Only update if we aren't already tracking this exact target end time (to avoid resetting intervals needlessly)
        if (targetEndTime === payloadTargetEndTime) return;
        
        targetEndTime = payloadTargetEndTime;
        const remaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
        
        if (remaining > 0) {
          setActiveTimer({ type: payloadType, timeLeft: remaining });
          if (localIntervalRef.current) clearInterval(localIntervalRef.current);
          
          localIntervalRef.current = setInterval(() => {
            if (!targetEndTime) return;
            const currentRemaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
            if (currentRemaining <= 0) {
              setActiveTimer(null);
              if (localIntervalRef.current) clearInterval(localIntervalRef.current);
              targetEndTime = null;
            } else {
              setActiveTimer(prev => prev ? { ...prev, timeLeft: currentRemaining } : null);
            }
          }, 250); // Polling every 250ms
        } else {
          setActiveTimer(null);
          if (localIntervalRef.current) clearInterval(localIntervalRef.current);
          targetEndTime = null;
        }
      } else {
        setActiveTimer(null);
        if (localIntervalRef.current) clearInterval(localIntervalRef.current);
        targetEndTime = null;
      }
    };
    
    channel.on('broadcast', { event: 'timer_start' }, ({ payload }) => {
      // For timer_start, we calculate the initial target based on local time
      const initialTarget = Date.now() + payload.durationSec * 1000;
      activateTimer(payload.userId, payload.type, initialTarget);
    });

    channel.on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
      // For timer_sync, the Captain passes the actual wall-clock target time
      activateTimer(payload.userId, payload.type, payload.targetEndTime);
    });

    channel.on('broadcast', { event: 'timer_stop' }, ({ payload }) => {
      if (!payload.userId || payload.userId === user.id) {
        setActiveTimer(null);
        if (localIntervalRef.current) clearInterval(localIntervalRef.current);
        targetEndTime = null;
      }
    });

    channel.subscribe();

    return () => {
      if (localIntervalRef.current) clearInterval(localIntervalRef.current);
      supabase.removeChannel(channel);
    };
  }, [user.id, tu.table?.roundId, tu.table?.tableNumber]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending || showAnimation) return;

    const formData = new FormData(e.currentTarget);
    setShowAnimation(true);

    startTransition(async () => {
      try {
        setErrorMsg(null);
        const result = await sendReferral(formData);
        
        if (result?.error) {
          setErrorMsg(result.error);
          setRequireNoteLocally(true);
          setShowAnimation(false);
          return;
        }

        setRequireNoteLocally(true); // all subsequent referrals need a note
        // Wait a bit for the plane to finish flying, then show the checkmark
        setTimeout(() => {
          setShowCheck(true);
        }, 800);

        // Reset everything after 2.4s
        setTimeout(() => {
          setShowAnimation(false);
          setShowCheck(false);
          setNote("");
        }, 2400);

      } catch (err) {
        console.error(err);
        setShowAnimation(false);
      }
    });
  };

  return (
    <div className={`bg-white border-2 rounded-[2rem] overflow-hidden transition-all flex flex-col justify-between relative ${
      activeTimer 
        ? 'border-[#BEF03C] shadow-[8px_8px_0px_#BEF03C] -translate-y-1 -translate-x-1 ring-4 ring-[#BEF03C]/20' 
        : 'border-[#0D2421] shadow-[6px_6px_0px_#0D2421] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#0D2421]'
    }`}>
      
      {/* Dynamic Animated Vector Overlay */}
      {showAnimation && (
        <div className="absolute inset-0 bg-[#FAF8F4]/90 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center space-y-4 rounded-[1.8rem] transition-all duration-300">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes flyPlane {
              0% {
                transform: translate(-120px, 120px) rotate(-15deg) scale(0.4);
                opacity: 0;
              }
              20% {
                opacity: 1;
              }
              60% {
                transform: translate(0px, 0px) rotate(-5deg) scale(1.2);
                opacity: 1;
              }
              80% {
                transform: translate(140px, -140px) rotate(-35deg) scale(0.5);
                opacity: 0;
              }
              100% {
                transform: translate(140px, -140px) rotate(-35deg) scale(0.5);
                opacity: 0;
              }
            }
            @keyframes drawCheck {
              to {
                stroke-dashoffset: 0;
              }
            }
            @keyframes scaleIn {
              0% {
                transform: scale(0.85);
                opacity: 0;
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }
            .animate-plane {
              animation: flyPlane 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            }
            .animate-checkmark {
              animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            .draw-path {
              stroke-dasharray: 50;
              stroke-dashoffset: 50;
              animation: drawCheck 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.15s forwards;
            }
          `}} />

          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* Animated paper airplane */}
            {!showCheck && (
              <svg className="w-20 h-20 text-[#0D2421] animate-plane" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}

            {/* Animated success checkmark */}
            {showCheck && (
              <div className="flex flex-col items-center space-y-3 animate-checkmark">
                <div className="w-16 h-16 rounded-full bg-[#BEF03C] border-2 border-[#0D2421] flex items-center justify-center shadow-[3px_3px_0px_#0D2421]">
                  <svg className="w-8 h-8 text-[#0D2421]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path className="draw-path" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-black text-xs uppercase tracking-wider text-[#0D2421]">
                  Referral Sent!
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card Content */}
      <div className="p-5 md:p-8 space-y-5 md:space-y-6 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 ${tu.isCaptain ? 'bg-amber-400' : 'bg-[#BEF03C]'} border-2 border-[#0D2421] text-[#0D2421] rounded-2xl flex items-center justify-center font-black text-2xl shadow-[2px_2px_0px_#0D2421] flex-shrink-0 relative`}>
              {user.name?.charAt(0) || user.businessName?.charAt(0) || user.email?.charAt(0) || '?'}
              {tu.isCaptain && (
                <span className="absolute -top-2 -right-2 text-sm z-10">👑</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-lg uppercase truncate">{user.name || user.businessName || user.email}</h3>
              <p className="text-xs font-bold text-[#BEF03C] bg-[#0D2421] border border-[#0D2421] px-2 py-0.5 rounded inline-block uppercase truncate tracking-wide max-w-full">
                {user.businessCategory || "Participant"}
              </p>
            </div>
          </div>
          
          <div className="bg-[#FAF8F4] p-4 rounded-xl border border-[#0D2421]/15 h-24 overflow-y-auto">
            <p className="text-[#0D2421]/80 text-xs font-semibold leading-relaxed">
              {user.description || "No description provided by this user."}
            </p>
          </div>

          {(user.specificAsk1 || user.specificAsk2) && (
            <div className="space-y-2">
              {user.specificAsk1 && (
                <div className="flex items-start gap-2 bg-[#BEF03C]/20 border border-[#0D2421]/20 rounded-xl px-3 py-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#0D2421]/50 shrink-0 mt-0.5">Ask 1</span>
                  <p className="text-xs font-bold text-[#0D2421] leading-snug">{user.specificAsk1}</p>
                </div>
              )}
              {user.specificAsk2 && (
                <div className="flex items-start gap-2 bg-[#BEF03C]/20 border border-[#0D2421]/20 rounded-xl px-3 py-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#0D2421]/50 shrink-0 mt-0.5">Ask 2</span>
                  <p className="text-xs font-bold text-[#0D2421] leading-snug">{user.specificAsk2}</p>
                </div>
              )}
            </div>
          )}
          {activeTimer && (
            <div className="flex flex-col items-center justify-center py-2 bg-white rounded-xl border-2 border-[#0D2421] shadow-[2px_2px_0px_#0D2421]">
              <span className="font-black text-[10px] uppercase tracking-widest text-[#0D2421] mb-1">
                {activeTimer.type === "PITCH" ? "Pitching Time" : "Referral Time"}
              </span>
              <span className="text-4xl font-black text-[#BEF03C] drop-shadow-[2px_2px_0px_#0D2421] animate-pulse">
                {activeTimer.timeLeft}s
              </span>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t border-[#0D2421]/10 mt-4">
          <input type="hidden" name="toUserId" value={user.id} />
          <input 
            type="text" 
            name="note" 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={requireNoteLocally ? "A note is required now..." : "Add a connection note..."}
            required={requireNoteLocally}
            className={`w-full bg-[#FAF8F4] border-2 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 font-bold transition-all placeholder:text-[#0D2421]/30 shadow-inner ${
              requireNoteLocally && !note.trim() 
                ? 'border-red-400 focus:ring-red-400/50' 
                : 'border-[#0D2421] focus:ring-[#BEF03C]/50'
            }`} 
          />
          
          {errorMsg && (
            <p className="text-red-500 text-[10px] font-black uppercase tracking-wider text-center pt-1 leading-tight animate-pulse">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || showAnimation}
            className="w-full py-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black uppercase text-xs shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#0D2421] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#0D2421] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              "Send Referral"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
