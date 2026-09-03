"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TeacherLayout({ children }) {
  const router = useRouter();
  const [teacher, setTeacher] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("shinnystar_user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(stored);
    if (user.role !== "teacher") {
      router.push("/login");
      return;
    }
    setTeacher(user);
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem("shinnystar_user");
    router.push("/login");
  }

  const links = [
    { href: "/teacher-dashboard", label: "Dashboard" },
    { href: "/teacher-dashboard/profile", label: "Profile" },
    { href: "/teacher-dashboard/students", label: "Students" },
    { href: "/teacher-dashboard/classes", label: "Classes" },
    { href: "/teacher-dashboard/attendance", label: "Mark Attendance" },
    { href: "/teacher-dashboard/my-attendance", label: "My Attendance" },
    { href: "/teacher-dashboard/exams", label: "Exams" },
    { href: "/teacher-dashboard/results", label: "Results" },
    { href: "/teacher-dashboard/lesson-notes", label: "Lesson Notes" },
    { href: "/teacher-dashboard/notices", label: "Notices" },
  ];

  if (!teacher) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading...</div>;

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-64 bg-brand-blue-strong text-white flex-shrink-0 border-r border-white/10 flex flex-col">
        <div className="px-6 py-5 border-b border-white/20">
          <h2 className="font-bold text-lg tracking-wide">SHINNY STAR</h2>
          <p className="text-xs text-white/70">Teacher Portal</p>
        </div>
        <nav className="flex flex-col p-4 gap-1 flex-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/20">
          <p className="text-xs text-white/70 mb-2">{teacher.full_name} • {teacher.branch}</p>
          <button onClick={handleLogout} className="text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition w-full text-left">Log Out</button>
        </div>
      </aside>
      <div className="flex-1 bg-brand-blue min-h-screen p-6">
        <div className="bg-white border border-slate-200 rounded-xl min-h-full p-8">{children}</div>
      </div>
    </div>
  );
}