"use client";

import React, { useState, useRef, useActionState } from "react";
import { uploadAssignmentsExcel } from "./actions";
import { ArrowPathIcon, CheckIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";

export function AssignmentsUploadForm() {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        await uploadAssignmentsExcel(formData);
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
          <span className="text-base text-purple-600">📄</span>
          <span className="text-[10px] font-black tracking-widest text-[#0D2421] uppercase">
            IMPORT ASSIGNMENTS
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

      <div className="text-[10px] font-bold text-[#0D2421]/60 uppercase tracking-wide">
        UPLOAD PRE-COMPUTED ASSIGNMENTS (EXCEL/CSV)
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className={`relative border-2 border-dashed rounded-xl bg-white p-4 transition-all flex flex-col items-center justify-center min-h-[100px] ${
          isPending 
            ? "border-[#0D2421]/15 bg-slate-50 cursor-not-allowed" 
            : fileName 
              ? "border-purple-400 bg-purple-400/5" 
              : "border-[#0D2421]/30 hover:bg-purple-400/5"
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
                  Processing Assignments...
                </span>
              </>
            ) : fileName ? (
              <>
                <CheckIcon className="w-6 h-6 text-purple-600" />
                <span className="text-xs font-black uppercase text-purple-700 truncate max-w-[280px]">
                  {fileName}
                </span>
              </>
            ) : (
              <>
                <DocumentArrowUpIcon className="w-6 h-6 text-[#0D2421]/50" />
                <span className="text-xs font-black uppercase text-[#0D2421]/75">
                  Select Excel File
                </span>
                <span className="text-[9px] font-bold text-[#0D2421]/40 uppercase tracking-wider">
                  COLUMNS: EMAIL, ROLE, SLOT, ROUND, TABLE
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
              : "bg-white text-[#0D2421] hover:bg-slate-50 shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer"
          }`}
        >
          {isPending ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <span>Waiting For File...</span>
          )}
        </button>
      </form>

      {isPending && (
        <div className="absolute inset-0 bg-[#FAF8F4]/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 text-center border-2 border-[#0D2421] rounded-2xl animate-fadeIn">
          <div className="w-12 h-12 bg-[#0D2421] border border-[#0D2421] rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_#A855F7] mb-4">
            <DocumentArrowUpIcon className="w-6 h-6 text-purple-400" />
          </div>
          <h4 className="font-black text-sm uppercase tracking-tight text-[#0D2421]">Importing Assignments</h4>
          <p className="text-[10px] font-bold text-[#0D2421]/60 uppercase tracking-widest mt-1">
            Validating rows and building tables...
          </p>
        </div>
      )}
    </div>
  );
}
