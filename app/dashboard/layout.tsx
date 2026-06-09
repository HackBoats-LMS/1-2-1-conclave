import { auth } from "@/lib/auth";
import { ExitWarning } from "./ExitWarning";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  return (
    <div className="relative min-h-screen w-full">
      <ExitWarning />
      {/* Floating Global Header for Dashboard */}
      <div className="absolute top-0 left-0 w-full p-4 sm:p-6 z-50 pointer-events-none flex justify-end">
        <div className="pointer-events-auto flex items-center gap-3">
        </div>
      </div>
      
      {/* Page Content */}
      {children}
    </div>
  );
}
