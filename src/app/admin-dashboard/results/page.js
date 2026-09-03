"use client";
import Link from "next/link";

const OPTIONS = [
  { key: "entry", label: "Record Scores", icon: "📝", desc: "Enter CA and exam scores for a subject, term, and class.", color: "bg-blue-50 text-blue-700" },
  { key: "reportcards", label: "Report Cards", icon: "📊", desc: "View, review, and print each student's report card.", color: "bg-purple-50 text-purple-700" },
  { key: "subjects", label: "Manage Subjects", icon: "📚", desc: "Add or remove subjects offered per section.", color: "bg-amber-50 text-amber-700" },
  { key: "settings", label: "Class Settings", icon: "⚙️", desc: "Toggle whether positions show on report cards.", color: "bg-green-50 text-green-700" },
];

export default function ResultsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Results</h1>
      <p className="text-sm text-slate-500 mb-8">Record scores, generate report cards, and manage subjects.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {OPTIONS.map((o) => (
          <Link key={o.key} href={"/admin-dashboard/results/" + o.key} className="border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
            <div className={"w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 " + o.color}>{o.icon}</div>
            <h2 className="text-lg font-semibold text-slate-800">{o.label}</h2>
            <p className="text-sm text-slate-500 mt-1">{o.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}