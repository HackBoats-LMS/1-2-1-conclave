"use client";
import { useState, useMemo } from "react";
import { EditUserRoleButton } from "./EditUserRoleButton";
import { DeleteUserButton } from "./DeleteUserButton";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  businessName: string | null;
  businessCategory: string | null;
  isApproved: boolean;
  role: string;
}

export function UserTable({ users }: { users: UserRow[] }) {
  const [query, setQuery] = useState("");
  const [showAdmins, setShowAdmins] = useState(false);

  const filtered = useMemo(() => {
    let res = users;

    // 1. Filter out admins if showAdmins is false
    if (!showAdmins) {
      res = res.filter(u => u.role !== "ADMIN");
    }

    // 2. Filter by search query
    const q = query.trim().toLowerCase();
    if (q) {
      res = res.filter(u =>
        u.email?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q) ||
        u.businessName?.toLowerCase().includes(q) ||
        u.businessCategory?.toLowerCase().includes(q)
      );
    }

    // 3. Dynamic sorting
    res = [...res].sort((a, b) => {
      let order: Record<string, number>;
      if (showAdmins) {
        order = { ADMIN: 1, CAPTAIN: 2, VISITOR: 3, USER: 4 };
      } else {
        order = { CAPTAIN: 1, VISITOR: 2, USER: 3, ADMIN: 99 };
      }
      
      const priorityA = order[a.role] || 99;
      const priorityB = order[b.role] || 99;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      const emailA = a.email || "";
      const emailB = b.email || "";
      return emailA.localeCompare(emailB);
    });

    return res;
  }, [query, showAdmins, users]);

  return (
    <div className="space-y-6">
      {/* Search */}
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#0D2421]/40">
            <MagnifyingGlassIcon className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Search members by name, email, company, or group..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-white border-2 border-[#0D2421] rounded-2xl pl-12 pr-10 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#BEF03C]/50 font-bold transition-all placeholder:text-[#0D2421]/30 shadow-[4px_4px_0px_#0D2421]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#0D2421]/40 hover:text-[#0D2421]"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <label className="flex items-center gap-3 cursor-pointer whitespace-nowrap bg-white border-2 border-[#0D2421] rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-wider text-[#0D2421] shadow-[4px_4px_0px_#0D2421] hover:bg-[#FAF8F4] transition-colors select-none flex-shrink-0">
          <input 
            type="checkbox" 
            checked={showAdmins} 
            onChange={(e) => setShowAdmins(e.target.checked)}
            className="w-5 h-5 accent-[#0D2421] border-2 border-[#0D2421] rounded cursor-pointer"
          />
          Show Admins
        </label>
      </div>

      {/* Table — hidden on mobile */}
      <div className="hidden md:block overflow-x-auto border-2 border-[#0D2421] rounded-[2rem] bg-white shadow-[4px_4px_0px_#0D2421] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF8F4] border-b-2 border-[#0D2421]">
              <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider">Name / Email</th>
              <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider">Business Details</th>
              <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider text-center">Login Whitelist</th>
              <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider text-center">Auth Level</th>
              <th className="py-4 px-6 font-black uppercase text-xs text-[#0D2421]/60 tracking-wider text-right">
                {filtered.length !== users.length ? `${filtered.length} / ${users.length}` : `Total: ${users.length}`}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0D2421]/15 text-xs">
            {filtered.map(user => (
              <tr key={user.id} className="hover:bg-[#FAF8F4]/30 transition-colors">
                <td className="py-4 px-6">
                  <div className="font-black text-sm text-[#0D2421]">{user.name || "N/A"}</div>
                  <div className="text-[#0D2421]/60 font-semibold">{user.email}</div>
                </td>
                <td className="py-4 px-6">
                  <div className="font-black text-sm text-[#0D2421]">{user.businessName || "-"}</div>
                  <div className="text-slate-400 font-bold uppercase text-[10px] tracking-wide">{user.businessCategory || "-"}</div>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-xl border border-[#0D2421] font-black text-[9px] uppercase shadow-[1.5px_1.5px_0px_#0D2421] ${
                    user.isApproved ? "bg-[#BEF03C] text-[#0D2421]" : "bg-amber-100 text-[#0D2421]"
                  }`}>
                    {user.isApproved ? "Approved" : "Pending"}
                  </span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl border border-[#0D2421] font-black text-[9px] uppercase shadow-[1.5px_1.5px_0px_#0D2421] ${
                    user.role === "ADMIN"
                      ? "bg-[#0D2421] text-[#BEF03C]"
                      : user.role === "CAPTAIN"
                        ? "bg-amber-400 text-[#0D2421]"
                        : "bg-white text-[#0D2421]"
                  }`}>
                    {user.role === "CAPTAIN" && "👑 "}
                    {user.role}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <EditUserRoleButton userId={user.id} currentRole={user.role} />
                    <DeleteUserButton userId={user.id} />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#0D2421]/40 font-bold uppercase tracking-wider">
                  {users.length === 0 ? "No registered users in database" : "No users match your search"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Card list — visible only on mobile */}
      <div className="md:hidden space-y-3">
        {filtered.map(user => (
          <div key={user.id} className="bg-white border-2 border-[#0D2421] rounded-2xl p-4 shadow-[3px_3px_0px_#0D2421] space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-sm text-[#0D2421] truncate">{user.name || "N/A"}</p>
                <p className="text-xs text-[#0D2421]/60 font-semibold truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <EditUserRoleButton userId={user.id} currentRole={user.role} />
                <DeleteUserButton userId={user.id} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-xl border border-[#0D2421] font-black text-[9px] uppercase shadow-[1.5px_1.5px_0px_#0D2421] ${
                user.isApproved ? "bg-[#BEF03C] text-[#0D2421]" : "bg-amber-100 text-[#0D2421]"
              }`}>
                {user.isApproved ? "Approved" : "Pending"}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-[#0D2421] font-black text-[9px] uppercase shadow-[1.5px_1.5px_0px_#0D2421] ${
                user.role === "ADMIN" ? "bg-[#0D2421] text-[#BEF03C]" : user.role === "CAPTAIN" ? "bg-amber-400 text-[#0D2421]" : "bg-white text-[#0D2421]"
              }`}>
                {user.role === "CAPTAIN" && "👑 "}{user.role}
              </span>
              {(user.businessName || user.businessCategory) && (
                <span className="text-[10px] font-bold text-[#0D2421]/50 uppercase tracking-wide self-center">
                  {user.businessName}{user.businessName && user.businessCategory ? " · " : ""}{user.businessCategory}
                </span>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[#0D2421]/40 font-bold uppercase tracking-wider text-sm">
            {users.length === 0 ? "No registered users in database" : "No users match your search"}
          </div>
        )}
      </div>
    </div>
  );
}
