"use client";

import React, { useState, useRef, useActionState } from "react";
import { uploadWhitelistExcel } from "./actions/upload.actions";
import { ArrowPathIcon, CheckIcon, UserGroupIcon } from "@heroicons/react/24/outline";

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

      <form action={formAction} className="flex flex-col gap-4">
        <div className={`relative border-2 border-dashed rounded-xl bg-white p-4 transition-all flex flex-col items-center justify-center min-h-[100px] ${
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
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            {isPending ? (
              <>
                <ArrowPathIcon className="w-6 h-6 text-[#0D2421] animate-spin" />
                <span className="text-xs font-black uppercase text-[#0D2421]/40 animate-pulse">
                  Processing Emails...
                </span>
              </>
            ) : fileName ? (
              <>
                <CheckIcon className="w-6 h-6 text-emerald-600" />
                <span className="text-xs font-black uppercase text-emerald-600 truncate max-w-[280px]">
                  {fileName}
                </span>
              </>
            ) : (
              <>
                <UserGroupIcon className="w-6 h-6 text-[#0D2421]/50" />
                <span className="text-xs font-black uppercase text-[#0D2421]/70">
                  Choose Member Email Spreadsheet
                </span>
                <span className="text-[9px] font-bold text-[#0D2421]/40 uppercase tracking-wider mt-1 text-center max-w-[250px]">
                  Supports: Email, Group, Chapter, Region<br/>(Compatible with Google Forms Export)
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || !fileName}
          className={`w-full py-4 border-2 border-[#0D2421] rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${
            isPending || !fileName
              ? "bg-slate-100 text-slate-400 border-slate-300 shadow-none cursor-not-allowed"
              : "bg-[#BEF03C] text-[#0D2421] hover:bg-[#A6DF2B] shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer"
          }`}
        >
          {isPending ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
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
            <ArrowPathIcon className="w-6 h-6 text-[#BEF03C] animate-spin" />
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
