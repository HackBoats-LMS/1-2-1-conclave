"use client";

import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function ReferralsExportButtons() {
  const [isExporting, setIsExporting] = useState(false);

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
          styles: { fontSize: 6, cellPadding: 1, overflow: 'linebreak' },
          theme: "grid",
          columnStyles: {
            0: { cellWidth: 15 }, // Date
            1: { cellWidth: 20 }, // From
            2: { cellWidth: 25 }, // From Business
            3: { cellWidth: 20 }, // From Category
            4: { cellWidth: 20 }, // From Contact
            5: { cellWidth: 20 }, // To
            6: { cellWidth: 25 }, // To Business
            7: { cellWidth: 20 }, // To Category
            8: { cellWidth: 20 }, // To Contact
            9: { cellWidth: 'auto' }, // Note
          }
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
      
      doc.save("conclave_referrals.pdf");
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <a 
        href="/api/export/referrals"
        className="flex-1 py-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black text-[10px] uppercase text-center shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Excel
      </a>
      <button 
        onClick={exportReferralsPDF}
        disabled={isExporting}
        className="flex-1 py-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black text-[10px] uppercase text-center shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        PDF
      </button>
    </div>
  );
}
