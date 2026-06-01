"use client";

import React, { useState, useEffect, useRef } from "react";
import { UserCard } from "./UserCard";

interface Participant {
  id: string;
  name: string;
  email: string;
  isCaptain: boolean;
  businessCategory: string;
  onboardingCompleted?: boolean;
}

interface CaptainActiveRoundProps {
  round: {
    id: string;
    roundNumber: number;
    startTime: Date | string | null;
    durationMinutes: number;
  };
  tableNumber: number;
  tableUsers: any[];
  sessionUser: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export function CaptainActiveRound({ round, tableNumber, tableUsers, sessionUser }: CaptainActiveRoundProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [speakerTimeLeft, setSpeakerTimeLeft] = useState<number | null>(null);
  const [speakerDuration, setSpeakerDuration] = useState<number>(60);
  const [speakerTimerType, setSpeakerTimerType] = useState<"PITCH" | "REFERRAL" | null>(null);
  const [manualPhase, setManualPhase] = useState<number | null>(null);
  const [pitchedUsers, setPitchedUsers] = useState<Record<string, boolean>>({});
  const [referredUsers, setReferredUsers] = useState<Record<string, boolean>>({});
  const [windowWidth, setWindowWidth] = useState(1024);
  
  // Sound mute state stored in local storage
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("conclave_captain_muted") === "true";
    }
    return false;
  });

  const speakerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track window resizing for responsive circular coordinates
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Calculate elapsed time since round started
  useEffect(() => {
    if (!round.startTime) return;
    
    const startTimeMs = new Date(round.startTime).getTime();
    
    const updateElapsed = () => {
      const now = new Date().getTime();
      const elapsedSec = Math.floor((now - startTimeMs) / 1000);
      setElapsedTime(Math.max(0, elapsedSec));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [round.startTime]);

  const allParticipantsRef = useRef<Participant[]>([]);
  const pitchedUsersRef = useRef<Record<string, boolean>>({});
  const referredUsersRef = useRef<Record<string, boolean>>({});

  // Gather all table participants (Captain sits at position 0)
  const allParticipants: Participant[] = [
    {
      id: sessionUser.id,
      name: sessionUser.name || sessionUser.email.split("@")[0],
      email: sessionUser.email,
      isCaptain: true,
      businessCategory: "Table Captain",
      onboardingCompleted: true
    },
    ...tableUsers.map(tu => ({
      id: tu.user.id,
      name: tu.user.name || tu.user.email.split("@")[0],
      email: tu.user.email,
      isCaptain: false,
      businessCategory: tu.user.businessCategory || tu.user.businessName || "Participant",
      onboardingCompleted: tu.user.onboardingCompleted
    }))
  ];

  allParticipantsRef.current = allParticipants;
  pitchedUsersRef.current = pitchedUsers;
  referredUsersRef.current = referredUsers;
  
  const pitchDurationSec = round.roundNumber === 1 ? 60 : 30;

  // Speaker timer countdown logic
  useEffect(() => {
    if (speakerTimeLeft === null) return;
    
    if (speakerTimeLeft <= 0) {
      const currentId = activeSpeakerId;
      const currentType = speakerTimerType;

      // Mark user as completed when their timer ends
      if (currentId && currentType === "PITCH") {
        setPitchedUsers(prev => ({ ...prev, [currentId]: true }));
      }
      if (currentId && currentType === "REFERRAL") {
        setReferredUsers(prev => ({ ...prev, [currentId]: true }));
      }
      
      // Clear active speaker states immediately to avoid rendering "nulls" during transitions
      setSpeakerTimeLeft(null);
      setActiveSpeakerId(null);
      setSpeakerTimerType(null);
      
      // Play success chime if not muted
      if (!isMuted) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
          gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.35);
        } catch (err) {}
      }

      // Automatically move to the next person to pitch
      if (currentId && currentType === "PITCH") {
        const parts = allParticipantsRef.current;
        const pitched = pitchedUsersRef.current;
        
        const currentIndex = parts.findIndex(p => p.id === currentId);
        let nextSpeaker: Participant | null = null;
        for (let i = 1; i <= parts.length; i++) {
          const nextIndex = (currentIndex + i) % parts.length;
          const candidate = parts[nextIndex];
          
          // Next speaker must not be the captain, not be the current speaker, and not be marked as pitched already
          if (!candidate.isCaptain && candidate.id !== currentId && !pitched[candidate.id]) {
            nextSpeaker = candidate;
            break;
          }
        }

        if (nextSpeaker) {
          // Small transition delay so user hears chime and sees status transition
          transitionTimeoutRef.current = setTimeout(() => {
            startSpeakerTimer(nextSpeaker!.id, pitchDurationSec, "PITCH");
          }, 800);
        } else {
          // No more speakers left, advance to Stage 3 (Referrals)
          setManualPhase(3);
        }
      }

      // Automatically move to the next person for referral turn
      if (currentId && currentType === "REFERRAL") {
        const parts = allParticipantsRef.current;
        const referred = { ...referredUsersRef.current, [currentId]: true };
        
        const currentIndex = parts.findIndex(p => p.id === currentId);
        let nextSpeaker: Participant | null = null;
        for (let i = 1; i <= parts.length; i++) {
          const nextIndex = (currentIndex + i) % parts.length;
          const candidate = parts[nextIndex];
          
          // Next speaker must not be the captain, not be the current speaker, and not be marked as referred already
          if (!candidate.isCaptain && candidate.id !== currentId && !referred[candidate.id]) {
            nextSpeaker = candidate;
            break;
          }
        }

        if (nextSpeaker) {
          // Small transition delay so user hears chime and sees status transition
          transitionTimeoutRef.current = setTimeout(() => {
            startSpeakerTimer(nextSpeaker!.id, 30, "REFERRAL");
          }, 800);
        } else {
          // No more speakers left, advance to Stage 4 (Rotation)
          setManualPhase(4);
        }
      }
      return;
    }

    speakerIntervalRef.current = setTimeout(() => {
      setSpeakerTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (speakerIntervalRef.current) clearTimeout(speakerIntervalRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [speakerTimeLeft, activeSpeakerId, speakerTimerType, isMuted, pitchDurationSec]);

  const totalRoundSec = round.durationMinutes * 60; // e.g. 15 mins = 900s
  const remainingRoundSec = Math.max(0, totalRoundSec - elapsedTime);
  
  const memberCount = allParticipants.filter(p => !p.isCaptain).length || 8;

  const stage2Start = 60; // 1 min briefing
  const stage3Start = stage2Start + (memberCount * pitchDurationSec); // 60 + 8*60 = 540s (9 mins elapsed)
  const stage4Start = stage3Start + (memberCount * 30); // 540 + 8*30 = 780s (13 mins elapsed)
  
  // Calculate computed phases dynamically based on round stage boundaries
  let computedPhase = 1;
  if (elapsedTime >= stage4Start) {
    computedPhase = 4; // Last 2 mins: Rotation
  } else if (elapsedTime >= stage3Start) {
    computedPhase = 3; // 4 mins: Referral turns
  } else if (elapsedTime >= stage2Start) {
    computedPhase = 2; // After 1st min: Pitches
  }

  const currentPhase = manualPhase !== null ? manualPhase : computedPhase;

  // Calculate dynamic radius and avatar sizing based on participant count to prevent overlaps
  const N = allParticipants.length;
  const isMobile = windowWidth < 768;
  const radius = isMobile
    ? (N > 15 ? 65 : N > 10 ? 72 : 68)
    : (N > 15 ? 130 : N > 10 ? 115 : 95);

  const avatarSizeClass = isMobile
    ? (N > 15 ? "w-6 h-6 text-[8px]" : N > 10 ? "w-7 h-7 text-[9px] border-2" : "w-9 h-9 text-xs border-2")
    : (N > 15 ? "w-6 h-6 text-[8px]" : N > 10 ? "w-8 h-8 text-[9px] border-2" : "w-11 h-11 text-xs border-2");

  // Identify next recommended pitcher / referrer
  const nextToPitch = allParticipants.find(p => !p.isCaptain && !pitchedUsers[p.id]);
  const nextToRefer = allParticipants.find(p => !p.isCaptain && !referredUsers[p.id]);

  const startSpeakerTimer = (participantId: string, durationSec: number, type: "PITCH" | "REFERRAL") => {
    if (speakerIntervalRef.current) clearTimeout(speakerIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    
    // Mark previous speaker as completed if switching directly
    if (activeSpeakerId && activeSpeakerId !== participantId) {
      if (speakerTimerType === "PITCH") {
        setPitchedUsers(prev => ({ ...prev, [activeSpeakerId]: true }));
      } else if (speakerTimerType === "REFERRAL") {
        setReferredUsers(prev => ({ ...prev, [activeSpeakerId]: true }));
      }
    }

    setActiveSpeakerId(participantId);
    setSpeakerDuration(durationSec);
    setSpeakerTimeLeft(durationSec);
    setSpeakerTimerType(type);

    // Auto-advance manualPhase to keep the UI in sync if the captain triggers a later step action
    if (type === "PITCH" && currentPhase === 1) {
      setManualPhase(2);
    } else if (type === "REFERRAL" && currentPhase < 3) {
      setManualPhase(3);
    }
  };

  const stopSpeakerTimer = () => {
    if (speakerIntervalRef.current) clearTimeout(speakerIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    if (activeSpeakerId) {
      if (speakerTimerType === "PITCH") {
        setPitchedUsers(prev => ({ ...prev, [activeSpeakerId]: true }));
      } else if (speakerTimerType === "REFERRAL") {
        setReferredUsers(prev => ({ ...prev, [activeSpeakerId]: true }));
      }
    }
    setActiveSpeakerId(null);
    setSpeakerTimeLeft(null);
    setSpeakerTimerType(null);
  };

  const addExtraTime = (seconds: number) => {
    if (speakerTimeLeft !== null) {
      setSpeakerTimeLeft(prev => (prev !== null ? prev + seconds : seconds));
      setSpeakerDuration(prev => prev + seconds);
    }
  };


  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem("conclave_captain_muted", String(next));
      return next;
    });
  };

  // Autopilot button handler: Runs the entire round step-by-step
  const handleAutopilotAction = () => {
    if (currentPhase === 1) {
      // Advance to pitches, select first pitcher
      setManualPhase(2);
      const first = allParticipants.find(p => !p.isCaptain && !pitchedUsers[p.id]);
      if (first) {
        startSpeakerTimer(first.id, pitchDurationSec, "PITCH");
      }
    } else if (currentPhase === 2) {
      if (activeSpeakerId) {
        // Finish current speaker, advance to next
        const currentId = activeSpeakerId;
        stopSpeakerTimer();
        setPitchedUsers(prev => ({ ...prev, [currentId]: true }));

        const next = allParticipants.find(p => !p.isCaptain && p.id !== currentId && !pitchedUsers[p.id]);
        if (next) {
          startSpeakerTimer(next.id, pitchDurationSec, "PITCH");
        } else {
          // No one left, advance to referrals
          setManualPhase(3);
        }
      } else {
        // No active speaker, start the next speaker
        const next = allParticipants.find(p => !p.isCaptain && !pitchedUsers[p.id]);
        if (next) {
          startSpeakerTimer(next.id, pitchDurationSec, "PITCH");
        } else {
          setManualPhase(3);
        }
      }
    } else if (currentPhase === 3) {
      if (activeSpeakerId) {
        // Finish current speaker's referral turn, advance to next
        const currentId = activeSpeakerId;
        stopSpeakerTimer();
        setReferredUsers(prev => ({ ...prev, [currentId]: true }));

        const next = allParticipants.find(p => !p.isCaptain && p.id !== currentId && !referredUsers[p.id]);
        if (next) {
          startSpeakerTimer(next.id, 30, "REFERRAL");
        } else {
          // No one left, advance to table transition
          setManualPhase(4);
        }
      } else {
        // No active speaker, start the next speaker's referral turn
        const next = allParticipants.find(p => !p.isCaptain && !referredUsers[p.id]);
        if (next) {
          startSpeakerTimer(next.id, 30, "REFERRAL");
        } else {
          setManualPhase(4);
        }
      }
    } else if (currentPhase === 4) {
      // End of table round
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // SVG circular countdown swept configurations (responsive 100x100 coordinate system)
  const svgRadius = 40;
  const svgCircumference = 2 * Math.PI * svgRadius;
  const strokeDashoffset = speakerTimeLeft !== null
    ? svgCircumference - (svgCircumference * speakerTimeLeft) / speakerDuration
    : svgCircumference;

  // Determine global progress color
  let progressColorClass = "bg-emerald-500";
  if (currentPhase === 3) progressColorClass = "bg-[#FFC000]";
  if (currentPhase === 4) progressColorClass = "bg-red-400";

  return (
    <div className="space-y-8">
      {/* Dynamic Soundwave & Facilitation animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes soundwave {
          0%, 100% { transform: scaleY(0.18); }
          50% { transform: scaleY(1); }
        }
        @keyframes avatarPulse {
          0% { box-shadow: 0 0 0 0 rgba(190, 240, 60, 0.7), 2.5px 2.5px 0px #0D2421; }
          70% { box-shadow: 0 0 0 8px rgba(190, 240, 60, 0), 2.5px 2.5px 0px #0D2421; }
          100% { box-shadow: 0 0 0 0 rgba(190, 240, 60, 0), 2.5px 2.5px 0px #0D2421; }
        }
        @keyframes buttonGlow {
          0%, 100% { box-shadow: 5px 5px 0px #0d2421, 0 0 0 0 rgba(190, 240, 60, 0.4); }
          50% { box-shadow: 5px 5px 0px #0d2421, 0 0 0 8px rgba(190, 240, 60, 0); }
        }
        @keyframes radarSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-wave-1 { animation: soundwave 0.75s ease-in-out infinite; }
        .animate-wave-2 { animation: soundwave 1.05s ease-in-out infinite 0.15s; }
        .animate-wave-3 { animation: soundwave 0.9s ease-in-out infinite 0.3s; }
        .animate-wave-4 { animation: soundwave 1.15s ease-in-out infinite 0.45s; }
        .animate-wave-5 { animation: soundwave 0.7s ease-in-out infinite 0.6s; }
        .animate-avatar-pulse { animation: avatarPulse 2s infinite; }
        .animate-button-glow { animation: buttonGlow 2s infinite; }
        .animate-radar-sweep { animation: radarSweep 8s linear infinite; }
      ` }} />

      {/* ── CENTRAL WIZARD & RADAR GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Seating Layout & Clock (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-white border-3 border-[#0D2421] p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-[8px_8px_0px_#0D2421] relative overflow-hidden">
          
          {/* Header row with timer, title & sound control */}
          <div className="flex justify-between items-center border-b-2 border-dashed border-[#0D2421]/15 pb-4 w-full">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black tracking-widest text-[#0D2421]/50 uppercase block">01 / LIVE ORCHESTRATION</span>
              <h3 className="font-black text-lg uppercase text-[#0D2421]">Table Seating Radar</h3>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Sound toggle */}
              <button
                onClick={toggleMute}
                className="bg-[#FAF8F4] border-2 border-[#0D2421] px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-[2.5px_2.5px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer flex items-center gap-1.5"
                title={isMuted ? "Unmute alert chime" : "Mute alert chime"}
              >
                <span>{isMuted ? "🔇 Muted" : "🔊 Sound ON"}</span>
              </button>

              <div className="bg-[#0D2421] text-white border-2 border-[#0D2421] px-4 py-1.5 rounded-xl text-xs font-black tracking-wider shadow-[2.5px_2.5px_0px_#BEF03C] flex items-center gap-2">
                <span>Timer: {formatTime(remainingRoundSec)}</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] font-bold text-[#0D2421]/60 uppercase tracking-wider text-center mt-4">
            💡 Quick Tip: Tap any member&apos;s circle to immediately start their pitch timer.
          </p>

          {/* Circle Map container */}
          <div className="relative w-56 h-56 md:w-80 md:h-80 flex items-center justify-center select-none my-6 mx-auto bg-white rounded-full">
            
            {/* Radar sweep effect */}
            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_60%,rgba(190,240,60,0.06)_100%)] animate-radar-sweep pointer-events-none z-0" />

            {/* Radar crosshairs */}
            <div className="absolute w-full h-[1px] border-t border-dashed border-[#0D2421]/5 pointer-events-none z-0" />
            <div className="absolute h-full w-[1px] border-l border-dashed border-[#0D2421]/5 pointer-events-none z-0" />

            {/* Dashed outer rings */}
            <div className="absolute w-48 h-48 md:w-60 md:h-60 rounded-full border-2 border-[#BEF03C]/25 animate-pulse pointer-events-none z-0" />
            <div className="absolute w-38 h-38 md:w-50 md:h-50 rounded-full border border-dashed border-[#0D2421]/10 pointer-events-none z-0" />

            {/* Center table area */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[#0D2421] to-[#1A3F3A] text-white flex flex-col items-center justify-center border-4 border-[#0D2421] ring-3 ring-[#BEF03C] z-10 relative">
              
              {/* Default Table Label */}
              {!activeSpeakerId ? (
                <>
                  <span className="text-[8px] font-black text-[#BEF03C] uppercase tracking-widest leading-none">TABLE</span>
                  <span className="text-3xl font-black tracking-tighter text-[#BEF03C] leading-none my-1">{tableNumber}</span>
                  <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest mt-0.5 animate-pulse">STANDBY</span>
                </>
              ) : (
                <div className="absolute inset-0 rounded-full flex items-center justify-center z-20">
                  {/* Symmetrical responsive SVG progress track */}
                  {speakerTimeLeft !== null && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r={svgRadius}
                        className="stroke-[#0D2421]/20"
                        strokeWidth="6"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r={svgRadius}
                        className="stroke-[#BEF03C] transition-all duration-1000"
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={svgCircumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  
                  {/* Proportional inner details circle - zero size jumps */}
                  <div className="relative z-30 flex flex-col items-center justify-center bg-[#0D2421] w-[76%] h-[76%] rounded-full border border-white/10 shadow-lg">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#BEF03C]">
                      {speakerTimerType === "PITCH" ? "🎙️ PITCH" : "📨 REFER"}
                    </span>
                    
                    <span className="text-2xl font-black tracking-tighter text-[#BEF03C] tabular-nums leading-none my-1">
                      {speakerTimeLeft}s
                    </span>

                    <button 
                      onClick={stopSpeakerTimer}
                      className="text-[9px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest underline cursor-pointer"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Circular participant nodes */}
            {allParticipants.map((p, index) => {
              const angle = (360 / N) * index - 90;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;

              const isSpeaker = activeSpeakerId === p.id;
              const hasCompleted = currentPhase === 4 
                ? (pitchedUsers[p.id] && referredUsers[p.id])
                : currentPhase === 3 
                  ? referredUsers[p.id] 
                  : pitchedUsers[p.id];

              return (
                <div 
                  key={p.id}
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                  className={`absolute z-20 transition-all duration-300 ${
                    isSpeaker ? "scale-120" : "hover:scale-110"
                  }`}
                >
                  <button 
                    onClick={() => {
                      if (!p.isCaptain) {
                        if (isSpeaker) {
                          stopSpeakerTimer();
                        } else {
                          if (currentPhase === 3) {
                            startSpeakerTimer(p.id, 30, "REFERRAL");
                          } else {
                            startSpeakerTimer(p.id, pitchDurationSec, "PITCH");
                          }
                        }
                      }
                    }}
                    title={p.isCaptain ? "Table Captain" : isSpeaker ? "Click to stop timer" : currentPhase === 3 ? `Click to start referral (30s) for ${p.name}` : `Click to start pitch (${pitchDurationSec}s) for ${p.name}`}
                    className={`rounded-xl flex items-center justify-center font-black border-2 uppercase relative transition-all shadow-[2.5px_2.5px_0px_#0D2421] cursor-pointer ${avatarSizeClass} ${
                      p.isCaptain 
                        ? "bg-amber-400 text-[#0D2421] border-[#0D2421]" 
                        : isSpeaker
                          ? "bg-[#BEF03C] text-[#0D2421] border-[#0D2421] animate-avatar-pulse"
                          : hasCompleted
                            ? "bg-[#0D2421] text-[#BEF03C] border-[#0D2421] opacity-75"
                            : "bg-white text-[#0D2421] border-[#0D2421]"
                    }`}
                  >
                    {p.name.charAt(0)}
                    
                    {p.isCaptain ? (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-sm drop-shadow-sm select-none">👑</span>
                    ) : hasCompleted ? (
                      <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#BEF03C] text-[#0D2421] border-2 border-[#0D2421] text-[9px] font-black shadow-[1.5px_1.5px_0px_#0D2421]">
                        ✓
                      </span>
                    ) : null}

                    {isSpeaker && (
                      <span className="absolute -bottom-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#0D2421] text-[#BEF03C] border border-[#0D2421] text-[9px] animate-bounce">
                        {currentPhase === 3 ? "📨" : "🎙️"}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Stepper Timeline & Progress Indicator */}
          <div className="w-full bg-[#FAF8F4] border-2 border-[#0D2421] p-4 rounded-2xl shadow-[3px_3px_0px_#0D2421] mt-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-black text-[#0D2421]/60 uppercase tracking-widest">Global Round Progression</span>
              <span className="text-[9px] font-black text-[#0D2421] uppercase bg-[#BEF03C] px-2 py-0.5 rounded border border-[#0D2421]">
                Stage {currentPhase} of 4
              </span>
            </div>
            
            {/* Color-shifting dynamic progress bar */}
            <div className="h-4 bg-slate-100 rounded-full border-2 border-[#0D2421] overflow-hidden relative">
              <div 
                className={`h-full transition-all duration-1000 ${progressColorClass}`} 
                style={{ width: `${Math.min(100, (elapsedTime / totalRoundSec) * 100)}%` }} 
              />
            </div>
            
            <div className="grid grid-cols-4 text-[8px] font-black text-[#0D2421]/50 text-center uppercase tracking-wider mt-2.5">
              <span className={currentPhase === 1 ? "text-[#0D2421] font-black bg-amber-400/20 py-0.5 rounded" : ""}>1. Briefing</span>
              <span className={currentPhase === 2 ? "text-[#0D2421] font-black bg-[#BEF03C]/20 py-0.5 rounded" : ""}>2. Pitches</span>
              <span className={currentPhase === 3 ? "text-[#0D2421] font-black bg-[#FFC000]/20 py-0.5 rounded" : ""}>3. Referrals</span>
              <span className={currentPhase === 4 ? "text-[#0D2421] font-black bg-red-100 py-0.5 rounded" : ""}>4. Rotation</span>
            </div>
          </div>
        </div>

        {/* Right Column: Unified Active Step Wizard (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-6 justify-between">
          
          {/* Quick Stage manual jump override tabs */}
          <div className="bg-[#0D2421] p-1.5 rounded-2xl border-2 border-[#0D2421] grid grid-cols-4 gap-1.5 shadow-[4px_4px_0px_#0D2421]">
            {[1, 2, 3, 4].map((phNum) => (
              <button
                key={phNum}
                onClick={() => setManualPhase(phNum)}
                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer text-center ${
                  currentPhase === phNum 
                    ? "bg-[#BEF03C] text-[#0D2421]" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                Stage {phNum}
              </button>
            ))}
          </div>

          {/* Wizard Card Container */}
          <div className={`flex-1 border-3 border-[#0D2421] p-6 md:p-8 rounded-[2.5rem] shadow-[8px_8px_0px_#0D2421] flex flex-col justify-between gap-6 transition-all duration-300 ${
            currentPhase === 1 ? "bg-amber-50" :
            currentPhase === 2 ? "bg-[#FAF8F4]" :
            currentPhase === 3 ? "bg-yellow-50" : "bg-red-50"
          }`}>
            
            {/* Step Header */}
            <div className="flex justify-between items-center border-b-2 border-dashed border-[#0D2421]/15 pb-4">
              <div>
                <span className="text-[9px] font-black tracking-widest text-[#0D2421]/40 uppercase block">Active Facilitation Step</span>
                <h4 className="font-black text-sm uppercase text-[#0D2421]">
                  {currentPhase === 1 && "📢 Table Welcoming"}
                  {currentPhase === 2 && "🎙️ Participant Pitches"}
                  {currentPhase === 3 && "📨 Referral Exchange"}
                  {currentPhase === 4 && "🔄 Table Transition"}
                </h4>
              </div>
              <span className="px-2 py-0.5 bg-[#0D2421] text-white border border-[#0D2421] rounded text-[8px] font-black uppercase">
                Step {currentPhase} of 4
              </span>
            </div>

            {/* Dynamic Content, Scripts and Helpers */}
            <div className="space-y-4 flex-1">
              
              {/* Giant Captain Script Prompt */}
              <div className="bg-white p-5 rounded-2xl border-2 border-[#0D2421] space-y-2 relative shadow-[3px_3px_0px_#0D2421]">
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-[#0D2421] text-[#BEF03C] border border-[#0D2421] rounded text-[8px] font-black uppercase tracking-wider">
                  📢 Script - Read Aloud
                </div>
                
                {currentPhase === 1 && (
                  <p className="text-sm font-bold leading-relaxed text-[#0D2421] italic pt-1">
                    {"Welcome to Table " + tableNumber + "! I am your captain. We have " + round.durationMinutes + " minutes to network. Each of you gets " + (pitchDurationSec === 60 ? "1 minute" : "30 seconds") + " to speak, 30 seconds for referral, then we switch tables. Let's begin!"}
                  </p>
                )}

                {currentPhase === 2 && (
                  <div>
                    {activeSpeakerId ? (
                      <p className="text-sm font-bold leading-relaxed text-[#0D2421] italic pt-1">
                        {"\"Thank you. Let's listen closely to " + (allParticipants.find(p => p.id === activeSpeakerId)?.name || "the speaker") + "'s pitches and requirements. Keep notes of referrals!\""}
                      </p>
                    ) : nextToPitch ? (
                      <p className="text-sm font-bold leading-relaxed text-[#0D2421] italic pt-1">
                        {"\"Next speaker is " + nextToPitch.name + " (" + nextToPitch.businessCategory + "). Share your requirements and target categories. Go!\""}
                      </p>
                    ) : (
                      <p className="text-sm font-bold leading-relaxed text-[#0D2421] italic pt-1">
                        {"\"Everyone has pitched! Let's start the referral turn cycles now. Each person gets 30 seconds to share their target connection categories.\""}
                      </p>
                    )}
                  </div>
                )}

                {currentPhase === 3 && (
                  <div>
                    {activeSpeakerId ? (
                      <p className="text-sm font-bold leading-relaxed text-[#0D2421] italic pt-1">
                        {"\"Thank you. Let's hear " + (allParticipants.find(p => p.id === activeSpeakerId)?.name || "the speaker") + "'s referral requests. Open your dashboard and write down notes for them!\""}
                      </p>
                    ) : nextToRefer ? (
                      <p className="text-sm font-bold leading-relaxed text-[#0D2421] italic pt-1">
                        {"\"Next speaker is " + nextToRefer.name + " (" + nextToRefer.businessCategory + "). Share your referral needs in 30 seconds. Go!\""}
                      </p>
                    ) : (
                      <p className="text-sm font-bold leading-relaxed text-[#0D2421] italic pt-1">
                        {"\"All referral turns are finished! Let's prepare to rotate tables.\""}
                      </p>
                    )}
                  </div>
                )}

                {currentPhase === 4 && (
                  <p className="text-sm font-bold leading-relaxed text-[#0D2421] italic pt-1">
                    {"\"Awesome job everyone! Time is up. Please collect your items, say goodbye, and stand by for table rotations from the admin.\""}
                  </p>
                )}
              </div>

              {/* Action items list */}
              <div className="space-y-2 mt-4 bg-white/50 p-4 rounded-xl border border-[#0D2421]/10">
                <span className="text-[9px] font-black uppercase text-[#0D2421]/60 tracking-wider">To-Do Checklist</span>
                <ul className="space-y-1.5 text-xs text-[#0D2421]/80 font-bold">
                  {currentPhase === 1 && (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-500 font-black">✔</span> Greet all members around the table
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-500 font-black">✔</span> Ensure they have opened their dashboards
                      </li>
                    </>
                  )}

                  {currentPhase === 2 && (
                    <>
                      {activeSpeakerId ? (
                        <>
                          <li className="flex items-center gap-2 text-[#0D2421]">
                            <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping flex-shrink-0" />
                            <span>Currently speaking: {allParticipants.find(p => p.id === activeSpeakerId)?.name}</span>
                          </li>
                          <li className="flex items-center gap-2 text-red-500">
                            <span>🚨</span> Gently cut speakers off when the time expires
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-center gap-2">
                            <span className="text-emerald-500 font-black">✔</span> Click below to start the next speaker
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-slate-400 font-black">○</span> Spoken: {Object.values(pitchedUsers).filter(Boolean).length} / {allParticipants.length - 1} members
                          </li>
                        </>
                      )}
                    </>
                  )}

                  {currentPhase === 3 && (
                    <>
                      {activeSpeakerId ? (
                        <>
                          <li className="flex items-center gap-2 text-[#0D2421]">
                            <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping flex-shrink-0" />
                            <span>Currently speaking (Referrals): {allParticipants.find(p => p.id === activeSpeakerId)?.name}</span>
                          </li>
                          <li className="flex items-center gap-2 text-red-500">
                            <span>🚨</span> Gently cut speakers off when the 30s expires
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-center gap-2">
                            <span className="text-emerald-500 font-black">✔</span> Click below to start the next speaker&apos;s referral turn
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-slate-400 font-black">○</span> Completed: {Object.values(referredUsers).filter(Boolean).length} / {allParticipants.length - 1} members
                          </li>
                        </>
                      )}
                    </>
                  )}

                  {currentPhase === 4 && (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="text-amber-500 font-black">✔</span> Instruct attendees to pack materials
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[#0D2421]/50 font-black">○</span> Keep dashboard open for auto-redirect
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Giant Autopilot Action Button Area */}
            <div className="space-y-4 pt-4 border-t-2 border-dashed border-[#0D2421]/10">
              
              {/* Special Speaker adjustments (only shown in Stage 2 or 3 when speaker is active) */}
              {(currentPhase === 2 || currentPhase === 3) && activeSpeakerId && (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => addExtraTime(15)}
                    className="flex-1 py-3 bg-[#FAF8F4] hover:bg-slate-100 text-[#0D2421] border-2 border-[#0D2421] rounded-2xl font-black uppercase text-xs shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer text-center"
                  >
                    ➕ Add 15s
                  </button>
                  <button
                    onClick={() => addExtraTime(30)}
                    className="flex-1 py-3 bg-[#FAF8F4] hover:bg-slate-100 text-[#0D2421] border-2 border-[#0D2421] rounded-2xl font-black uppercase text-xs shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer text-center"
                  >
                    ➕ Add 30s
                  </button>
                </div>
              )}

              {/* Main control action button */}
              <div>
                {currentPhase === 1 && (
                  <button 
                    onClick={handleAutopilotAction}
                    className="w-full py-5 bg-[#BEF03C] hover:bg-[#aee030] text-[#0D2421] border-3 border-[#0D2421] rounded-[1.5rem] font-black uppercase text-base shadow-[5px_5px_0px_#0d2421] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer text-center flex items-center justify-center gap-2 animate-button-glow"
                  >
                    🚀 Start Member Pitches
                  </button>
                )}

                {currentPhase === 2 && (
                  <button 
                    onClick={handleAutopilotAction}
                    className={`w-full py-5 border-3 border-[#0D2421] rounded-[1.5rem] font-black uppercase text-base hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer text-center flex items-center justify-center gap-2 ${
                      activeSpeakerId 
                        ? "bg-red-400 hover:bg-red-300 text-white shadow-[5px_5px_0px_#0d2421]"
                        : "bg-[#BEF03C] hover:bg-[#aee030] text-[#0D2421] shadow-[5px_5px_0px_#0d2421] animate-button-glow"
                    }`}
                  >
                    {activeSpeakerId ? (
                      <>⏹️ Finish Speaker&apos;s Pitch</>
                    ) : nextToPitch ? (
                      <>🎙️ Start Pitch: {nextToPitch.name}</>
                    ) : (
                      <>💬 Start Referral Exchange</>
                    )}
                  </button>
                )}

                {currentPhase === 3 && (
                  <button 
                    onClick={handleAutopilotAction}
                    className={`w-full py-5 border-3 border-[#0D2421] rounded-[1.5rem] font-black uppercase text-base hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer text-center flex items-center justify-center gap-2 ${
                      activeSpeakerId 
                        ? "bg-red-400 hover:bg-red-300 text-white shadow-[5px_5px_0px_#0d2421]"
                        : "bg-[#BEF03C] hover:bg-[#aee030] text-[#0D2421] shadow-[5px_5px_0px_#0d2421] animate-button-glow"
                    }`}
                  >
                    {activeSpeakerId ? (
                      <>⏹️ Finish Referral Turn</>
                    ) : nextToRefer ? (
                      <>📨 Start Referral: {nextToRefer.name}</>
                    ) : (
                      <>🔄 Move to Table Rotation</>
                    )}
                  </button>
                )}

                {currentPhase === 4 && (
                  <div className="w-full py-4 bg-red-100 text-red-700 border-2 border-[#0D2421] rounded-[1.5rem] font-black uppercase text-xs tracking-widest text-center shadow-[4px_4px_0px_#0D2421] animate-pulse">
                    ⌛ Round Ended - Stand By for Rotation
                  </div>
                )}
              </div>

              {/* Reset to Auto button if manual stage selected */}
              {manualPhase !== null && (
                <button
                  onClick={() => setManualPhase(null)}
                  className="w-full py-2 bg-white hover:bg-slate-50 border border-[#0D2421]/30 rounded-xl text-[9px] font-black uppercase text-[#0D2421]/60 tracking-wider transition-all cursor-pointer"
                >
                  Reset to Auto-Sync Timeline
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SEAT CARDS GRID (Attendees Control Board) ── */}
      <div className="bg-white border-3 border-[#0D2421] p-6 rounded-[2.5rem] shadow-[8px_8px_0px_#0D2421] space-y-6">
        <div className="flex justify-between items-center border-b-2 border-dashed border-[#0D2421]/15 pb-4">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black tracking-widest text-[#0D2421]/50 uppercase block">02 / ATTENDEES BOARD</span>
            <h3 className="font-black text-lg uppercase text-[#0D2421]">Table Member Seats</h3>
          </div>
          <div className="bg-[#FAF8F4] border-2 border-[#0D2421] px-4 py-1.5 rounded-xl text-xs font-black shadow-[2.5px_2.5px_0px_#0D2421]">
            <span>
              {currentPhase === 4 
                ? "Completed" 
                : currentPhase === 3 
                  ? "Referred" 
                  : "Pitched"}
              :{" "}
              {currentPhase === 4
                ? allParticipants.filter(p => !p.isCaptain && pitchedUsers[p.id] && referredUsers[p.id]).length
                : Object.values(currentPhase === 3 ? referredUsers : pitchedUsers).filter(Boolean).length}
              /{" "}
              {allParticipants.filter((p) => !p.isCaptain).length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {allParticipants.map((p) => {
            const isSpeaker = activeSpeakerId === p.id;
            const hasCompleted = currentPhase === 4 
              ? (pitchedUsers[p.id] && referredUsers[p.id])
              : currentPhase === 3 
                ? referredUsers[p.id] 
                : pitchedUsers[p.id];

            return (
              <div
                key={p.id}
                className={`border-2 border-[#0D2421] p-4 rounded-2xl flex flex-col justify-between gap-4 transition-all duration-300 relative ${
                  isSpeaker 
                    ? "bg-[#BEF03C]/10 border-[#BEF03C] shadow-[4px_4px_0px_#0D2421] scale-[1.02] ring-2 ring-[#0D2421]" 
                    : hasCompleted
                      ? "bg-[#0D2421]/5 border-[#0D2421]/40 opacity-70"
                      : "bg-white shadow-[4px_4px_0px_#0D2421]"
                }`}
              >
                {/* Status Badges & Action Vector */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {p.isCaptain ? (
                      <span className="px-2 py-0.5 bg-amber-400 text-[#0D2421] border border-[#0D2421] rounded text-[8px] font-black uppercase">
                        👑 Captain
                      </span>
                    ) : isSpeaker ? (
                      <span className="px-2 py-0.5 bg-[#BEF03C] text-[#0D2421] border border-[#0D2421] rounded text-[8px] font-black uppercase animate-pulse">
                        {speakerTimerType === "PITCH" ? "🎙️ Speaking" : "📨 Referring"}
                      </span>
                    ) : hasCompleted ? (
                      <span className="px-2 py-0.5 bg-[#0D2421] text-[#BEF03C] rounded text-[8px] font-black uppercase">
                        ✓ Done
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-300 rounded text-[8px] font-black uppercase">
                        ⏳ Waiting
                      </span>
                    )}
                  </div>
                  
                  {/* Top Right Vector / Checkbox slot (prevents mixing/overlapping) */}
                  {!p.isCaptain && (
                    <div className="flex-shrink-0">
                      {isSpeaker ? (
                        /* Beautiful animated microphone vector in place of the checkbox when speaking */
                        <div className="relative flex items-center justify-center w-7 h-7 bg-[#BEF03C]/10 border-2 border-[#0D2421] rounded-lg">
                          <span className="absolute inset-0.5 rounded bg-[#BEF03C]/30 animate-ping" />
                          <svg className="w-4 h-4 text-[#0D2421] relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" className="fill-[#BEF03C]" />
                            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                          </svg>
                        </div>
                      ) : (
                        /* Manual checkbox toggle check when not active speaker */
                        <button
                          onClick={() => {
                            if (currentPhase === 3) {
                              setReferredUsers(prev => ({ ...prev, [p.id]: !prev[p.id] }));
                            } else if (currentPhase === 4) {
                              // In Phase 4, toggle both pitch and referral states together
                              const nextVal = !(pitchedUsers[p.id] && referredUsers[p.id]);
                              setPitchedUsers(prev => ({ ...prev, [p.id]: nextVal }));
                              setReferredUsers(prev => ({ ...prev, [p.id]: nextVal }));
                            } else {
                              setPitchedUsers(prev => ({ ...prev, [p.id]: !prev[p.id] }));
                            }
                          }}
                          className={`w-5 h-5 rounded-md border-2 border-[#0D2421] flex items-center justify-center font-black text-[10px] cursor-pointer hover:bg-slate-100 shadow-[1px_1px_0px_#0D2421] transition-all active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none ${
                            hasCompleted ? "bg-[#BEF03C]" : "bg-white"
                          }`}
                          title={hasCompleted ? "Mark as waiting" : "Mark as completed"}
                        >
                          {hasCompleted ? "✓" : ""}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Speaker Info */}
                <div className="space-y-1">
                  <h4 className={`font-black text-sm uppercase truncate ${
                    hasCompleted ? "text-[#0D2421]/50" : "text-[#0D2421]"
                  }`}>
                    {p.name}
                  </h4>
                  <p className="text-[10px] font-bold text-[#0D2421]/50 uppercase tracking-wide truncate">
                    {p.businessCategory}
                  </p>
                </div>

                {/* State-Based Primary Action Button */}
                <div className="pt-2 border-t border-[#0D2421]/10">
                  {p.isCaptain ? (
                    <div className="text-[9px] font-black text-amber-600/70 uppercase text-center py-2">
                      Facilitator Role
                    </div>
                  ) : currentPhase === 4 ? (
                    <div className="text-[9px] font-black text-[#0D2421]/40 uppercase text-center py-2">
                      ✓ Round Finished
                    </div>
                  ) : isSpeaker ? (
                    <button
                      onClick={stopSpeakerTimer}
                      className="w-full py-2 bg-red-400 hover:bg-red-300 text-white border-2 border-[#0D2421] rounded-xl text-[10px] font-black uppercase shadow-[2px_2px_0px_#0D2421] cursor-pointer text-center"
                    >
                      ⏹️ Stop & Finish
                    </button>
                  ) : hasCompleted ? (
                    <button
                      onClick={() => {
                        // Undo completed, and start timer immediately
                        if (currentPhase === 3) {
                          setReferredUsers(prev => ({ ...prev, [p.id]: false }));
                          startSpeakerTimer(p.id, 30, "REFERRAL");
                        } else {
                          setPitchedUsers(prev => ({ ...prev, [p.id]: false }));
                          startSpeakerTimer(p.id, pitchDurationSec, "PITCH");
                        }
                      }}
                      className="w-full py-2 bg-white hover:bg-slate-50 text-[#0D2421]/60 border-2 border-[#0D2421]/30 rounded-xl text-[10px] font-black uppercase cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <span>↺ Reset & Re-start</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (currentPhase === 3) {
                          startSpeakerTimer(p.id, 30, "REFERRAL");
                        } else {
                          startSpeakerTimer(p.id, pitchDurationSec, "PITCH");
                        }
                      }}
                      className="w-full py-2 bg-[#BEF03C] hover:bg-[#aee030] text-[#0D2421] border-2 border-[#0D2421] rounded-xl text-[10px] font-black uppercase shadow-[2.5px_2.5px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                    >
                      {currentPhase === 3 ? (
                        <span>📨 Start Referral (30s)</span>
                      ) : (
                        <span>🎙️ Start Pitch ({pitchDurationSec}s)</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SEND REFERRALS GRID (Captain Participation) ── */}
      <div className="bg-white border-3 border-[#0D2421] p-6 rounded-[2.5rem] shadow-[8px_8px_0px_#0D2421] space-y-6">
        <div className="flex justify-between items-center border-b-2 border-dashed border-[#0D2421]/15 pb-4">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black tracking-widest text-[#0D2421]/50 uppercase block">03 / YOUR REFERRALS</span>
            <h3 className="font-black text-lg uppercase text-[#0D2421]">Send Referrals to Members</h3>
          </div>
          <span className="text-xs font-black uppercase bg-[#BEF03C] text-[#0D2421] px-3.5 py-1.5 rounded-xl border-2 border-[#0D2421] shadow-[2.5px_2.5px_0px_#0D2421]">
            Captain Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tableUsers.map((tu: any) => (
            <UserCard key={tu.user.id} tu={tu} />
          ))}
          {tableUsers.length === 0 && (
            <div className="col-span-full py-10 text-center text-xs font-bold text-[#0D2421]/40 uppercase tracking-wider">
              No members at this table to send referrals to.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
