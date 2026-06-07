"use client";

import React, { useState } from "react";

interface DownloadMyReferralsButtonProps {
  userName: string;
  referrals: {
    createdAt: Date | string;
    fromUser: {
      name: string | null;
      email: string | null;
      businessName: string | null;
      businessCategory: string | null;
      contactNumber: string | null;
    };
    note: string | null;
  }[];
}

export function DownloadMyReferralsButton({ userName, referrals }: DownloadMyReferralsButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPDF = async () => {
    try {
      setIsGenerating(true);
      
      // Load HackBoats Logo Image asynchronously
      const img = new Image();
      img.src = '/hb-logo.png';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      // Convert image to Canvas Data URL to prevent CORS/format rendering glitches
      let dataUrl = "";
      try {
        const canvas = document.createElement("canvas");
        // Downscale to a fixed 200x50 resolution for the small footer size
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Fill a white background to prevent dark background issues with transparent PNGs when converting to JPEG
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, 200, 50);
          ctx.drawImage(img, 0, 0, 200, 50);
          dataUrl = canvas.toDataURL("image/jpeg", 0.8); // High quality JPEG compression
        }
      } catch (err) {
        console.error("Logo canvas pre-render failed:", err);
      }

      // Dynamically load jsPDF to prevent Next.js SSR / stale cache mismatches
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        compress: true
      });

      // Watermark & background grids helper function
      const drawBackground = (pdfDoc: any) => {
        // Draw diagonal repeating watermarks "HACKBOATS"
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(15);
        pdfDoc.setTextColor(220, 216, 207); // Perfect middle ground visibility on white page background
        
        for (let py = 25; py < 290; py += 55) {
          for (let px = 15; px < 200; px += 60) {
            pdfDoc.text("HACKBOATS", px, py, { angle: 30 });
          }
        }

        // Draw blueprint-style decorative grid crosshairs in page corners
        pdfDoc.setDrawColor(13, 36, 33, 0.04);
        pdfDoc.setLineWidth(0.3);
        
        // Top-left crosshair
        pdfDoc.line(8, 10, 16, 10);
        pdfDoc.line(10, 8, 10, 16);

        // Top-right crosshairs
        pdfDoc.line(194, 10, 202, 10);
        pdfDoc.line(200, 8, 200, 16);

        // Bottom-left crosshairs
        pdfDoc.line(8, 287, 16, 287);
        pdfDoc.line(10, 285, 10, 293);

        // Bottom-right crosshairs
        pdfDoc.line(194, 287, 202, 287);
        pdfDoc.line(200, 285, 200, 293);
      };

      // Draw background for Page 1
      drawBackground(doc);

      // ── Page 1: Premium Neo-Brutalist Title Banner ──
      // Banner shadow block
      doc.setFillColor(13, 36, 33); // #0D2421
      doc.rect(16, 12, 182, 24, "F");

      // Banner main block
      doc.setFillColor(26, 62, 58); // Teal: #1A3F3A
      doc.setDrawColor(13, 36, 33);
      doc.setLineWidth(0.8);
      doc.rect(14, 10, 182, 24, "FD");

      // Title Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13.5);
      doc.setTextColor(255, 255, 255); // White text
      doc.text("CONCLAVE NETWORKING SESSION", 20, 18.5);

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(190, 240, 60); // Neon Lime: #BEF03C
      doc.text("Your Received Referrals & Connection Notes Log", 20, 23.5);

      // Recipient
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`Recipient: ${userName}`, 20, 28.5);

      // Metadata summary
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 14, 42);
      doc.text(`Total Referrals Received: ${referrals.length}`, 196, 42, { align: "right" });

      if (referrals.length === 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(13, 36, 33);
        doc.text("You did not receive any referrals during this session.", 14, 60);
      } else {
        const x = 14;
        const cardWidth = 182;
        const cardHeight = 50; // Increased from 44 to allow text wrapping
        const cardGap = 8;
        const pageLimitY = 270;
        
        let currentY = 48; // First card starts directly under page metadata

        referrals.forEach((ref) => {
          // Check page bounds before rendering next card
          if (currentY + cardHeight > pageLimitY) {
            doc.addPage();
            drawBackground(doc); // Render watermarks on new page
            currentY = 16; // Reset Y for new page
          }

          // 1. Draw Offset Shadow Block
          doc.setFillColor(13, 36, 33); // #0D2421
          doc.rect(x + 2, currentY + 2, cardWidth, cardHeight, "F");

          // 2. Draw Top Half Card Body (White background)
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(13, 36, 33);
          doc.setLineWidth(0.8);
          doc.rect(x, currentY, cardWidth, 23, "FD");

          // 3. Draw Bottom Half Card Body (Light tan background)
          doc.setFillColor(250, 248, 244); // #FAF8F4
          doc.rect(x, currentY + 23, cardWidth, 27, "F");
          doc.rect(x, currentY + 23, cardWidth, 27, "S"); // Outline border for bottom half

          // 4. Draw Initials Avatar Box
          doc.setFillColor(190, 240, 60); // #BEF03C
          doc.rect(x + 5, currentY + 4, 11, 11, "FD");

          const firstLetter = (ref.fromUser.name || ref.fromUser.email || "?").charAt(0).toUpperCase();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(13, 36, 33);
          doc.text(firstLetter, x + 10.5, currentY + 11.5, { align: "center" });

          // 5. Draw Sender Name
          const name = (ref.fromUser.name || ref.fromUser.email || "Anonymous").toUpperCase();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(13, 36, 33);
          doc.text(name, x + 20, currentY + 8.5);

          // 6. Draw Category & Company Subtext
          const category = ref.fromUser.businessCategory || "Participant";
          const company = ref.fromUser.businessName || "No Company";
          const fullText = `${category.toUpperCase()}  |  ${company.toUpperCase()}`;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(100);
          
          const maxWidth = 90; // Space between name and right-aligned email
          const wrappedSub = doc.splitTextToSize(fullText, maxWidth);
          doc.text(wrappedSub, x + 20, currentY + 12.5);

          // 7. Draw Contact Details (Right Aligned to avoid overlap)
          doc.setFontSize(7.5);
          doc.setTextColor(100);
          doc.text(`Email: ${ref.fromUser.email}`, x + cardWidth - 6, currentY + 8.5, { align: "right" });
          if (ref.fromUser.contactNumber) {
            doc.text(`Phone: ${ref.fromUser.contactNumber}`, x + cardWidth - 6, currentY + 12.5, { align: "right" });
          }

          // 8. Draw Watermark inside Card Background
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.setTextColor(233, 229, 221); // Balanced watermark slightly darker than the card background (250, 248, 244)

          doc.text("HACKBOATS", x + cardWidth / 2, currentY + 39, { align: "center" });

          // 9. Draw Connection Note Inside Bottom Half
          const noteText = ref.note ? `"${ref.note}"` : "No connection notes were provided.";
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8.5);
          doc.setTextColor(13, 36, 33);
          const wrappedLines = doc.splitTextToSize(noteText, cardWidth - 12);
          doc.text(wrappedLines, x + 6, currentY + 29.5);

          // Increment Y for next card
          currentY += cardHeight + cardGap;
        });
      }

      // ── Footers & Page Numbers Loop ──
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Decorative horizontal divider at the bottom
        doc.setDrawColor(13, 36, 33, 0.15);
        doc.setLineWidth(0.4);
        doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

        // Page text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(140);
        doc.text(`Page ${i} of ${pageCount}`, 14, pageHeight - 11);

        // Powered by HackBoats logo alignment
        doc.text("Powered by", pageWidth - 36, pageHeight - 11, { align: "right" });
        try {
          if (dataUrl) {
            doc.addImage(dataUrl, "JPEG", pageWidth - 34, pageHeight - 15, 20, 5, 'hb-logo', 'FAST');
          } else {
            doc.addImage(img, "JPEG", pageWidth - 34, pageHeight - 15, 20, 5, 'hb-logo', 'FAST');
          }
        } catch (err) {
          console.error("Logo rendering failed in footer:", err);
          doc.setFont("helvetica", "bold");
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
      disabled={isGenerating}
      className="w-full sm:w-auto px-8 py-4 bg-[#BEF03C] hover:bg-[#A6DF2B] text-[#0D2421] border-3 border-[#0D2421] rounded-[1.2rem] font-black uppercase text-sm shadow-[5px_5px_0px_#0D2421] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
    >
      <svg className="w-5 h-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {isGenerating ? "Generating PDF..." : "Download My Referrals (PDF)"}
    </button>
  );
}
