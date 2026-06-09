"use client";

import React, { useState } from "react";

interface ReferralData {
  Date: string;
  From: string;
  "From Business": string;
  "From Category": string;
  "From Contact": string;
  To: string;
  "To Business": string;
  "To Category": string;
  "To Contact": string;
  Note: string;
}

export function ReferralsExportButtons() {
  const [isExporting, setIsExporting] = useState(false);

  const exportReferralsPDF = async () => {
    try {
      setIsExporting(true);
      const res = await fetch("/api/export/referrals/json");
      const data: ReferralData[] = await res.json();
      
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
      doc.text("All Live Referrals & Connection Notes Log (Admin Export)", 20, 23.5);

      // Authorized User
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text("Authorized: Session Administrator", 20, 28.5);

      // Metadata summary
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 14, 42);
      doc.text(`Total Referrals Logged: ${data.length}`, 196, 42, { align: "right" });

      if (data.length === 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(13, 36, 33);
        doc.text("No referrals found in this session.", 14, 60);
      } else {
        const x = 14;
        const cardWidth = 182;
        const cardHeight = 58; // Increased from 52 to allow text wrapping
        const cardGap = 8;
        const pageLimitY = 270;
        
        let currentY = 48; // First card starts directly under page metadata

        data.forEach((ref) => {
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
          doc.rect(x, currentY, cardWidth, 28, "FD");

          // 3. Draw Bottom Half Card Body (Light tan background)
          doc.setFillColor(250, 248, 244); // #FAF8F4
          doc.rect(x, currentY + 28, cardWidth, 30, "F");
          doc.rect(x, currentY + 28, cardWidth, 30, "S"); // Outline border for bottom half

          // 4. Draw Initials Avatar Box for Sender
          doc.setFillColor(190, 240, 60); // #BEF03C
          doc.rect(x + 4, currentY + 4.5, 11, 11, "FD");

          const senderLetter = (ref.From || "?").charAt(0).toUpperCase();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(13, 36, 33);
          doc.text(senderLetter, x + 9.5, currentY + 12, { align: "center" });

          // 5. Draw Sender details
          const fromName = (ref.From || "Anonymous").toUpperCase();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(13, 36, 33);
          doc.text(`FROM: ${fromName}`, x + 18, currentY + 9);

          const fromCompany = ref["From Business"] !== "N/A" ? ref["From Business"] : "";
          const fromCategory = ref["From Category"] !== "N/A" ? ref["From Category"] : "";
          const fromSub = [fromCategory, fromCompany].filter(Boolean).join(" | ").toUpperCase();
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100);

          const fromSubText = fromSub || "PARTICIPANT";
          const maxSubWidth = 68; // Space before the middle divider
          
          const wrappedFromSub = doc.splitTextToSize(fromSubText, maxSubWidth);
          doc.text(wrappedFromSub, x + 18, currentY + 13.5);

          const fromContact = ref["From Contact"] !== "N/A" ? ref["From Contact"] : "";
          doc.setFontSize(6.5);
          doc.setTextColor(100);
          
          const wrappedFromContact = doc.splitTextToSize(fromContact, maxSubWidth);
          const fromContactStartY = currentY + 13.5 + (wrappedFromSub.length * 3.5);
          doc.text(wrappedFromContact, x + 18, fromContactStartY);

          // 6. Draw middle divider
          doc.setDrawColor(13, 36, 33, 0.15);
          doc.setLineWidth(0.4);
          doc.line(x + 91, currentY + 2, x + 91, currentY + 26);

          // 7. Draw Initials Avatar Box for Recipient
          doc.setFillColor(26, 62, 58); // Teal background for recipient to distinguish visually!
          doc.rect(x + 95, currentY + 4.5, 11, 11, "FD");

          const recipientLetter = (ref.To || "?").charAt(0).toUpperCase();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(255, 255, 255);
          doc.text(recipientLetter, x + 100.5, currentY + 12, { align: "center" });

          // 8. Draw Recipient details
          const toName = (ref.To || "Anonymous").toUpperCase();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(13, 36, 33);
          doc.text(`TO: ${toName}`, x + 109, currentY + 9);

          const toCompany = ref["To Business"] !== "N/A" ? ref["To Business"] : "";
          const toCategory = ref["To Category"] !== "N/A" ? ref["To Category"] : "";
          const toSub = [toCategory, toCompany].filter(Boolean).join(" | ").toUpperCase();
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100);

          const toSubText = toSub || "PARTICIPANT";
          const wrappedToSub = doc.splitTextToSize(toSubText, maxSubWidth);
          doc.text(wrappedToSub, x + 109, currentY + 13.5);

          const toContact = ref["To Contact"] !== "N/A" ? ref["To Contact"] : "";
          doc.setFontSize(6.5);
          doc.setTextColor(100);
          
          const wrappedToContact = doc.splitTextToSize(toContact, maxSubWidth);
          const toContactStartY = currentY + 13.5 + (wrappedToSub.length * 3.5);
          doc.text(wrappedToContact, x + 109, toContactStartY);

          // 9. Draw Watermark inside Card Background
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.setTextColor(233, 229, 221);
          doc.text("HACKBOATS", x + cardWidth / 2, currentY + 47, { align: "center" });

          // 10. Draw Connection Note Inside Bottom Half
          const noteText = ref.Note ? `"${ref.Note}"` : "No connection notes were provided.";
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8.5);
          doc.setTextColor(13, 36, 33);
          const wrappedLines = doc.splitTextToSize(noteText, cardWidth - 12);
          doc.text(wrappedLines, x + 6, currentY + 35);

          // 11. Draw referral date at bottom right of card
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(120);
          doc.text(`Date: ${ref.Date}`, x + cardWidth - 6, currentY + 54, { align: "right" });

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

      doc.save("conclave_referrals.pdf");
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
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
    </>
  );
}

