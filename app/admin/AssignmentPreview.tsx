"use client";

import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CheckIcon, ExclamationTriangleIcon, ArrowDownTrayIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
interface AssignmentUser {
  id: string;
  email: string;
  name: string | null;
  businessName: string | null;
  businessCategory: string | null;
  isCaptain: boolean;
}

interface PreviewTable {
  tableNumber: number;
  users: AssignmentUser[];
}

interface PreviewRound {
  roundNumber: number;
  status: string;
  tables: PreviewTable[];
}

interface PreviewSlot {
  slotNumber: number;
  rounds: PreviewRound[];
}

interface CoverageAnalytics {
  totalMembers: number;
  totalCaptains: number;
  totalRounds: number;
  totalSlots: number;
  totalPairs: number;
  metPairs: number;
  coveragePercent: number;
  unmetPairs: { member1Email: string; member2Email: string }[];
  leftOutMembers: string[];
  totalReferrals: number;
}

interface AssignmentPreviewProps {
  slots: PreviewSlot[];
  analytics: CoverageAnalytics;
}

export function AssignmentPreview({ slots, analytics }: AssignmentPreviewProps) {
  const [expandedSlots, setExpandedSlots] = useState<Set<number>>(new Set([1]));
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());
  const [showUnmetDetails, setShowUnmetDetails] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportAssignmentsPDF = async () => {
    try {
      setIsExporting(true);
      const res = await fetch("/api/export/assignments/json");
      const data = await res.json();
      
      const doc = new jsPDF("landscape");
      doc.text("Conclave Assignments Matrix", 14, 15);
      
      if (data.length === 0) {
        doc.text("No assignments found.", 14, 25);
      } else {
        const headers = Object.keys(data[0]);
        const body = data.map((row: any) => Object.values(row));
        
        autoTable(doc, {
          head: [headers],
          body: body,
          startY: 20,
          styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
          theme: "grid",
        });
      }

      // Load logo for footer
      const img = new Image();
      img.src = '/hb-logo.png';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      
      let dataUrl = "";
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width || 200;
        canvas.height = img.height || 50;
        const ctx = canvas.getContext("2d");
        if (ctx && img.width) {
          ctx.drawImage(img, 0, 0);
          dataUrl = canvas.toDataURL("image/png");
        }
      } catch (err) {
        console.error("Canvas conversion failed", err);
      }

      // Add Powered by HackBoats footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        doc.text("Powered by", pageWidth - 35, pageHeight - 10, { align: "right" });
        try {
          if (dataUrl) {
            doc.addImage(dataUrl, "PNG", pageWidth - 33, pageHeight - 14, 20, 5, 'hb-logo');
          } else {
            doc.addImage(img, "PNG", pageWidth - 33, pageHeight - 14, 20, 5, 'hb-logo');
          }
        } catch (err) {
          console.error("Image add failed", err);
          doc.text("HackBoats", pageWidth - 14, pageHeight - 10, { align: "right" });
        }
      }
      
      doc.save("conclave_assignments.pdf");
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const exportReferralsPDF = async () => {
    try {
      setIsExporting(true);
      const res = await fetch("/api/export/referrals/json");
      const data = await res.json();
      
      const doc = new jsPDF("landscape");
      doc.text("Conclave Referrals Log", 14, 15);
      
      if (data.length === 0) {
        doc.text("No referrals found.", 14, 25);
      } else {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Total Referrals: ${data.length}`, 14, 22);

        const headers = Object.keys(data[0]);
        const body = data.map((row: any) => Object.values(row));
        
        autoTable(doc, {
          head: [headers],
          body: body,
          startY: 28,
          styles: { fontSize: 8 },
          theme: "grid",
        });
      }

      // Add Powered by HackBoats footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Powered by HackBoats", doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 10, { align: "right" });
      }
      
      doc.save("conclave_referrals.pdf");
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleSlot = (slotNum: number) => {
    const next = new Set(expandedSlots);
    if (next.has(slotNum)) next.delete(slotNum);
    else next.add(slotNum);
    setExpandedSlots(next);
  };

  const toggleRound = (key: string) => {
    const next = new Set(expandedRounds);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedRounds(next);
  };

  const isPerfectCoverage = analytics.coveragePercent >= 100;

  return (
    <div className="space-y-8">

      {/* ── Coverage Analytics Card ── */}
      <div className={`border-2 border-[#0D2421] p-6 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-6 ${
        isPerfectCoverage 
          ? 'bg-emerald-50/60' 
          : 'bg-amber-50/60'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[#0D2421] shadow-[2px_2px_0px_#0D2421] ${
              isPerfectCoverage 
                ? 'bg-emerald-400 text-[#0D2421]' 
                : 'bg-amber-400 text-[#0D2421]'
            }`}>
              {isPerfectCoverage ? (
                <CheckIcon className="w-5 h-5" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight">Coverage Analytics</h3>
              <p className={`text-[10px] font-black uppercase tracking-widest ${
                isPerfectCoverage ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {isPerfectCoverage 
                  ? `✅ ALL ${analytics.totalMembers} MEMBERS MEET EVERY OTHER MEMBER`
                  : `⚠️ ${analytics.unmetPairs.length} PAIR(S) COULD NOT BE SCHEDULED`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border-2 border-[#0D2421] text-center shadow-[2px_2px_0px_#0D2421]">
            <div className="text-2xl font-black text-[#0D2421]">{analytics.totalMembers}</div>
            <div className="text-[9px] font-black text-[#0D2421]/50 uppercase tracking-wider">Members</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-2xl border-2 border-[#0D2421] text-center shadow-[2px_2px_0px_#0D2421]">
            <div className="text-2xl font-black text-[#0D2421]">{analytics.totalCaptains}</div>
            <div className="text-[9px] font-black text-[#0D2421]/50 uppercase tracking-wider">Captains</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border-2 border-[#0D2421] text-center shadow-[2px_2px_0px_#0D2421]">
            <div className="text-2xl font-black text-[#0D2421]">{analytics.totalRounds}</div>
            <div className="text-[9px] font-black text-[#0D2421]/50 uppercase tracking-wider">Rounds</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border-2 border-[#0D2421] text-center shadow-[2px_2px_0px_#0D2421]">
            <div className="text-2xl font-black text-[#0D2421]">{analytics.totalSlots}</div>
            <div className="text-[9px] font-black text-[#0D2421]/50 uppercase tracking-wider">Slots</div>
          </div>
          <div className="bg-[#BEF03C] p-4 rounded-2xl border-2 border-[#0D2421] text-center shadow-[2px_2px_0px_#0D2421]">
            <div className="text-2xl font-black text-[#0D2421]">{analytics.totalReferrals || 0}</div>
            <div className="text-[9px] font-black text-[#0D2421]/70 uppercase tracking-wider">Referrals</div>
          </div>
        </div>

        {/* Coverage Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-[#0D2421]/70">Meeting Coverage</span>
            <span className="text-xs font-black uppercase">{analytics.metPairs} / {analytics.totalPairs} pairs</span>
          </div>
          <div className="w-full h-4 bg-white border-2 border-[#0D2421] rounded-full overflow-hidden shadow-inner">
            <div 
              className={`h-full rounded-full transition-all ${isPerfectCoverage ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(analytics.coveragePercent, 100)}%` }}
            ></div>
          </div>
          <div className="text-right">
            <span className={`text-sm font-black ${isPerfectCoverage ? 'text-emerald-600' : 'text-amber-600'}`}>
              {analytics.coveragePercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Left Out Members */}
        {analytics.leftOutMembers.length > 0 && (
          <div className="bg-red-50 border-2 border-[#0D2421] p-4 rounded-xl space-y-2 shadow-[3px_3px_0px_#0D2421]">
            <span className="text-[10px] font-black text-red-700 uppercase tracking-widest block">
              ⛔ MEMBERS LEFT OUT ({analytics.leftOutMembers.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {analytics.leftOutMembers.map(email => (
                <span key={email} className="text-[10px] font-bold bg-white text-[#0D2421] px-2 py-1 rounded-lg border border-[#0D2421]">
                  {email}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Unmet Pairs Details */}
        {analytics.unmetPairs.length > 0 && (
          <div>
            <button 
              onClick={() => setShowUnmetDetails(!showUnmetDetails)}
              className="text-xs font-black uppercase text-amber-800 underline cursor-pointer hover:text-amber-900"
            >
              {showUnmetDetails ? 'Hide' : 'Show'} Unmet Pair Details ({analytics.unmetPairs.length})
            </button>
            {showUnmetDetails && (
              <div className="mt-3 max-h-48 overflow-y-auto bg-white border-2 border-[#0D2421] rounded-xl p-3 space-y-1 shadow-[2px_2px_0px_#0D2421]">
                {analytics.unmetPairs.slice(0, 100).map((pair, i) => (
                  <div key={i} className="text-[10px] font-bold text-amber-800 flex items-center gap-2">
                    <span className="text-amber-500">✗</span>
                    <span>{pair.member1Email}</span>
                    <span className="text-amber-400">↔</span>
                    <span>{pair.member2Email}</span>
                  </div>
                ))}
                {analytics.unmetPairs.length > 100 && (
                  <p className="text-[10px] font-bold text-amber-500 pt-2">...and {analytics.unmetPairs.length - 100} more pairs</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Download Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/api/export/assignments"
              className="flex-1 py-3 bg-white text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase text-center shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Assignments (Excel)
            </a>
            <button
              onClick={exportAssignmentsPDF}
              disabled={isExporting}
              className="flex-1 py-3 bg-[#BEF03C] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase text-center shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Assignments (PDF)
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/api/export/referrals"
              className="flex-1 py-3 bg-white text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase text-center shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Referrals (Excel)
            </a>
            <button
              onClick={exportReferralsPDF}
              disabled={isExporting}
              className="flex-1 py-3 bg-[#0D2421] text-[#BEF03C] border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase text-center shadow-[3px_3px_0px_#BEF03C] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Referrals (PDF)
            </button>
          </div>
        </div>
      </div>

      {/* ── Assignment Preview Accordion ── */}
      <div className="bg-white border-2 border-[#0D2421] rounded-[2rem] shadow-[6px_6px_0px_#0D2421] overflow-hidden">
        <div className="bg-[#0D2421] px-6 py-4 flex justify-between items-center">
          <span className="font-black text-sm text-[#BEF03C] tracking-widest uppercase">
            FULL ASSIGNMENT MATRIX
          </span>
          <span className="text-[10px] font-black text-[#BEF03C]/70 uppercase tracking-widest">
            {slots.length} SLOTS • {slots.reduce((sum, s) => sum + s.rounds.length, 0)} ROUNDS
          </span>
        </div>

        <div className="divide-y-2 divide-[#0D2421]/10">
          {slots.map(slot => (
            <div key={slot.slotNumber}>
              {/* Slot Header */}
              <button
                onClick={() => toggleSlot(slot.slotNumber)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#BEF03C]/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0D2421] text-[#BEF03C] flex items-center justify-center font-black text-xs border border-[#0D2421] shadow-[1.5px_1.5px_0px_#BEF03C]">
                    S{slot.slotNumber}
                  </div>
                  <span className="font-black text-sm uppercase">Slot {slot.slotNumber}</span>
                  <span className="text-[10px] font-bold text-[#0D2421]/40 uppercase">{slot.rounds.length} rounds</span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-[#0D2421]/40 transition-transform ${expandedSlots.has(slot.slotNumber) ? 'rotate-180' : ''}`} />
              </button>

              {/* Slot Content */}
              {expandedSlots.has(slot.slotNumber) && (
                <div className="px-6 pb-6 space-y-4">
                  {slot.rounds.map(round => {
                    const roundKey = `${slot.slotNumber}-${round.roundNumber}`;
                    return (
                      <div key={round.roundNumber} className="border-2 border-[#0D2421]/20 rounded-2xl overflow-hidden">
                        {/* Round Header */}
                        <button
                          onClick={() => toggleRound(roundKey)}
                          className="w-full px-5 py-3 flex items-center justify-between bg-[#FAF8F4] hover:bg-[#BEF03C]/10 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-white border-2 border-[#0D2421] flex items-center justify-center font-black text-xs">
                              R{round.roundNumber}
                            </div>
                            <span className="font-black text-xs uppercase">Round {round.roundNumber}</span>
                            <span className="text-[10px] font-bold text-[#0D2421]/40 uppercase">{round.tables.length} tables</span>
                          </div>
                          <ChevronDownIcon className={`w-4 h-4 text-[#0D2421]/30 transition-transform ${expandedRounds.has(roundKey) ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Round Tables */}
                        {expandedRounds.has(roundKey) && (
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {round.tables.map(table => (
                              <div key={table.tableNumber} className="bg-white border-2 border-[#0D2421]/15 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-xs uppercase text-[#0D2421]">
                                    Table {table.tableNumber}
                                  </span>
                                  <span className="text-[9px] font-black text-[#0D2421]/40 uppercase">
                                    {table.users.length} members
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {table.users.map(user => (
                                    <div 
                                      key={user.id} 
                                      className={`flex items-center gap-2 text-[10px] font-bold px-2 py-1.5 rounded-lg border ${
                                        user.isCaptain 
                                          ? 'bg-amber-100 border-[#0D2421] text-[#0D2421]' 
                                          : 'bg-white border-[#0D2421]/20 text-[#0D2421]/80'
                                      }`}
                                    >
                                      {user.isCaptain && <span className="text-xs">👑</span>}
                                      <span className="truncate">{user.name || user.email}</span>
                                      {user.businessCategory && (
                                        <span className="text-[8px] font-black uppercase text-[#0D2421]/30 ml-auto flex-shrink-0">
                                          {user.businessCategory}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
