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
        
        {/* Global Footer */}
        <footer className="w-full py-8 mt-auto flex justify-center items-center gap-3 select-none">
          <span className="text-xs font-black text-[#0D2421]/50 uppercase tracking-widest mt-1">Powered by</span>
          <img 
            src="/hb-logo.png" 
            alt="HackBoats" 
            className="h-8 md:h-10 object-contain hover:scale-105 transition-transform duration-300 drop-shadow-sm" 
            draggable={false}
          />
        </footer>
      </body>
    </html>
  );
}
