"use client";

import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as xlsx from "xlsx";
import { SecureAdminButton } from "./SecureAdminButton";
import { deleteArchivedEvent, updateArchivedEventName } from "./actions/user.actions";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface ArchivedEvent {
  id: string;
  name: string;
  createdAt: Date;
  _count: {
    users: number;
    referrals: number;
  };
}

export function AdminArchiveSection({ events }: { events: ArchivedEvent[] }) {
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleDelete = async (eventId: string, formData: FormData) => {
    formData.append("eventId", eventId);
    await deleteArchivedEvent(formData);
  };

  const handleSaveName = async (eventId: string) => {
    if (!editName.trim()) return;
    const formData = new FormData();
    formData.append("eventId", eventId);
    formData.append("name", editName);
    await updateArchivedEventName(formData);
    setEditingEventId(null);
  };

  const exportReferralsPDF = async (eventId: string, eventName: string, userEmail?: string, userName?: string) => {
    try {
      setExportingId(`pdf-${eventId}${userEmail ? `-${userEmail}` : ''}`);
      let url = `/api/export/archive-admin/referrals/json?eventId=${eventId}`;
      if (userEmail) url += `&userEmail=${encodeURIComponent(userEmail)}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch referrals");
      
      const data = await res.json();
      
      const doc = new jsPDF("landscape");
      doc.text(userName ? `Referrals for ${userName} - ${eventName}` : `Complete Referrals - ${eventName}`, 14, 15);
      
      if (data.length === 0) {
        doc.text("No referrals found for this event.", 14, 25);
      } else {
        const headers = ["Date", "From", "From Email", "To", "To Email", "Note"];
        const body = data.map((r: any) => [
          r["Date"],
          r["From"],
          r["From Email"],
          r["To"],
          r["To Email"],
          r["Note"]
        ]);
        
        autoTable(doc, {
          head: [headers],
          body: body,
          startY: 20,
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
          columnStyles: {
            5: { cellWidth: 80 } // Give the note column more width
          },
          theme: "grid",
        });
      }

      doc.save(`all_referrals_${eventName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF");
    } finally {
      setExportingId(null);
    }
  };

  const exportDirectoryPDF = async (eventId: string, eventName: string) => {
    try {
      setExportingId(`dir-pdf-${eventId}`);
      const res = await fetch(`/api/export/archive-admin/directory/json?eventId=${eventId}`);
      if (!res.ok) throw new Error("Failed to fetch directory");
      
      const data = await res.json();
      
      const doc = new jsPDF("landscape");
      doc.text(`Complete Directory - ${eventName}`, 14, 15);
      
      if (data.length === 0) {
        doc.text("No members found for this event.", 14, 25);
      } else {
        const headers = ["Name", "Email", "Role", "Business Name", "Category", "Contact"];
        const body = data.map((u: any) => [
          u["Name"],
          u["Email"],
          u["Role"],
          u["Business Name"],
          u["Business Category"],
          u["Contact Number"]
        ]);
        
        autoTable(doc, {
          head: [headers],
          body: body,
          startY: 20,
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
          theme: "grid",
        });
      }

      doc.save(`directory_${eventName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF");
    } finally {
      setExportingId(null);
    }
  };

  const exportReferralsExcel = async (eventId: string, eventName: string, userEmail?: string, userName?: string) => {
    try {
      setExportingId(`excel-${eventId}${userEmail ? `-${userEmail}` : ''}`);
      let url = `/api/export/archive-admin/referrals/json?eventId=${eventId}`;
      if (userEmail) url += `&userEmail=${encodeURIComponent(userEmail)}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch referrals");
      
      const data = await res.json();
      const worksheet = xlsx.utils.json_to_sheet(data);
      
      worksheet['!cols'] = [
        { wch: 20 }, // Date
        { wch: 20 }, // From
        { wch: 30 }, // From Email
        { wch: 20 }, // To
        { wch: 30 }, // To Email
        { wch: 50 }, // Note
      ];

      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Referrals");
      xlsx.writeFile(workbook, userName ? `referrals_${userName.replace(/\s+/g, '_').toLowerCase()}.xlsx` : `all_referrals_${eventName.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Failed to export Excel");
    } finally {
      setExportingId(null);
    }
  };

  const exportSummaryReportPDF = async (eventId: string, eventName: string, userCount: number, referralCount: number) => {
    try {
      setExportingId(`report-pdf-${eventId}`);
      const res = await fetch(`/api/export/archive-admin/report?eventId=${eventId}`);
      if (!res.ok) throw new Error("Failed to fetch report data");
      
      const data = await res.json();
      
      // Load HackBoats Logo Image asynchronously
      const img = new Image();
      img.src = '/hb-logo.png';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      // Convert image to Canvas Data URL
      let dataUrl = "";
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, 200, 50);
          ctx.drawImage(img, 0, 0, 200, 50);
          dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        }
      } catch (err) {
        console.error("Logo canvas pre-render failed:", err);
      }

      const doc = new jsPDF({ orientation: "portrait", compress: true });

      const drawBackground = (pdfDoc: any) => {
        // Draw diagonal repeating watermarks "HACKBOATS"
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(15);
        pdfDoc.setTextColor(220, 216, 207);
        for (let py = 25; py < 290; py += 55) {
          for (let px = 15; px < 200; px += 60) {
            pdfDoc.text("HACKBOATS", px, py, { angle: 30 });
          }
        }

        // Draw blueprint-style decorative grid crosshairs
        pdfDoc.setDrawColor(13, 36, 33, 0.04);
        pdfDoc.setLineWidth(0.3);
        pdfDoc.line(8, 10, 16, 10);
        pdfDoc.line(10, 8, 10, 16);
        pdfDoc.line(194, 10, 202, 10);
        pdfDoc.line(200, 8, 200, 16);
        pdfDoc.line(8, 287, 16, 287);
        pdfDoc.line(10, 285, 10, 293);
        pdfDoc.line(194, 287, 202, 287);
        pdfDoc.line(200, 285, 200, 293);
      };

      drawBackground(doc);

      // ── Page 1: Premium Neo-Brutalist Title Banner ──
      doc.setFillColor(13, 36, 33);
      doc.rect(16, 12, 182, 24, "F");

      doc.setFillColor(26, 62, 58); // Teal
      doc.setDrawColor(13, 36, 33);
      doc.setLineWidth(0.8);
      doc.rect(14, 10, 182, 24, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13.5);
      doc.setTextColor(255, 255, 255);
      doc.text("EVENT SUMMARY REPORT", 20, 18.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(190, 240, 60); // Neon Lime
      doc.text(eventName.toUpperCase(), 20, 23.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text("Authorized: Session Administrator", 20, 28.5);

      // Metadata summary
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 14, 42);

      // --- Summary Stats Block ---
      doc.setFillColor(13, 36, 33);
      doc.rect(16, 48, 182, 20, "F");
      doc.setFillColor(250, 248, 244);
      doc.setDrawColor(13, 36, 33);
      doc.setLineWidth(0.8);
      doc.rect(14, 46, 182, 20, "FD");

      doc.setFontSize(10);
      doc.setTextColor(13, 36, 33);
      doc.text(`Total Attendees: ${userCount}`, 20, 54);
      doc.text(`Total Referrals: ${referralCount}`, 20, 61);
      
      doc.text(`Captains: ${data.roles?.CAPTAIN || 0}`, 80, 54);
      doc.text(`Members: ${data.roles?.USER || 0}`, 80, 61);
      doc.text(`Visitors: ${data.roles?.VISITOR || 0}`, 130, 54);

      // --- Top Networkers (Most Referrals Sent) ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(13, 36, 33);
      doc.text("Top Networkers (Most Referrals Sent)", 14, 78);
      
      if (data.topSenders && data.topSenders.length > 0) {
        autoTable(doc, {
          head: [["Name", "Email", "Sent"]],
          body: data.topSenders.map((s: any) => [s.name, s.email, s.count]),
          startY: 82,
          styles: { fontSize: 9, cellPadding: 3, font: "helvetica", textColor: [13, 36, 33] },
          headStyles: { fillColor: [26, 62, 58], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [250, 248, 244] },
          theme: "grid",
        });
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("No referral data available.", 14, 85);
      }

      // --- Top Businesses (Most Referrals Received) ---
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 85;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Top Businesses (Most Referrals Received)", 14, finalY + 15);
      
      if (data.topReceivers && data.topReceivers.length > 0) {
        autoTable(doc, {
          head: [["Name", "Email", "Received"]],
          body: data.topReceivers.map((r: any) => [r.name, r.email, r.count]),
          startY: finalY + 19,
          styles: { fontSize: 9, cellPadding: 3, font: "helvetica", textColor: [13, 36, 33] },
          headStyles: { fillColor: [26, 62, 58], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [250, 248, 244] },
          theme: "grid",
        });
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("No referral data available.", 14, finalY + 22);
      }

      // ── Footers & Page Numbers Loop ──
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setDrawColor(13, 36, 33, 0.15);
        doc.setLineWidth(0.4);
        doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(140);
        doc.text(`Page ${i} of ${pageCount}`, 14, pageHeight - 11);

        doc.text("Powered by", pageWidth - 36, pageHeight - 11, { align: "right" });
        try {
          if (dataUrl) {
            doc.addImage(dataUrl, "JPEG", pageWidth - 34, pageHeight - 15, 20, 5, 'hb-logo', 'FAST');
          } else {
            doc.addImage(img, "JPEG", pageWidth - 34, pageHeight - 15, 20, 5, 'hb-logo', 'FAST');
          }
        } catch (err) {
          doc.setFont("helvetica", "bold");
          doc.text("HackBoats", pageWidth - 14, pageHeight - 11, { align: "right" });
        }
      }

      doc.save(`summary_report_${eventName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to export Summary Report PDF");
    } finally {
      setExportingId(null);
    }
  };

  const handleOpenEvent = async (eventId: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
      setExpandedUsers([]);
      setSearchQuery("");
      return;
    }
    
    setExpandedEventId(eventId);
    setSearchQuery("");
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/export/archive-admin/directory/json?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  return (
    <div className="bg-white border-2 border-[#0D2421] p-6 md:p-8 rounded-[2rem] shadow-[6px_6px_0px_#0D2421] space-y-6 mt-12">
      <div className="border-b-2 border-dashed border-[#0D2421]/15 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[9px] font-black tracking-widest text-[#0D2421]/50 uppercase block">ARCHIVE</span>
          <h3 className="font-black text-xl uppercase text-[#0D2421]">Past Wiped Events</h3>
          <p className="text-sm font-bold text-[#0D2421]/60">Download complete member directories and referral sheets from past events.</p>
        </div>
        
        <div className="w-full md:w-72 relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#0D2421]/40">
            <MagnifyingGlassIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search events..."
            value={eventSearchQuery}
            onChange={(e) => setEventSearchQuery(e.target.value)}
            className="w-full bg-[#FAF8F4] border-2 border-[#0D2421] rounded-xl pl-9 pr-4 py-2.5 text-[10px] uppercase font-black focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 placeholder:text-[#0D2421]/30 transition-all shadow-[2px_2px_0px_#0D2421]"
          />
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-[#FAF8F4] border-2 border-dashed border-[#0D2421]/30 rounded-2xl">
          <p className="font-black text-sm uppercase text-[#0D2421]/60 tracking-wider">No events have been wiped yet</p>
          <p className="text-[10px] font-black uppercase text-[#0D2421]/40 mt-2">When you wipe the live data from the dashboard, a snapshot will be permanently saved here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events
            .filter(evt => evt.name.toLowerCase().includes(eventSearchQuery.toLowerCase()))
            .map((evt) => (
            <div key={evt.id} className="bg-[#FAF8F4] border-2 border-[#0D2421] p-5 rounded-2xl flex flex-col gap-4 shadow-[3px_3px_0px_#0D2421] overflow-hidden">
              
              {/* TOP HEADER ROW */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {editingEventId === evt.id ? (
                  <div className="flex items-center gap-2 mb-1">
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)} 
                      className="text-lg font-black uppercase border-b-2 border-[#0D2421] bg-transparent focus:outline-none w-full max-w-[200px]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName(evt.id);
                        if (e.key === "Escape") setEditingEventId(null);
                      }}
                    />
                    <button onClick={() => handleSaveName(evt.id)} className="text-[10px] bg-[#BEF03C] hover:bg-[#A6DF2B] px-3 py-1.5 rounded-lg border border-[#0D2421] font-black uppercase shadow-[1.5px_1.5px_0px_#0D2421] transition-all">Save</button>
                    <button onClick={() => setEditingEventId(null)} className="text-[10px] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-[#0D2421] font-black uppercase shadow-[1.5px_1.5px_0px_#0D2421] transition-all">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h4 className="font-black uppercase text-lg">{evt.name}</h4>
                    <button onClick={() => { setEditingEventId(evt.id); setEditName(evt.name); }} className="p-1 rounded hover:bg-[#0D2421]/10 text-[#0D2421]/40 hover:text-[#0D2421] transition-colors" title="Edit Event Name">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="flex gap-4 text-[10px] font-black tracking-widest text-[#0D2421]/60 uppercase mt-1">
                  <span>{evt._count.users} Users</span>
                  <span>{evt._count.referrals} Referrals</span>
                  <span>{new Date(evt.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="space-y-1 w-full md:w-auto">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#0D2421]/40 block text-center sm:text-left">Directory</span>
                  <div className="flex gap-2">
                    <a 
                      href={`/api/export/archive-admin/directory?eventId=${evt.id}`}
                      className="flex-1 sm:w-auto px-4 py-2 bg-white border-2 border-[#0D2421] rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all text-center flex items-center justify-center shadow-[2px_2px_0px_#0D2421]"
                    >
                      Excel
                    </a>
                    <button 
                      onClick={() => exportDirectoryPDF(evt.id, evt.name)}
                      disabled={exportingId !== null}
                      className="flex-1 sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 border-2 border-[#0D2421] rounded-xl text-[10px] font-black uppercase transition-all shadow-[2px_2px_0px_#0D2421] disabled:opacity-50"
                    >
                      {exportingId === `dir-pdf-${evt.id}` ? "..." : "PDF"}
                    </button>
                  </div>
                </div>
                <div className="space-y-1 w-full md:w-auto">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#0D2421]/40 block text-center sm:text-left">Referrals</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => exportReferralsExcel(evt.id, evt.name)}
                      disabled={exportingId !== null}
                      className="flex-1 sm:w-auto px-4 py-2 bg-[#BEF03C] hover:bg-[#A6DF2B] border-2 border-[#0D2421] rounded-xl text-[10px] font-black uppercase transition-all shadow-[2px_2px_0px_#0D2421] disabled:opacity-50"
                    >
                      {exportingId === `excel-${evt.id}` ? "..." : "Excel"}
                    </button>
                    <button 
                      onClick={() => exportReferralsPDF(evt.id, evt.name)}
                      disabled={exportingId !== null}
                      className="flex-1 sm:w-auto px-4 py-2 bg-[#BEF03C] hover:bg-[#A6DF2B] border-2 border-[#0D2421] rounded-xl text-[10px] font-black uppercase transition-all shadow-[2px_2px_0px_#0D2421] disabled:opacity-50"
                    >
                      {exportingId === `pdf-${evt.id}` ? "..." : "PDF"}
                    </button>
                  </div>
                </div>
                <div className="space-y-1 w-full md:w-auto mt-3 sm:mt-0">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#0D2421]/40 block text-center sm:text-left">Report</span>
                  <button 
                    onClick={() => exportSummaryReportPDF(evt.id, evt.name, evt._count.users, evt._count.referrals)}
                    disabled={exportingId !== null}
                    className="w-full sm:w-auto px-4 py-2 bg-[#0D2421] text-[#BEF03C] hover:bg-[#163733] border-2 border-[#0D2421] rounded-xl text-[10px] font-black uppercase transition-all shadow-[2px_2px_0px_#0D2421] disabled:opacity-50"
                  >
                    {exportingId === `report-pdf-${evt.id}` ? "Generating..." : "Summary PDF"}
                  </button>
                </div>
              </div>
            </div> {/* END TOP HEADER ROW */}
              
              <div className="mt-4 pt-4 border-t-2 border-dashed border-[#0D2421]/20 flex justify-between items-center gap-4">
                <button
                  onClick={() => handleOpenEvent(evt.id)}
                  className="px-6 py-2 bg-[#0D2421] text-[#BEF03C] hover:bg-[#163733] border-2 border-[#0D2421] rounded-xl text-[10px] font-black uppercase transition-all shadow-[2px_2px_0px_#0D2421] flex-shrink-0"
                >
                  {expandedEventId === evt.id ? "Close Drill-Down" : "Open Drill-Down"}
                </button>

                {expandedEventId === evt.id && (
                  <div className="flex-1 relative max-w-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#0D2421]/40">
                      <MagnifyingGlassIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border-2 border-[#0D2421] rounded-xl pl-9 pr-4 py-2 text-[10px] uppercase font-black focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 placeholder:text-[#0D2421]/30 transition-all shadow-[2px_2px_0px_#0D2421]"
                    />
                  </div>
                )}

                <SecureAdminButton 
                  action={handleDelete.bind(null, evt.id)}
                  label="Delete Archive"
                  loadingText="Deleting..."
                  promptText="Please ensure you have downloaded and saved all Excel/PDF data locally. This action is irreversible. Enter Admin Pin to permanently delete this archive:"
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-[#0D2421] rounded-xl text-[10px] font-black uppercase transition-all shadow-[2px_2px_0px_#0D2421]"
                  formClassName="w-auto"
                />
              </div>

              {/* DRILL DOWN VIEW */}
              {expandedEventId === evt.id && (
                <div className="mt-4 border-t-2 border-[#0D2421] pt-4">
                  {loadingUsers ? (
                    <div className="text-center py-8 text-xs font-black uppercase tracking-widest text-[#0D2421]/50">Loading Member Directory...</div>
                  ) : (
                    <div className="overflow-x-auto border-2 border-[#0D2421] rounded-[1rem] bg-white shadow-[4px_4px_0px_#0D2421]">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-[#FAF8F4] border-b-2 border-[#0D2421]">
                            <th className="py-3 px-4 font-black uppercase text-[10px] text-[#0D2421]/60 tracking-wider">Member Name</th>
                            <th className="py-3 px-4 font-black uppercase text-[10px] text-[#0D2421]/60 tracking-wider">Email</th>
                            <th className="py-3 px-4 font-black uppercase text-[10px] text-[#0D2421]/60 tracking-wider text-right">Download Individual Referrals</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0D2421]/15 text-xs">
                          {expandedUsers
                            .filter(u => {
                              const q = searchQuery.toLowerCase();
                              return u.Name?.toLowerCase().includes(q) || u.Email?.toLowerCase().includes(q);
                            })
                            .map((u, i) => (
                            <tr key={i} className="hover:bg-[#FAF8F4]/30 transition-colors">
                              <td className="py-3 px-4 font-black text-[#0D2421]">{u.Name}</td>
                              <td className="py-3 px-4 text-[#0D2421]/70 font-semibold">{u.Email}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={() => exportReferralsExcel(evt.id, evt.name, u.Email, u.Name)}
                                    disabled={exportingId !== null}
                                    className="px-3 py-1 bg-white hover:bg-slate-50 border border-[#0D2421] rounded-lg text-[9px] font-black uppercase transition-all shadow-[1.5px_1.5px_0px_#0D2421] disabled:opacity-50"
                                  >
                                    Excel
                                  </button>
                                  <button 
                                    onClick={() => exportReferralsPDF(evt.id, evt.name, u.Email, u.Name)}
                                    disabled={exportingId !== null}
                                    className="px-3 py-1 bg-[#BEF03C] hover:bg-[#A6DF2B] border border-[#0D2421] rounded-lg text-[9px] font-black uppercase transition-all shadow-[1.5px_1.5px_0px_#0D2421] disabled:opacity-50"
                                  >
                                    PDF
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {expandedUsers.filter(u => {
                              const q = searchQuery.toLowerCase();
                              return u.Name?.toLowerCase().includes(q) || u.Email?.toLowerCase().includes(q);
                            }).length === 0 && (
                            <tr>
                              <td colSpan={3} className="py-8 text-center text-[#0D2421]/40 font-bold uppercase tracking-wider text-[10px]">No members found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
