"use client";
import Link from "next/link";

const OPTIONS = [
  { key: "events", label: "Events", icon: "📅", desc: "Add and manage upcoming school events.", color: "bg-blue-50 text-blue-700" },
  { key: "articles", label: "Articles", icon: "📰", desc: "Write news, announcements, and stories.", color: "bg-purple-50 text-purple-700" },
  { key: "issues", label: "Print Issue", icon: "🖨", desc: "Assemble and print a full newsletter issue.", color: "bg-amber-50 text-amber-700" },
];

export default function NewsletterPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Newsletter</h1>
      <p className="text-sm text-slate-500 mb-8">Manage events and articles, then print a full newsletter issue.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {OPTIONS.map((o) => (
          <Link key={o.key} href={"/admin-dashboard/newsletter/" + o.key} className="border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
            <div className={"w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 " + o.color}>{o.icon}</div>
            <h2 className="text-lg font-semibold text-slate-800">{o.label}</h2>
            <p className="text-sm text-slate-500 mt-1">{o.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}