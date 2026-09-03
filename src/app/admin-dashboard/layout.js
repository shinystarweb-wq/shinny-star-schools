"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("shinnystar_user");
    if (!stored) { router.push("/login"); return; }
    const user = JSON.parse(stored);
    if (user.role !== "admin") { router.push("/login"); return; }
    setAdmin(user);
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem("shinnystar_user");
    router.push("/login");
  }

  const linkGroups = [
    {
      label: "General",
      links: [{ href: "/admin-dashboard", label: "Overview" }],
    },
    {
      label: "People",
      links: [
        { href: "/admin-dashboard/students", label: "Students" },
        { href: "/admin-dashboard/teachers", label: "Teachers" },
      ],
    },
    {
      label: "Academics",
      links: [
        { href: "/admin-dashboard/classes", label: "Classes" },
        { href: "/admin-dashboard/attendance", label: "Attendance" },
        { href: "/admin-dashboard/exams", label: "Exams" },
        { href: "/admin-dashboard/results", label: "Results" },
        { href: "/admin-dashboard/lesson-notes", label: "Lesson Notes" },
      ],
    },
    {
      label: "Finance",
      links: [{ href: "/admin-dashboard/fees", label: "Fees" }],
    },
    {
      label: "Communication",
      links: [
        { href: "/admin-dashboard/notices", label: "Notices" },
        { href: "/admin-dashboard/newsletter", label: "Newsletter" },
      ],
    },
    {
      label: "System",
      links: [{ href: "/admin-dashboard/settings", label: "Settings" }],
    },
  ];

  if (!admin) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading...</div>;

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <aside className="w-64 bg-brand-blue-strong text-white flex-shrink-0 border-r border-white/10 flex flex-col h-screen">
        <div className="px-6 py-5 border-b border-white/20 flex-shrink-0">
          <h2 className="font-bold text-lg tracking-wide">SHINNY STAR</h2>
          <p className="text-xs text-white/70">Admin Panel {admin ? "— " + admin.location : ""}</p>
        </div>
        <nav className="flex flex-col p-4 gap-4 overflow-y-auto flex-1">
          {linkGroups.map((group) => (
            <div key={group.label}>
              <p className="px-4 text-xs uppercase tracking-wide text-white/50 mb-1">{group.label}</p>
              <div className="flex flex-col gap-1">
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-end flex-shrink-0">
          <button onClick={handleLogout} className="text-sm font-medium text-slate-600 hover:text-red-600 transition flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Log Out
          </button>
        </div>
        <div className="flex-1 bg-brand-blue overflow-y-auto p-6">
          <div className="bg-white border border-slate-200 rounded-xl min-h-full p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}