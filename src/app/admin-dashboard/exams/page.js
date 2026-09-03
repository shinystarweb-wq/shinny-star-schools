"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BRANCHES = ["School", "College", "Tutorial"];
const inputClass = "border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function ExamsPage() {
  const [tab, setTab] = useState("all");
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [branchFilter, setBranchFilter] = useState("");
  const [classOptions, setClassOptions] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [search, setSearch] = useState("");

  async function loadExams() {
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data } = await supabase.from("exams").select("*, exam_questions(count)").eq("location", location).order("created_at", { ascending: false });
    setExams(data || []);
    setLoading(false);
  }

  useEffect(() => { loadExams(); }, []);

  useEffect(() => {
    async function loadClasses() {
      if (!branchFilter) { setClassOptions([]); setClassFilter(""); return; }
      const { data } = await supabase.from("classes").select("name").eq("branch", branchFilter).order("name");
      setClassOptions((data || []).map((c) => c.name));
      setClassFilter("");
    }
    loadClasses();
  }, [branchFilter]);

  const today = todayStr();

  function baseFiltered(list) {
    return list.filter((e) => {
      if (branchFilter && e.branch !== branchFilter) return false;
      if (classFilter && e.class !== classFilter) return false;
      if (search.trim() && !e.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }

  const allExams = baseFiltered(exams);
  const readyExams = baseFiltered(exams.filter((e) => e.submission_status === "pending_review"));
  const publishedExams = baseFiltered(exams.filter((e) => e.submission_status === "published" && (!e.exam_date || e.exam_date >= today)));
  const doneExams = baseFiltered(exams.filter((e) => e.submission_status === "published" && e.exam_date && e.exam_date < today));

  const tabs = [
    { key: "all", label: "All Exams", count: allExams.length },
    { key: "ready", label: "Ready Exams", count: readyExams.length },
    { key: "published", label: "Published Exams", count: publishedExams.length },
    { key: "done", label: "Done Exams", count: doneExams.length },
  ];

  const listForTab = { all: allExams, ready: readyExams, published: publishedExams, done: doneExams }[tab];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Exams</h1>
          <p className="text-sm text-slate-500 mt-1">Create, review, and publish CBT exams.</p>
        </div>
        <Link href="/admin-dashboard/exams/create" className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm">+ Create Exam</Link>
      </div>

      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl w-fit flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={"text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2 " + (tab === t.key ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>
            {t.label}
            <span className={"text-[10px] font-semibold px-1.5 py-0.5 rounded-full " + (tab === t.key ? "bg-brand-blue text-brand-blue-strong" : "bg-slate-200 text-slate-500")}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exam name..." className={inputClass + " flex-1 min-w-[200px]"} />
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className={inputClass}>
          <option value="">All Sections</option>
          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} disabled={!branchFilter} className={inputClass + (!branchFilter ? " opacity-50" : "")}>
          <option value="">All Classes</option>
          {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading exams...</p>
      ) : listForTab.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">
            {tab === "all" && "No exams found."}
            {tab === "ready" && "No exams waiting for review right now."}
            {tab === "published" && "No published upcoming exams right now."}
            {tab === "done" && "No completed exams yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {listForTab.map((e) => {
            const qCount = e.exam_questions?.[0]?.count || 0;
            const cardStyle = e.submission_status === "pending_review" ? "border-amber-200 bg-amber-50/40" : tab === "done" ? "border-slate-200 bg-slate-50/40" : "border-slate-200";
            const badge = e.submission_status === "pending_review"
              ? { text: "Pending Review", color: "bg-amber-100 text-amber-700" }
              : e.submission_status === "published"
              ? { text: tab === "done" ? "Completed" : "Published", color: tab === "done" ? "bg-slate-200 text-slate-600" : "bg-green-100 text-green-700" }
              : { text: "Draft", color: "bg-slate-100 text-slate-500" };

            return (
              <Link key={e.id} href={"/admin-dashboard/exams/manage/" + e.id} className={"border rounded-xl p-5 hover:shadow-md transition-all duration-200 block " + cardStyle}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-800 pr-2">{e.name}</h3>
                  <span className={"text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 " + badge.color}>{badge.text}</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">{e.branch} • {e.class} {e.subject ? "• " + e.subject : ""}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>⏱ {e.duration_minutes} min</span>
                  <span>• {qCount} questions</span>
                </div>
                {e.exam_date && <p className="text-xs text-slate-400 mt-2">{e.exam_date}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}