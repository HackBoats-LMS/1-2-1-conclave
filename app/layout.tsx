import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "1-2-1 Conclave - Structured Networking Lobby",
  description: "1-2-1 Conclave orchestrates real-time, round-based, whitelisted matchmaking events for business networking and lead exchange.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        
        {/* Unified Global Footer */}
        <footer className="w-full bg-[#0D2421] text-[#FAF8F4]/60 py-6 px-6 border-t border-[#0D2421] mt-auto select-none">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            
            {/* Left: Branding */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#BEF03C] border border-[#0D2421] flex items-center justify-center text-[#0D2421] font-black text-sm shadow-[1.5px_1.5px_0px_#FAF8F4]">
                C
              </div>
              <span className="font-black text-[#FAF8F4] text-base tracking-tight uppercase">1-2-1 Conclave</span>
            </div>

            {/* Center: Powered By */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-[#FAF8F4]/50 uppercase tracking-widest mt-0.5">Powered by</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/hb-logo.png" 
                alt="HackBoats" 
                className="h-6 md:h-7 object-contain hover:scale-105 transition-transform duration-300 drop-shadow-sm" 
                draggable={false}
              />
            </div>

            {/* Right: Copyright & Support */}
            <div className="flex flex-col items-center md:items-end gap-1">
              <p className="text-[10px] font-bold text-[#FAF8F4]/80 uppercase tracking-widest">
                Support: +91 99634 49974
              </p>
              <p className="text-[10px] font-bold text-[#FAF8F4]/40 uppercase tracking-widest">
                &copy; {new Date().getFullYear()} 1-2-1 Conclave. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
