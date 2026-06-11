"use client";

import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as xlsx from "xlsx";
import { SecureAdminButton } from "./SecureAdminButton";
import { deleteArchivedEvent } from "./actions";
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

  const handleDelete = async (eventId: string, formData: FormData) => {
    formData.append("eventId", eventId);
    await deleteArchivedEvent(formData);
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
                <h4 className="font-black uppercase text-lg">{evt.name}</h4>
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
