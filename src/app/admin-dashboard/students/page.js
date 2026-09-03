"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const SECTIONS = [
  { key: "School", label: "School", icon: "🏫", color: "bg-blue-50 text-blue-700" },
  { key: "College", label: "College", icon: "🎓", color: "bg-purple-50 text-purple-700" },
  { key: "Tutorial", label: "Tutorial", icon: "📘", color: "bg-amber-50 text-amber-700" },
];

export default function StudentsPage() {
  const [counts, setCounts] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCounts() {
      setLoading(true);
      const stored = sessionStorage.getItem("shinnystar_user");
      const location = stored ? JSON.parse(stored).location : null;
      const results = await Promise.all(
        SECTIONS.map((s) => {
          let q = supabase.from("students").select("id", { count: "exact", head: true }).eq("branch", s.key);
          if (location) q = q.eq("location", location);
          return q;
        })
      );
      const newCounts = {};
      let total = 0;
      SECTIONS.forEach((s, i) => {
        const c = results[i].count || 0;
        newCounts[s.key] = c;
        total += c;
      });
      setCounts(newCounts);
      setTotalCount(total);
      setLoading(false);
    }
    loadCounts();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Students</h1>
          <p className="text-sm text-slate-500 mt-1">{loading ? "Loading..." : totalCount + " students enrolled across all sections"}</p>
        </div>
        <Link href="/admin-dashboard/students/add" className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm">+ Add Student</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
        {SECTIONS.map((s) => (
          <Link key={s.key} href={"/admin-dashboard/students/" + s.key.toLowerCase()} className="border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
            <div className={"w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 " + s.color}>{s.icon}</div>
            <h2 className="text-lg font-semibold text-slate-800">{s.label}</h2>
            <p className="text-3xl font-bold text-slate-800 mt-2">{loading ? "-" : counts[s.key] || 0}</p>
            <p className="text-sm text-slate-500 mt-1">students</p>
            <p className="text-sm text-brand-blue-strong font-medium mt-4">View students →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}