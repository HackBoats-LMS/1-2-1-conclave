"use client";

import React, { useState } from "react";

interface Referral {
  createdAt: Date | string;
  note: string | null;
  fromUser: {
    name: string | null;
    email: string | null;
    businessName: string | null;
    businessCategory: string | null;
    contactNumber: string | null;
  };
}

interface Props {
  userName: string;
  referrals: Referral[];
}

export function AdminReferralsDownloadClient({ userName, referrals }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPDF = async () => {
    try {
      setIsGenerating(true);

      const img = new Image();
      img.src = "/hb-logo.png";
      await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });

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

      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", compress: true });

      const drawBackground = (pdfDoc: any) => {
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(15);
        pdfDoc.setTextColor(220, 216, 207);
        for (let py = 25; py < 290; py += 55) {
          for (let px = 15; px < 200; px += 60) {
            pdfDoc.text("HACKBOATS", px, py, { angle: 30 });
          }
        }
        pdfDoc.setDrawColor(13, 36, 33, 0.04);
        pdfDoc.setLineWidth(0.3);
        pdfDoc.line(8, 10, 16, 10); pdfDoc.line(10, 8, 10, 16);
        pdfDoc.line(194, 10, 202, 10); pdfDoc.line(200, 8, 200, 16);
        pdfDoc.line(8, 287, 16, 287); pdfDoc.line(10, 285, 10, 293);
        pdfDoc.line(194, 287, 202, 287); pdfDoc.line(200, 285, 200, 293);
      };

      drawBackground(doc);

      // Banner
      doc.setFillColor(13, 36, 33);
      doc.rect(16, 12, 182, 24, "F");
      doc.setFillColor(26, 62, 58);
      doc.setDrawColor(13, 36, 33);
      doc.setLineWidth(0.8);
      doc.rect(14, 10, 182, 24, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13.5);
      doc.setTextColor(255, 255, 255);
      doc.text("CONCLAVE NETWORKING SESSION", 20, 18.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(190, 240, 60);
      doc.text("Received Referrals & Connection Notes Log", 20, 23.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`Recipient: ${userName}`, 20, 28.5);
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 14, 42);
      doc.text(`Total Referrals Received: ${referrals.length}`, 196, 42, { align: "right" });

      if (referrals.length === 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(13, 36, 33);
        doc.text("No referrals received during this session.", 14, 60);
      } else {
        const x = 14;
        const cardWidth = 182;
        const cardHeight = 50;
        const cardGap = 8;
        const pageLimitY = 270;
        let currentY = 48;

        referrals.forEach((ref) => {
          if (currentY + cardHeight > pageLimitY) {
            doc.addPage();
            drawBackground(doc);
            currentY = 16;
          }

          doc.setFillColor(13, 36, 33);
          doc.rect(x + 2, currentY + 2, cardWidth, cardHeight, "F");
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(13, 36, 33);
          doc.setLineWidth(0.8);
          doc.rect(x, currentY, cardWidth, 23, "FD");
          doc.setFillColor(250, 248, 244);
          doc.rect(x, currentY + 23, cardWidth, 27, "F");
          doc.rect(x, currentY + 23, cardWidth, 27, "S");

          doc.setFillColor(190, 240, 60);
          doc.rect(x + 5, currentY + 4, 11, 11, "FD");
          const firstLetter = (ref.fromUser.name || ref.fromUser.email || "?").charAt(0).toUpperCase();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(13, 36, 33);
          doc.text(firstLetter, x + 10.5, currentY + 11.5, { align: "center" });

          const name = (ref.fromUser.name || ref.fromUser.email || "Anonymous").toUpperCase();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(13, 36, 33);
          doc.text(name, x + 20, currentY + 8.5);

          const category = ref.fromUser.businessCategory || "Participant";
          const company = ref.fromUser.businessName || "No Company";
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(100);
          const wrappedSub = doc.splitTextToSize(`${category.toUpperCase()}  |  ${company.toUpperCase()}`, 90);
          doc.text(wrappedSub, x + 20, currentY + 12.5);

          doc.setFontSize(7.5);
          doc.setTextColor(100);
          doc.text(`Email: ${ref.fromUser.email}`, x + cardWidth - 6, currentY + 8.5, { align: "right" });
          if (ref.fromUser.contactNumber) {
            doc.text(`Phone: ${ref.fromUser.contactNumber}`, x + cardWidth - 6, currentY + 12.5, { align: "right" });
          }

          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.setTextColor(233, 229, 221);
          doc.text("HACKBOATS", x + cardWidth / 2, currentY + 39, { align: "center" });

          const noteText = ref.note ? `"${ref.note}"` : "No connection notes were provided.";
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8.5);
          doc.setTextColor(13, 36, 33);
          const wrappedLines = doc.splitTextToSize(noteText, cardWidth - 12);
          doc.text(wrappedLines, x + 6, currentY + 29.5);

          currentY += cardHeight + cardGap;
        });
      }

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
            doc.addImage(dataUrl, "JPEG", pageWidth - 34, pageHeight - 15, 20, 5, "hb-logo", "FAST");
          }
        } catch (err) {
          doc.text("HackBoats", pageWidth - 14, pageHeight - 11, { align: "right" });
        }
      }

      doc.save(`referrals_${userName.toLowerCase().replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={downloadPDF}
      disabled={isGenerating || referrals.length === 0}
      className="shrink-0 flex items-center gap-2 px-5 py-3 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-2 border-[#0D2421] rounded-xl font-black uppercase text-xs shadow-[3px_3px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {isGenerating ? "Generating..." : "Download PDF"}
    </button>
  );
}
