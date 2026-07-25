import Link from "next/link";

export default function AdminLayout({ children }) {
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
  ];

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-64 bg-brand-blue-strong text-white flex-shrink-0 border-r border-white/10">
        <div className="px-6 py-5 border-b border-white/20">
          <h2 className="font-bold text-lg tracking-wide">SHINNY STAR</h2>
          <p className="text-xs text-white/70">Admin Panel</p>
        </div>
        <nav className="flex flex-col p-4 gap-4">
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
      <div className="flex-1 bg-brand-blue min-h-screen p-6">
        <div className="bg-white border border-slate-200 rounded-xl min-h-full p-8">{children}</div>
      </div>
    </div>
  );
}