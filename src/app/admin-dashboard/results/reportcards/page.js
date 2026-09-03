"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BRANCHES = [
  { key: "School", icon: "🏫", color: "bg-blue-50 text-blue-700" },
  { key: "College", icon: "🎓", color: "bg-purple-50 text-purple-700" },
  { key: "Tutorial", icon: "📘", color: "bg-amber-50 text-amber-700" },
];

export default function ReportCardsPage() {
  const [view, setView] = useState("branches");
  const [branch, setBranch] = useState("");
  const [classes, setClasses] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);

  async function openBranch(b) {
    setBranch(b);
    setView("classes");
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data: classData } = await supabase.from("classes").select("*").eq("branch", b).eq("location", location).order("name");
    const { data: studentData } = await supabase.from("students").select("class").eq("branch", b).eq("location", location);
    const c = {};
    (studentData || []).forEach((s) => { c[s.class] = (c[s.class] || 0) + 1; });
    setClasses(classData || []);
    setCounts(c);
    setLoading(false);
  }

  return (
    <div>
      <Link href="/admin-dashboard/results" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← Results</Link>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Report Cards</h1>
      <p className="text-sm text-slate-500 mb-8">Select a section and class to view student report cards.</p>

      {view !== "branches" && (
        <button onClick={() => setView("branches")} className="text-sm text-brand-blue-strong font-medium mb-5 inline-block hover:underline">← All Sections</button>
      )}

      {view === "branches" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BRANCHES.map((b) => (
            <button key={b.key} onClick={() => openBranch(b.key)} className="border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left">
              <div className={"w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 " + b.color}>{b.icon}</div>
              <h2 className="text-lg font-semibold text-slate-800">{b.key}</h2>
              <p className="text-sm text-brand-blue-strong font-medium mt-4">View classes →</p>
            </button>
          ))}
        </div>
      )}

      {view === "classes" && (
        loading ? (
          <p className="text-slate-500 text-sm">Loading classes...</p>
        ) : classes.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
            <p className="text-slate-500 text-sm">No classes found for {branch}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {classes.map((c) => (
              <Link key={c.id} href={"/admin-dashboard/results/reportcards/" + branch.toLowerCase() + "/" + encodeURIComponent(c.name)} className="border border-slate-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
                <h3 className="font-semibold text-slate-800">{c.name}</h3>
                <p className="text-2xl font-bold text-slate-800 mt-2">{counts[c.name] || 0}</p>
                <p className="text-xs text-slate-500">students</p>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}