"use client";
import Link from "next/link";

const BRANCHES = [
  { key: "School", icon: "🏫", color: "bg-blue-50 text-blue-700" },
  { key: "College", icon: "🎓", color: "bg-purple-50 text-purple-700" },
  { key: "Tutorial", icon: "📘", color: "bg-amber-50 text-amber-700" },
];

export default function FeesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Fees</h1>
      <p className="text-sm text-slate-500 mb-8">Set class bills, track payments, and print statements.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {BRANCHES.map((b) => (
          <Link key={b.key} href={"/admin-dashboard/fees/" + b.key.toLowerCase()} className="border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
            <div className={"w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 " + b.color}>{b.icon}</div>
            <h2 className="text-lg font-semibold text-slate-800">{b.key}</h2>
            <p className="text-sm text-brand-blue-strong font-medium mt-4">Manage fees →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}