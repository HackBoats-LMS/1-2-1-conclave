"use client";

import React, { useState, useRef, useActionState } from "react";
import { uploadAssignmentsExcel } from "./actions";

export function UploadForm() {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use React 19 useActionState to automatically manage pending state during Server Action + Redirect transition
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        await uploadAssignmentsExcel(formData);
      } catch (err: any) {
        // Next.js redirects are thrown as errors under the hood.
        // We MUST rethrow them so the Next.js router captures them and performs the redirect navigation.
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFileName(null);
  };

  return (
    <div className="bg-[#FAF8F4] border-2 border-[#0D2421] p-6 rounded-2xl shadow-[3px_3px_0px_#0D2421] space-y-4 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0D2421]"></span>
          <span className="text-[10px] font-black tracking-widest text-[#0D2421] uppercase">
            IMPORT TABLE MATRICES (.XLSX, .CSV)
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
        {/* Drop/Input Zone */}
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
              // Continuous scanner line animation & spinner inside input box
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#0D2421] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs font-black uppercase text-[#0D2421]/40 animate-pulse">
                  Uploading & Parsing Rows...
                </span>
              </div>
            ) : fileName ? (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-black uppercase text-emerald-600 truncate max-w-[280px]">
                  {fileName}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#0D2421]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-black uppercase text-[#0D2421]/70">
                  Choose Spreadsheet File
                </span>
              </div>
            )}
          </div>
          
          {/* Scanning line animation when pending */}
          {isPending && (
            <div className="absolute top-0 inset-x-0 h-1 bg-[#BEF03C] animate-scan z-0 pointer-events-none"></div>
          )}
        </div>

        {/* Upload Button */}
        <button
          type="submit"
          disabled={isPending || !fileName}
          className={`px-6 py-4 border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${
            isPending || !fileName
              ? "bg-slate-100 text-slate-400 border-slate-300 shadow-none cursor-not-allowed"
              : "bg-[#0D2421] text-[#FAF8F4] hover:bg-[#163733] shadow-[3px_3px_0px_#BEF03C] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#BEF03C]"
          }`}
        >
          {isPending ? (
            <>
              <svg className="w-4 h-4 text-[#FAF8F4] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Uploading...</span>
            </>
          ) : (
            <span>Upload Matrix</span>
          )}
        </button>
      </form>

      {/* Screen blocker loading panel when uploading */}
      {isPending && (
        <div className="absolute inset-0 bg-[#FAF8F4]/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 text-center border-2 border-[#0D2421] rounded-2xl animate-fadeIn">
          <div className="w-12 h-12 bg-[#0D2421] border border-[#0D2421] rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_#BEF03C] mb-4">
            <svg className="w-6 h-6 text-[#BEF03C] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h4 className="font-black text-sm uppercase tracking-tight text-[#0D2421]">Generating Live Conclave Matrix</h4>
          <p className="text-[10px] font-bold text-[#0D2421]/60 uppercase tracking-widest mt-1">
            Wiping old slots, reading rows, and allocating round tables...
          </p>
        </div>
      )}
    </div>
  );
}
