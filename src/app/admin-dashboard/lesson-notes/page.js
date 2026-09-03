"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BRANCHES = [
  { key: "School", icon: "🏫", color: "bg-blue-50 text-blue-700" },
  { key: "College", icon: "🎓", color: "bg-purple-50 text-purple-700" },
  { key: "Tutorial", icon: "📘", color: "bg-amber-50 text-amber-700" },
];

export default function LessonNotesPage() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const stored = sessionStorage.getItem("shinnystar_user");
      const location = stored ? JSON.parse(stored).location : null;
      const results = await Promise.all(
        BRANCHES.map((b) => supabase.from("lesson_notes").select("id", { count: "exact", head: true }).eq("branch", b.key).eq("location", location))
      );
      const c = {};
      BRANCHES.forEach((b, i) => { c[b.key] = results[i].count || 0; });
      setCounts(c);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Lesson Notes</h1>
      <p className="text-sm text-slate-500 mb-8">Browse, write, and upload lesson notes by section and class.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {BRANCHES.map((b) => (
          <Link key={b.key} href={"/admin-dashboard/lesson-notes/" + b.key.toLowerCase()} className="border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
            <div className={"w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 " + b.color}>{b.icon}</div>
            <h2 className="text-lg font-semibold text-slate-800">{b.key}</h2>
            <p className="text-3xl font-bold text-slate-800 mt-2">{loading ? "-" : counts[b.key] || 0}</p>
            <p className="text-sm text-slate-500 mt-1">notes</p>
            <p className="text-sm text-brand-blue-strong font-medium mt-4">View notes →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}