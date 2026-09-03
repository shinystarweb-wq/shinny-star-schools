"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const inputClass = "border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function TeacherExamsPage() {
  const [branch, setBranch] = useState("");
  const [exams, setExams] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  async function loadData(userBranch) {
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const [examsRes, classesRes] = await Promise.all([
      supabase.from("exams").select("*, exam_questions(count)").eq("branch", userBranch).eq("location", location).order("created_at", { ascending: false }),
      supabase.from("classes").select("name").eq("branch", userBranch).eq("location", location).order("name"),
    ]);
    setExams(examsRes.data || []);
    setClassOptions((classesRes.data || []).map((c) => c.name));
    setLoading(false);
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("shinnystar_user");
    if (!stored) return;
    const user = JSON.parse(stored);
    setBranch(user.branch);
    loadData(user.branch);
  }, []);

  async function handleDelete(id, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this exam? This will also delete all its questions.")) return;
    await supabase.from("exams").delete().eq("id", id);
    loadData(branch);
  }

  const filtered = exams.filter((e) => {
    if (classFilter && e.class !== classFilter) return false;
    if (statusFilter && e.status !== statusFilter) return false;
    if (search.trim() && !e.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Exams</h1>
          <p className="text-sm text-slate-500 mt-1">{branch} Section — {filtered.length} of {exams.length} exams</p>
        </div>
        <Link href="/teacher-dashboard/exams/create" className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm">+ Create Exam</Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exam name..." className={inputClass + " flex-1 min-w-[200px]"} />
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={inputClass}>
          <option value="">All Classes</option>
          {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading exams...</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">{exams.length === 0 ? "No exams created yet." : "No exams match your filters."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((e) => {
            const qCount = e.exam_questions?.[0]?.count || 0;
            return (
              <div key={e.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all duration-200 relative">
                <Link href={"/teacher-dashboard/exams/manage/" + e.id} className="block">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-800 pr-8">{e.name}</h3>
                    <span className={"text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 " + (e.status === "published" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>{e.status === "published" ? "Published" : "Draft"}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{e.class} {e.subject ? "• " + e.subject : ""}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>⏱ {e.duration_minutes} min</span>
                    <span>• {qCount} questions</span>
                  </div>
                </Link>
                <button onClick={(e2) => handleDelete(e.id, e2)} className="absolute top-4 right-4 text-slate-400 hover:text-red-600 transition-colors bg-white rounded-md p-1" title="Delete exam">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                    <path d="M10 11v6"></path>
                    <path d="M14 11v6"></path>
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}