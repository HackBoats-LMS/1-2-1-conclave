import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  const isAdmin = session?.user && (session.user as any).role === "ADMIN";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">1-2-1 Conclave</h1>
        <p className="text-gray-500 mb-8">Business Networking Platform</p>

        <div className="space-y-4">
          {isAdmin && (
            <a href="/admin" className="block w-full py-3 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium">
              Admin Panel
            </a>
          )}
          <a href="/dashboard" className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
            User Dashboard
          </a>
          <a href="/onboarding" className="block w-full py-3 px-4 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">
            Onboarding Flow
          </a>
        </div>
      </div>
    </div>
  );
}
