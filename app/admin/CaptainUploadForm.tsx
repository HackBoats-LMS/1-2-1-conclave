"use client";

import React, { useState, useRef, useActionState } from "react";
import { uploadCaptainExcel } from "./actions";

export function CaptainUploadForm() {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        await uploadCaptainExcel(formData);
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
    <div className="bg-amber-50/80 border-2 border-amber-600 p-6 rounded-2xl shadow-[3px_3px_0px_#0D2421] space-y-4 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">👑</span>
          <span className="text-[10px] font-black tracking-widest text-amber-800 uppercase">
            IMPORT CAPTAIN EMAILS (.XLSX, .CSV)
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
            ? "border-amber-300/50 bg-amber-50/30 cursor-not-allowed" 
            : fileName 
              ? "border-amber-500 bg-amber-50" 
              : "border-amber-400/40 hover:bg-amber-50/50"
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
                <svg className="w-5 h-5 text-amber-700 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs font-black uppercase text-amber-700/60 animate-pulse">
                  Processing Captain Emails...
                </span>
              </div>
            ) : fileName ? (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-black uppercase text-amber-700 truncate max-w-[280px]">
                  {fileName}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-lg">👑</span>
                <span className="text-xs font-black uppercase text-amber-700/70">
                  Choose Captain Email Spreadsheet
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || !fileName}
          className={`px-6 py-4 border-2 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${
            isPending || !fileName
              ? "bg-slate-100 text-slate-400 border-slate-300 shadow-none cursor-not-allowed"
              : "bg-amber-500 text-white border-amber-700 hover:bg-amber-600 shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer"
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
            <span>Upload Captains</span>
          )}
        </button>
      </form>

      {isPending && (
        <div className="absolute inset-0 bg-amber-50/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 text-center border-2 border-amber-600 rounded-2xl animate-fadeIn">
          <div className="w-12 h-12 bg-amber-500 border border-amber-700 rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_#0D2421] mb-4">
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h4 className="font-black text-sm uppercase tracking-tight text-amber-800">Registering Table Captains</h4>
          <p className="text-[10px] font-bold text-amber-700/60 uppercase tracking-widest mt-1">
            Reading spreadsheet and assigning captain roles...
          </p>
        </div>
      )}
    </div>
  );
}
