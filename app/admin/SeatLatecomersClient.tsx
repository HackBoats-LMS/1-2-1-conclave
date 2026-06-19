"use client";
import React, { useState } from "react";
import { getLatecomersPreview, seatLatecomers } from "./actions/assignment.actions";
import { useRouter } from "next/navigation";

export function SeatLatecomersClient() {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [seating, setSeating] = useState(false);
  const router = useRouter();

  const handlePreview = async () => {
    setLoading(true);
    const res = await getLatecomersPreview();
    if (res.success) {
      setPreviewData(res.missingUsers || []);
    } else {
      alert("Failed to load preview: " + res.error);
    }
    setLoading(false);
  };

  const handleSeat = async () => {
    setSeating(true);
    const result = await seatLatecomers();
    if (result.success) {
      setPreviewData(null);
      router.refresh();
    } else {
      alert(result.error || "Failed to seat latecomers.");
    }
    setSeating(false);
  };

  return (
    <>
      <button
        onClick={handlePreview}
        disabled={loading}
        className="w-full px-5 py-3.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer whitespace-nowrap text-center disabled:opacity-50"
      >
        {loading ? "Loading..." : "Review & Seat Latecomers"}
      </button>

      {previewData !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D2421]/80 backdrop-blur-sm">
          <div className="bg-[#FAF8F4] w-full max-w-2xl border-4 border-[#0D2421] rounded-3xl shadow-[8px_8px_0px_#0D2421] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b-4 border-[#0D2421] bg-[#BEF03C] flex justify-between items-center">
              <h2 className="font-black text-xl uppercase tracking-tight text-[#0D2421]">Latecomers Preview</h2>
              <button onClick={() => setPreviewData(null)} className="text-[#0D2421] hover:text-black font-black text-2xl">×</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {previewData.length === 0 ? (
                <p className="text-center font-bold text-slate-500 py-8">No unseated users found for upcoming rounds!</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-[#0D2421]/70 mb-4">
                    The following {previewData.length} users are missing from one or more upcoming rounds. They will be seated at tables when you confirm.
                  </p>
                  {previewData.map((u: any) => (
                    <div key={u.id} className="bg-white p-3 rounded-xl border-2 border-[#0D2421] flex justify-between items-center shadow-[2px_2px_0px_#0D2421]">
                      <div>
                        <div className="font-black text-sm uppercase text-[#0D2421]">{u.name || u.email.split('@')[0]}</div>
                        <div className="text-[10px] font-bold text-[#0D2421]/60 uppercase tracking-widest">{u.role} • {u.businessCategory || "No Category"}</div>
                      </div>
                      <div className="text-[9px] font-black bg-amber-100 text-amber-800 px-2 py-1 rounded-lg border border-amber-800">
                        Missing in: R{u.missingInRounds.join(", R")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t-4 border-[#0D2421] bg-white flex justify-end gap-4">
              <button onClick={() => setPreviewData(null)} className="px-6 py-3 font-black text-xs uppercase text-[#0D2421] hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              {previewData.length > 0 && (
                <button
                  onClick={handleSeat}
                  disabled={seating}
                  className="px-6 py-3 bg-[#BEF03C] hover:bg-[#a5d631] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50"
                >
                  {seating ? "Seating..." : `Confirm & Seat ${previewData.length} Users`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
