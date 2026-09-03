"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentLayout({ children }) {
  const router = useRouter();
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("shinnystar_user");
    if (!stored) { router.push("/login"); return; }
    const user = JSON.parse(stored);
    if (user.role !== "student") { router.push("/login"); return; }
    setStudent(user);
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem("shinnystar_user");
    router.push("/login");
  }

  const links = [
    { href: "/student-dashboard", label: "Dashboard" },
    { href: "/student-dashboard/profile", label: "Profile" },
    { href: "/student-dashboard/attendance", label: "Attendance" },
    { href: "/student-dashboard/exams", label: "Exams" },
    { href: "/student-dashboard/lesson-notes", label: "Lesson Notes" },
    { href: "/student-dashboard/notices", label: "Notices" },
  ];

  if (!student) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading...</div>;

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <aside className="w-64 bg-brand-blue-strong text-white flex-shrink-0 border-r border-white/10 flex flex-col h-screen">
        <div className="px-6 py-5 border-b border-white/20 flex-shrink-0">
          <h2 className="font-bold text-lg tracking-wide">SHINNY STAR</h2>
          <p className="text-xs text-white/70">Student Portal</p>
        </div>
        <nav className="flex flex-col p-4 gap-1 overflow-y-auto flex-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/20 flex-shrink-0">
          <p className="text-xs text-white/70 mb-2">{student.full_name} • {student.class}</p>
          <button onClick={handleLogout} className="text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition w-full text-left">Log Out</button>
        </div>
      </aside>
      <div className="flex-1 bg-brand-blue overflow-y-auto p-6">
        <div className="bg-white border border-slate-200 rounded-xl min-h-full p-8">{children}</div>
      </div>
    </div>
  );
}