"use client";

import React, { useState, useRef, useActionState } from "react";
import { uploadWhitelistExcel } from "./actions";

export function MemberUploadForm() {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        await uploadWhitelistExcel(formData);
      } catch (err: any) {
        if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        console.error("Upload failed", err);
      }
      return null;
    },
    null
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : null);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileName(null);
  };

  return (
    <div className="bg-[#FAF8F4] border-2 border-[#0D2421] p-6 rounded-2xl shadow-[3px_3px_0px_#0D2421] space-y-4 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#BEF03C] border border-[#0D2421]"></span>
          <span className="text-[10px] font-black tracking-widest text-[#0D2421] uppercase">
            IMPORT MEMBER EMAILS (.XLSX, .CSV)
          </span>
        </div>
        {fileName && !isPending && (
          <button
            onClick={handleClear}
            className="text-[10px] font-black text-red-600 hover:text-red-800 uppercase tracking-widest cursor-pointer underline decoration-2"
          >
            Clear File
          </button>
        )}
      </div>

      <form action={formAction} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className={`flex-1 relative border-2 border-dashed rounded-xl bg-white p-4 transition-all flex items-center justify-center min-h-[58px] ${
          isPending 
            ? "border-[#0D2421]/15 bg-slate-50 cursor-not-allowed" 
            : fileName 
              ? "border-[#BEF03C] bg-[#BEF03C]/5" 
              : "border-[#0D2421]/30 hover:bg-[#BEF03C]/5"
        }`}>
          <input
            type="file"
            name="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            required
            disabled={isPending}
            onChange={handleFileChange}
            className={`opacity-0 absolute inset-0 w-full h-full z-10 ${isPending ? "cursor-not-allowed" : "cursor-pointer"}`}
          />
          <div className="flex items-center gap-3">
            {isPending ? (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#0D2421] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs font-black uppercase text-[#0D2421]/40 animate-pulse">
                  Processing Emails...
                </span>
              </div>
            ) : fileName ? (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-black uppercase text-emerald-600 truncate max-w-[280px]">
                  {fileName}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#0D2421]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-xs font-black uppercase text-[#0D2421]/70">
                  Choose Member Email Spreadsheet
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || !fileName}
          className={`px-6 py-4 border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${
            isPending || !fileName
              ? "bg-slate-100 text-slate-400 border-slate-300 shadow-none cursor-not-allowed"
              : "bg-[#BEF03C] text-[#0D2421] hover:bg-[#A6DF2B] shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer"
          }`}
        >
          {isPending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Uploading...</span>
            </>
          ) : (
            <span>Upload Members</span>
          )}
        </button>
      </form>

      {isPending && (
        <div className="absolute inset-0 bg-[#FAF8F4]/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 text-center border-2 border-[#0D2421] rounded-2xl animate-fadeIn">
          <div className="w-12 h-12 bg-[#0D2421] border border-[#0D2421] rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_#BEF03C] mb-4">
            <svg className="w-6 h-6 text-[#BEF03C] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h4 className="font-black text-sm uppercase tracking-tight text-[#0D2421]">Processing Member Emails</h4>
          <p className="text-[10px] font-bold text-[#0D2421]/60 uppercase tracking-widest mt-1">
            Reading spreadsheet and whitelisting accounts...
          </p>
        </div>
      )}
    </div>
  );
}
