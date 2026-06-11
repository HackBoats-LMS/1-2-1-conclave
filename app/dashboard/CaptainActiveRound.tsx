"use client";

import React, { useState, useEffect, useRef } from "react";
import { UserCard } from "./UserCard";
import { supabase } from "@/lib/supabaseClient";

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
    status?: string;
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
  const [maxUnlockedPhase, setMaxUnlockedPhase] = useState<number>(1);
  const [pitchedUsers, setPitchedUsers] = useState<Record<string, boolean>>({});
  const [referredUsers, setReferredUsers] = useState<Record<string, boolean>>({});
  const [windowWidth, setWindowWidth] = useState(1024);
  const [briefingTimeLeft, setBriefingTimeLeft] = useState<number | null>(null);
  const [briefingStarted, setBriefingStarted] = useState(false);
  
  // Sound mute state stored in local storage
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("conclave_captain_muted") === "true";
    }
    return false;
  });

  const speakerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const startSpeakerTimerRef = useRef<(participantId: string, durationSec: number, type: "PITCH" | "REFERRAL") => void>(() => {});
  const isMutedRef = useRef(false);
  const speakerEndTimeRef = useRef<number | null>(null);
  const briefingEndTimeRef = useRef<number | null>(null);
  const tickCountRef = useRef(0);
  const [isChannelConnected, setIsChannelConnected] = useState(false);

  useEffect(() => {
    // Initialize realtime broadcast channel for table members
    const channelName = `room_${round.id}_table_${tableNumber}`;
    const channel = supabase.channel(channelName);
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsChannelConnected(true);
      }
    });
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [round.id, tableNumber]);

  // Track window resizing for responsive circular coordinates
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWindowWidth(window.innerWidth);
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Calculate elapsed time since round started
  useEffect(() => {
    if (!round.startTime) return;
    
    if (round.status?.startsWith("PAUSED_")) {
      const pausedElapsed = parseInt(round.status.split("_")[1]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsedTime(Math.max(0, pausedElapsed || 0));
      return;
    }
    
    const startTimeMs = new Date(round.startTime).getTime();
    
    const updateElapsed = () => {
      const now = new Date().getTime();
      const elapsedSec = Math.floor((now - startTimeMs) / 1000);
      setElapsedTime(Math.max(0, elapsedSec));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [round.startTime, round.status]);

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

  useEffect(() => {
    allParticipantsRef.current = allParticipants;
    pitchedUsersRef.current = pitchedUsers;
    referredUsersRef.current = referredUsers;
  }, [allParticipants, pitchedUsers, referredUsers]);
  
  const pitchDurationSec = 60; // 60s for all pitches

  // Keep muted ref in sync
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Speaker timer countdown logic — wall-clock based for accuracy
  useEffect(() => {
    if (speakerTimeLeft === null) return;
    
    if (speakerTimeLeft <= 0) {
      const currentId = activeSpeakerId;
      const currentType = speakerTimerType;
      speakerEndTimeRef.current = null;

      // Mark user as completed when their timer ends
      if (currentId && currentType === "PITCH") {
        setPitchedUsers(prev => ({ ...prev, [currentId]: true }));
      }
      if (currentId && currentType === "REFERRAL") {
        setReferredUsers(prev => ({ ...prev, [currentId]: true }));
      }
      
      // Clear active speaker states
      setSpeakerTimeLeft(null);
      setActiveSpeakerId(null);
      setSpeakerTimerType(null);
      
      // Play success chime if not muted
      if (!isMutedRef.current) {
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
        } catch (_err) {}
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
          if (candidate.id !== currentId && !pitched[candidate.id]) {
            nextSpeaker = candidate;
            break;
          }
        }

        if (nextSpeaker) {
          const nextId = nextSpeaker.id;
          transitionTimeoutRef.current = setTimeout(() => {
            startSpeakerTimerRef.current(nextId, pitchDurationSec, "PITCH");
          }, 800);
        } else {
          setManualPhase(3);
        }
      }


      return;
    }

    // Wall-clock tick: recalculate from end time every 250ms for accuracy
    speakerIntervalRef.current = setInterval(() => {
      if (!speakerEndTimeRef.current) return;
      const remaining = Math.max(0, Math.ceil((speakerEndTimeRef.current - Date.now()) / 1000));
      setSpeakerTimeLeft(remaining);

      // Broadcast heartbeat sync every 1 second (4 * 250ms)
      tickCountRef.current += 1;
      if (tickCountRef.current % 4 === 0 && isChannelConnected && activeSpeakerId && speakerTimerType) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'timer_sync',
          payload: {
            userId: activeSpeakerId,
            durationSec: remaining,
            type: speakerTimerType,
            targetEndTime: speakerEndTimeRef.current
          }
        });
      }
    }, 250);

    return () => {
      if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakerTimeLeft, activeSpeakerId, speakerTimerType, pitchDurationSec, isChannelConnected]);

  // Clean up transitions only on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    }
  }, []);

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

  if (currentPhase > maxUnlockedPhase) {
    setMaxUnlockedPhase(currentPhase);
  }

  // ── FULLY AUTOMATED MODE ──
  // Phase 1: Auto-start the 60-second captain briefing countdown as soon as round launches
  useEffect(() => {
    if (!round.startTime || round.status?.startsWith("PAUSED_")) return;
    if (currentPhase === 1 && !briefingStarted) {
      setBriefingStarted(true);
      const briefingDuration = 60;
      const alreadyElapsed = elapsedTime;
      const remaining = Math.max(0, briefingDuration - alreadyElapsed);
      briefingEndTimeRef.current = Date.now() + remaining * 1000;
      setBriefingTimeLeft(remaining);
    }
  }, [round.startTime, round.status, currentPhase, briefingStarted, elapsedTime]);

  // Briefing countdown — wall-clock based
  useEffect(() => {
    if (briefingTimeLeft === null || briefingTimeLeft <= 0) return;
    const interval = setInterval(() => {
      if (!briefingEndTimeRef.current) return;
      const remaining = Math.max(0, Math.ceil((briefingEndTimeRef.current - Date.now()) / 1000));
      setBriefingTimeLeft(remaining);
    }, 250);
    return () => clearInterval(interval);
  }, [briefingTimeLeft]);

  // When briefing countdown hits 0, just clear the UI state.
  // The system automatically advances to Phase 2 because elapsedTime >= 60s.
  useEffect(() => {
    if (briefingTimeLeft !== null && briefingTimeLeft <= 0) {
      setBriefingTimeLeft(null);
    }
  }, [briefingTimeLeft]);

  // Phase 1→2 transition: when Phase 2 starts (either by timer reaching 60s or skip button), auto-start first pitcher
  useEffect(() => {
    if (!round.startTime || round.status?.startsWith("PAUSED_")) return;

    if (currentPhase === 2 && !activeSpeakerId && Object.keys(pitchedUsers).length === 0) {
      const first = allParticipantsRef.current.find(p => !pitchedUsersRef.current[p.id]);
      if (first) {
        // Use setTimeout to ensure state updates from above have flushed
        setTimeout(() => {
          startSpeakerTimerRef.current(first.id, pitchDurationSec, "PITCH");
        }, 100);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, activeSpeakerId, pitchedUsers, round.startTime, round.status, pitchDurationSec]);

  // Referrals Auto-Start / Auto-Advance Orchestrator
  useEffect(() => {
    if (!round.startTime || round.status?.startsWith("PAUSED_")) return;

    if (currentPhase === 3 && !activeSpeakerId) {
      const nextSpeaker = allParticipantsRef.current.find(p => !referredUsersRef.current[p.id]);
      if (nextSpeaker) {
        const nextId = nextSpeaker.id;
        const timer = setTimeout(() => {
          startSpeakerTimerRef.current(nextId, 30, "REFERRAL");
        }, 800); // 800ms brief transition pause
        return () => clearTimeout(timer);
      } else {
        // No one left to refer, automatically advance to table rotation (Phase 4)
        setManualPhase(4);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, activeSpeakerId, referredUsers, round.startTime, round.status]);

  // Calculate dynamic radius and avatar sizing based on participant count to prevent overlaps
  const N = allParticipants.length;
  const isMobile = windowWidth < 768;
  // const radius = isMobile
  //   ? (N > 15 ? 65 : N > 10 ? 72 : 68)
  //   : (N > 15 ? 130 : N > 10 ? 115 : 95);

  // const avatarSizeClass = isMobile
  //   ? (N > 15 ? "w-6 h-6 text-[8px]" : N > 10 ? "w-7 h-7 text-[9px] border-2" : "w-9 h-9 text-xs border-2")
  //   : (N > 15 ? "w-6 h-6 text-[8px]" : N > 10 ? "w-8 h-8 text-[9px] border-2" : "w-11 h-11 text-xs border-2");

  // Identify next recommended pitcher / referrer
  const nextToPitch = allParticipants.find(p => !pitchedUsers[p.id]);
  const nextToRefer = allParticipants.find(p => !referredUsers[p.id]);

  const hasUnpitched = !!nextToPitch;
  const hasUnreferred = !!nextToRefer;

  // Auto-advance to Phase 3 when all pitches are completed
  useEffect(() => {
    if (!round.startTime || round.status?.startsWith("PAUSED_")) return;
    if (currentPhase === 2 && !activeSpeakerId && !hasUnpitched) {
      setManualPhase(3);
    }
  }, [currentPhase, activeSpeakerId, hasUnpitched, round.startTime, round.status]);




  function startSpeakerTimer(participantId: string, durationSec: number, type: "PITCH" | "REFERRAL") {
    if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    
    // Mark previous speaker as completed if switching directly
    if (activeSpeakerId && activeSpeakerId !== participantId) {
      if (speakerTimerType === "PITCH") {
        setPitchedUsers(prev => ({ ...prev, [activeSpeakerId]: true }));
      } else if (speakerTimerType === "REFERRAL") {
        setReferredUsers(prev => ({ ...prev, [activeSpeakerId]: true }));
      }
    }

    // Set wall-clock end time
    speakerEndTimeRef.current = Date.now() + durationSec * 1000;

    setActiveSpeakerId(participantId);
    setSpeakerDuration(durationSec);
    setSpeakerTimeLeft(durationSec);
    setSpeakerTimerType(type);

    // Auto-advance manualPhase to keep the UI in sync
    if (type === "PITCH" && currentPhase === 1) {
      setManualPhase(2);
    } else if (type === "REFERRAL" && currentPhase < 3) {
      setManualPhase(3);
    }

    // Broadcast to UserCards on all screens at this table
    channelRef.current?.send({
      type: 'broadcast',
      event: 'timer_start',
      payload: {
        userId: participantId,
        durationSec,
        type,
        timestamp: Date.now()
      }
    });
  }

  // Keep the ref always pointing to the latest version of startSpeakerTimer
  startSpeakerTimerRef.current = startSpeakerTimer;

  const stopSpeakerTimer = () => {
    if (speakerIntervalRef.current) clearInterval(speakerIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    speakerEndTimeRef.current = null;
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

    // Broadcast stop
    channelRef.current?.send({
      type: 'broadcast',
      event: 'timer_stop',
      payload: {
        userId: activeSpeakerId
      }
    });
  };

  const addExtraTime = (seconds: number) => {
    if (speakerTimeLeft !== null && activeSpeakerId && speakerTimerType) {
      const newDuration = speakerDuration + seconds;
      setSpeakerDuration(newDuration);
      
      // Update the wall-clock target time
      if (speakerEndTimeRef.current) {
        speakerEndTimeRef.current += seconds * 1000;
        const remaining = Math.max(0, Math.ceil((speakerEndTimeRef.current - Date.now()) / 1000));
        setSpeakerTimeLeft(remaining);

        // Broadcast the extension to everyone's devices
        channelRef.current?.send({
          type: 'broadcast',
          event: 'timer_start',
          payload: {
            userId: activeSpeakerId,
            durationSec: remaining,
            type: speakerTimerType,
            timestamp: Date.now()
          }
        });
      }
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
      const first = allParticipants.find(p => !pitchedUsers[p.id]);
      if (first) {
        startSpeakerTimer(first.id, pitchDurationSec, "PITCH");
      }
    } else if (currentPhase === 2) {
      if (activeSpeakerId) {
        // Finish current speaker, advance to next
        const currentId = activeSpeakerId;
        stopSpeakerTimer();
        setPitchedUsers(prev => ({ ...prev, [currentId]: true }));

        const next = allParticipants.find(p => p.id !== currentId && !pitchedUsers[p.id]);
        if (next) {
          startSpeakerTimer(next.id, pitchDurationSec, "PITCH");
        } else {
          // No one left, advance to referrals
          setManualPhase(3);
        }
      } else {
        // No active speaker, start the next speaker
        const next = allParticipants.find(p => !pitchedUsers[p.id]);
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

        const next = allParticipants.find(p => p.id !== currentId && !referredUsers[p.id]);
        if (next) {
          startSpeakerTimer(next.id, 30, "REFERRAL");
        } else {
          // No one left, advance to table transition
          setManualPhase(4);
        }
      } else {
        // No active speaker, start the next speaker's referral turn
        const next = allParticipants.find(p => !referredUsers[p.id]);
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
  // const strokeDashoffset = speakerTimeLeft !== null
  //   ? svgCircumference - (svgCircumference * speakerTimeLeft) / speakerDuration
  //   : svgCircumference;

  // Determine global progress color
  // let progressColorClass = "bg-emerald-500";
  // if (currentPhase === 3) progressColorClass = "bg-[#FFC000]";
  // if (currentPhase === 4) progressColorClass = "bg-red-400";

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

      {/* ── CENTRAL WIZARD ── */}
      <div className="flex flex-col space-y-6">
        
        {/* Header row with timer & sound control */}
        <div className="flex flex-wrap justify-between items-center bg-white border-3 border-[#0D2421] p-4 md:p-6 rounded-[1.5rem] shadow-[4px_4px_0px_#0D2421]">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black tracking-widest text-[#0D2421]/50 uppercase block">01 / LIVE ORCHESTRATION</span>
            <h3 className="font-black text-lg uppercase text-[#0D2421]">Round Facilitation</h3>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="bg-[#FAF8F4] border-2 border-[#0D2421] px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-[2.5px_2.5px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer flex items-center gap-1.5"
              title={isMuted ? "Unmute alert chime" : "Mute alert chime"}
            >
              <span>{isMuted ? "🔇 Muted" : "🔊 Sound ON"}</span>
            </button>

            <div className={`bg-[#0D2421] text-white border-2 border-[#0D2421] px-4 py-1.5 rounded-xl text-xs font-black tracking-wider shadow-[2.5px_2.5px_0px_#BEF03C] flex items-center gap-2 ${round.status?.startsWith("PAUSED_") ? "text-amber-400 animate-pulse border-amber-400 shadow-[2.5px_2.5px_0px_#F59E0B]" : ""}`}>
              <span>{round.status?.startsWith("PAUSED_") ? "PAUSED: " : "Timer: "} {formatTime(remainingRoundSec)}</span>
            </div>
          </div>
        </div>
          
        {/* Quick Stage manual jump override tabs */}
        <div className="bg-[#0D2421] p-1.5 rounded-2xl border-2 border-[#0D2421] grid grid-cols-2 sm:grid-cols-4 gap-1.5 shadow-[4px_4px_0px_#0D2421]">
          {[1, 2, 3, 4].map((phNum) => {
            const isUnlocked = phNum <= maxUnlockedPhase;
            return (
              <button
                key={phNum}
                onClick={() => isUnlocked && setManualPhase(phNum)}
                disabled={!isUnlocked}
                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all text-center ${
                  currentPhase === phNum 
                    ? "bg-[#BEF03C] text-[#0D2421]" 
                    : isUnlocked
                      ? "text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                      : "text-white/20 cursor-not-allowed"
                }`}
              >
                {isUnlocked ? `Stage ${phNum}` : `🔒 Stage ${phNum}`}
              </button>
            );
          })}
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
                    {"Welcome to Table " + tableNumber + "! I am your captain. We have " + round.durationMinutes + " minutes to network. Each of you gets 1 minute to speak, 30 seconds for referral, then we switch tables. Let's begin!"}
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
                            <span className="text-emerald-500 font-black">✔</span> Referral turns will start and progress automatically
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
                  <div className="flex flex-col gap-3">
                    {/* Auto-running briefing countdown */}
                    {briefingTimeLeft !== null && briefingTimeLeft > 0 && (
                      <div className="w-full py-6 bg-amber-400 text-[#0D2421] border-3 border-[#0D2421] rounded-[1.5rem] font-black uppercase text-center shadow-[5px_5px_0px_#0d2421] space-y-1">
                        <div className="text-[10px] tracking-widest opacity-70">Captain Briefing Time</div>
                        <div className="text-4xl tabular-nums">{Math.floor(briefingTimeLeft / 60).toString().padStart(2, '0')}:{(briefingTimeLeft % 60).toString().padStart(2, '0')}</div>
                        <div className="text-[10px] tracking-widest opacity-60">Auto-advancing to pitches when done</div>
                      </div>
                    )}

                    {/* Skip briefing button */}
                    <button 
                      onClick={handleAutopilotAction}
                      className="w-full py-4 bg-[#BEF03C] hover:bg-[#aee030] text-[#0D2421] border-3 border-[#0D2421] rounded-[1.5rem] font-black uppercase text-sm shadow-[4px_4px_0px_#0d2421] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer text-center flex items-center justify-center gap-2"
                    >
                      ⏩ Skip Briefing &amp; Start Pitches Now
                    </button>
                  </div>
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
                  <div className="w-full">
                    {activeSpeakerId ? (
                      <button 
                        onClick={handleAutopilotAction}
                        className="w-full py-5 border-3 border-[#0D2421] rounded-[1.5rem] font-black uppercase text-base hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer text-center flex items-center justify-center gap-2 bg-red-400 hover:bg-red-300 text-white shadow-[5px_5px_0px_#0d2421]"
                      >
                        ⏹️ Finish Referral Turn
                      </button>
                    ) : nextToRefer ? (
                      <div className="w-full py-5 bg-[#FAF8F4]/50 border-3 border-dashed border-[#0D2421]/20 rounded-[1.5rem] font-black uppercase text-base text-center text-[#0D2421]/40">
                        📨 Starting Referral: {nextToRefer.name}...
                      </div>
                    ) : (
                      <button 
                        onClick={handleAutopilotAction}
                        className="w-full py-5 border-3 border-[#0D2421] rounded-[1.5rem] font-black uppercase text-base hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer text-center flex items-center justify-center gap-2 bg-[#BEF03C] hover:bg-[#aee030] text-[#0D2421] shadow-[5px_5px_0px_#0d2421] animate-button-glow"
                      >
                        🔄 Move to Table Rotation
                      </button>
                    )}
                  </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  {true && (
                    <div className="flex-shrink-0">
                      {isSpeaker ? (
                        <div className="flex items-center gap-3">
                          <span className="font-black text-3xl text-[#BEF03C] drop-shadow-[2px_2px_0px_#0D2421] animate-pulse">
                            {speakerTimeLeft}s
                          </span>
                          {/* Beautiful animated microphone vector in place of the checkbox when speaking */}
                          <div className="relative flex items-center justify-center w-7 h-7 bg-[#BEF03C]/10 border-2 border-[#0D2421] rounded-lg">
                            <span className="absolute inset-0.5 rounded bg-[#BEF03C]/30 animate-ping" />
                            <svg className="w-4 h-4 text-[#0D2421] relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" className="fill-[#BEF03C]" />
                              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                              <line x1="12" y1="19" x2="12" y2="22" />
                            </svg>
                          </div>
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
                  {currentPhase === 4 ? (
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
                  ) : currentPhase === 3 ? (
                    <div className="w-full py-2 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-center">
                      ⏳ Queueing
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        startSpeakerTimer(p.id, pitchDurationSec, "PITCH");
                      }}
                      className="w-full py-2 bg-[#BEF03C] hover:bg-[#aee030] text-[#0D2421] border-2 border-[#0D2421] rounded-xl text-[10px] font-black uppercase shadow-[2.5px_2.5px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                    >
                      <span>🎙️ Start Pitch ({pitchDurationSec}s)</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {tableUsers.map((tu: any) => (
            <UserCard key={tu.user.id} tu={{ ...tu, table: { roundId: round.id, tableNumber } }} />
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
