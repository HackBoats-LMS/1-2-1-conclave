"use client";

import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

interface OnboardingExportButtonProps {
  users: any[];
  mode?: "single" | "split";
}

export function OnboardingExportButton({ users, mode = "single" }: OnboardingExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    try {
      setIsExporting(true);
      
      const doc = new jsPDF("landscape");
      doc.text("Conclave Member Directory", 14, 15);
      
      if (users.length === 0) {
        doc.text("No members found.", 14, 25);
      } else {
        const headers = ["Name", "Email", "Role", "Business", "Category", "Contact", "Onboarded"];
        const body = users.map(u => [
          u.name || "N/A",
          u.email || "N/A",
          u.role,
          u.businessName || "N/A",
          u.businessCategory || "N/A",
          u.contactNumber || "N/A",
          u.onboardingCompleted ? "Yes" : "No"
        ]);
        
        autoTable(doc, {
          head: [headers],
          body: body,
          startY: 20,
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
          theme: "grid",
        });
      }

      // Add Powered by HackBoats footer
      const img = new Image();
      img.src = '/hb-logo.png';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        doc.text("Powered by", pageWidth - 35, pageHeight - 10, { align: "right" });
        try {
          doc.addImage(img, "PNG", pageWidth - 33, pageHeight - 14, 20, 5, 'hb-logo', 'FAST');
        } catch (err) {
          doc.text("HackBoats", pageWidth - 14, pageHeight - 10, { align: "right" });
        }
      }
      
      doc.save("conclave_member_directory.pdf");
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  if (mode === "split") {
    return (
      <>
        <a 
          href="/api/export/directory"
          className="flex-1 py-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black text-[10px] uppercase text-center shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Excel
        </a>
        <button 
          onClick={exportPDF}
          disabled={isExporting}
          className="flex-1 py-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black text-[10px] uppercase text-center shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          {isExporting ? "Exporting..." : "PDF"}
        </button>
      </>
    );
  }

  return (
    <button
      onClick={exportPDF}
      disabled={isExporting}
      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed w-full sm:w-auto"
    >
      <ArrowDownTrayIcon className="w-4 h-4" />
      {isExporting ? "Exporting..." : "Download Directory PDF"}
    </button>
  );
}
