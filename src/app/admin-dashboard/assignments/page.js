"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const BRANCHES = [
  { key: "School", icon: "🏫", color: "bg-blue-50 text-blue-700" },
  { key: "College", icon: "🎓", color: "bg-purple-50 text-purple-700" },
  { key: "Tutorial", icon: "📘", color: "bg-amber-50 text-amber-700" },
];
const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function AdminAssignmentsPage() {
  const [view, setView] = useState("branches");
  const [branch, setBranch] = useState("");
  const [classOptions, setClassOptions] = useState([]);
  const [activeClass, setActiveClass] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  async function openBranch(b) {
    setBranch(b);
    setView("classes");
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data } = await supabase.from("classes").select("name").eq("branch", b).eq("location", location).order("name");
    setClassOptions((data || []).map((c) => c.name));
  }

  async function openClass(c) {
    setActiveClass(c);
    setView("list");
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data } = await supabase.from("assignments").select("*, assignment_submissions(count)").eq("branch", branch).eq("class", c).eq("location", location).order("created_at", { ascending: false });
    setAssignments(data || []);
    setLoading(false);
  }

  async function openAssignment(a) {
    setSelected(a);
    const { data } = await supabase.from("assignment_submissions").select("*, students(full_name, photo_url)").eq("assignment_id", a.id).order("submitted_at", { ascending: false });
    setSubmissions(data || []);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Assignments</h1>
        <a href="/admin-dashboard/assignments/create" className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm">+ Create Assignment</a>
      </div>
      <p className="text-sm text-slate-500 mb-8">
        {view === "branches" && "Select a section to view assignments."}
        {view === "classes" && "Select a class."}
        {(view === "list" || view === "detail") && "Assignments for " + activeClass}
      </p>

      {view !== "branches" && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button onClick={() => setView("branches")} className="hover:text-brand-blue-strong hover:underline">Sections</button>
          <span>/</span>
          {view === "classes" ? <span className="text-slate-800 font-medium">{branch}</span> : <button onClick={() => setView("classes")} className="hover:text-brand-blue-strong hover:underline">{branch}</button>}
          {(view === "list" || view === "detail") && <span>/</span>}
          {(view === "list" || view === "detail") && (view === "list" ? <span className="text-slate-800 font-medium">{activeClass}</span> : <button onClick={() => { setView("list"); setSelected(null); }} className="hover:text-brand-blue-strong hover:underline">{activeClass}</button>)}
          {view === "detail" && <span>/</span>}
          {view === "detail" && <span className="text-slate-800 font-medium">{selected.title}</span>}
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {classOptions.map((c) => (
            <button key={c} onClick={() => openClass(c)} className="border border-slate-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left">
              <h3 className="font-semibold text-slate-800">{c}</h3>
            </button>
          ))}
        </div>
      )}

      {view === "list" && (
        loading ? <p className="text-slate-500 text-sm">Loading...</p> :
        assignments.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center"><p className="text-slate-500 text-sm">No assignments for {activeClass} yet.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {assignments.map((a) => (
              <button key={a.id} onClick={() => { openAssignment(a); setView("detail"); }} className="border border-slate-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-800">{a.title}</h3>
                  <span className={"text-[10px] font-semibold px-2 py-1 rounded-full " + (a.status === "published" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>{a.status}</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{a.subject}</p>
                <p className="text-xs text-slate-400">{a.assignment_submissions?.[0]?.count || 0} submissions</p>
                {a.due_date && <p className="text-xs text-slate-400 mt-1">Due {a.due_date}</p>}
              </button>
            ))}
          </div>
        )
      )}

      {view === "detail" && selected && (
        <div>
          <div className="border border-slate-200 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-slate-800 mb-1">{selected.title}</h2>
            <p className="text-xs text-slate-500 mb-3">{selected.subject} {selected.due_date ? "• Due " + selected.due_date : ""}</p>
            {selected.instructions && <p className="text-sm text-slate-600 mb-2">{selected.instructions}</p>}
            {selected.questions && <p className="text-sm text-slate-700 whitespace-pre-wrap border-t border-slate-100 pt-3 mt-3">{selected.questions}</p>}
          </div>

          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">Submissions ({submissions.length})</h2>
          {submissions.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center"><p className="text-slate-500 text-sm">No submissions yet.</p></div>
          ) : (
            <div className="flex flex-col gap-2">
              {submissions.map((s) => (
                <div key={s.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {s.students?.photo_url ? (
                      <img src={s.students.photo_url} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-blue" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-xs font-semibold text-brand-blue-strong">{s.students?.full_name?.charAt(0)}</div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.students?.full_name}</p>
                      <p className="text-xs text-slate-400">{new Date(s.submitted_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {s.file_url ? (
                    <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue-strong font-medium hover:underline">📎 {s.file_name || "View file"}</a>
                  ) : (
                    <span className="text-xs text-slate-400">Text answer</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}