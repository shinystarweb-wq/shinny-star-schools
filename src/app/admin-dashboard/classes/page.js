"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BRANCHES = [
  { key: "School", icon: "🏫", color: "bg-blue-50 text-blue-700", ring: "ring-blue-100" },
  { key: "College", icon: "🎓", color: "bg-purple-50 text-purple-700", ring: "ring-purple-100" },
  { key: "Tutorial", icon: "📘", color: "bg-amber-50 text-amber-700", ring: "ring-amber-100" },
];

export default function ClassesPage() {
  const [view, setView] = useState("branches");
  const [branchStats, setBranchStats] = useState({});
  const [loadingBranches, setLoadingBranches] = useState(true);

  const [branch, setBranch] = useState("");
  const [classList, setClassList] = useState([]);
  const [classCounts, setClassCounts] = useState({});
  const [loading, setLoading] = useState(false);

  const [newClassName, setNewClassName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [activeClass, setActiveClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [branchTeachers, setBranchTeachers] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    async function loadBranchStats() {
      setLoadingBranches(true);
      const stored = sessionStorage.getItem("shinnystar_user");
      const location = stored ? JSON.parse(stored).location : null;
      const stats = {};
      for (const b of BRANCHES) {
        const [classesRes, studentsRes] = await Promise.all([
          supabase.from("classes").select("id", { count: "exact", head: true }).eq("branch", b.key).eq("location", location),
          supabase.from("students").select("id", { count: "exact", head: true }).eq("branch", b.key).eq("location", location),
        ]);
        stats[b.key] = { classes: classesRes.count || 0, students: studentsRes.count || 0 };
      }
      setBranchStats(stats);
      setLoadingBranches(false);
    }
    loadBranchStats();
  }, []);

  async function openBranch(b) {
    setBranch(b);
    setView("classes");
    await loadClasses(b);
  }

  async function loadClasses(b) {
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data: classesData } = await supabase.from("classes").select("*").eq("branch", b).eq("location", location).order("name");
    const { data: studentsData } = await supabase.from("students").select("class").eq("branch", b).eq("location", location);

    const counts = {};
    (studentsData || []).forEach((s) => {
      counts[s.class] = (counts[s.class] || 0) + 1;
    });

    setClassList(classesData || []);
    setClassCounts(counts);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!newClassName.trim()) {
      setError("Class name is required.");
      return;
    }
    setSaving(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { error: insertError } = await supabase.from("classes").insert([{ name: newClassName.trim(), branch, location }]);
    setSaving(false);
    if (insertError) {
      setError(insertError.code === "23505" ? "This class already exists." : insertError.message);
      return;
    }
    setNewClassName("");
    loadClasses(branch);
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this class?")) return;
    await supabase.from("classes").delete().eq("id", id);
    loadClasses(branch);
  }

  async function openClass(c) {
    setActiveClass(c);
    setView("detail");
    setLoadingDetail(true);

    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const [studentsRes, teachersRes] = await Promise.all([
      supabase.from("students").select("id, full_name, photo_url, gender").eq("branch", branch).eq("class", c.name).eq("location", location).order("full_name"),
      supabase.from("teachers").select("id, full_name").eq("branch", branch).eq("location", location).order("full_name"),
    ]);

    setClassStudents(studentsRes.data || []);
    setBranchTeachers(teachersRes.data || []);
    setLoadingDetail(false);
  }

  async function assignTeacher(teacherId) {
    setAssigning(true);
    const { error } = await supabase.from("classes").update({ class_teacher_id: teacherId || null }).eq("id", activeClass.id);
    setAssigning(false);
    if (!error) {
      setActiveClass((prev) => ({ ...prev, class_teacher_id: teacherId || null }));
      setClassList((prev) => prev.map((c) => (c.id === activeClass.id ? { ...c, class_teacher_id: teacherId || null } : c)));
    }
  }

  const assignedTeacher = branchTeachers.find((t) => t.id === activeClass?.class_teacher_id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Classes</h1>
      <p className="text-sm text-slate-500 mb-8">
        {view === "branches" && "Select a section to manage its classes."}
        {view === "classes" && "Manage classes for this section."}
        {view === "detail" && "Class details, teacher assignment, and student roster."}
      </p>

      {view !== "branches" && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button onClick={() => setView("branches")} className="hover:text-brand-blue-strong hover:underline">Sections</button>
          <span>/</span>
          {view === "detail" ? (
            <button onClick={() => setView("classes")} className="hover:text-brand-blue-strong hover:underline">{branch}</button>
          ) : (
            <span className="text-slate-800 font-medium">{branch}</span>
          )}
          {view === "detail" && <span>/</span>}
          {view === "detail" && <span className="text-slate-800 font-medium">{activeClass.name}</span>}
        </div>
      )}

      {view === "branches" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BRANCHES.map((b) => (
            <button key={b.key} onClick={() => openBranch(b.key)} className="group border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left bg-white">
              <div className={"w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-5 ring-4 " + b.color + " " + b.ring}>{b.icon}</div>
              <h2 className="text-lg font-bold text-slate-800 mb-3">{b.key}</h2>
              {loadingBranches ? (
                <p className="text-sm text-slate-400">Loading...</p>
              ) : (
                <div className="flex items-center gap-5">
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{branchStats[b.key]?.classes || 0}</p>
                    <p className="text-xs text-slate-500">classes</p>
                  </div>
                  <div className="w-px h-9 bg-slate-200"></div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{branchStats[b.key]?.students || 0}</p>
                    <p className="text-xs text-slate-500">students</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-brand-blue-strong font-medium mt-5 group-hover:translate-x-1 transition-transform">Manage classes →</p>
            </button>
          ))}
        </div>
      )}

      {view === "classes" && (
        <div>
          <div className="border border-slate-200 rounded-2xl p-6 mb-8 max-w-xl bg-brand-blue/30">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Add Class to {branch}</h2>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="e.g. JSS 1" className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
              <button type="submit" disabled={saving} className="bg-brand-blue-strong text-white px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60 shadow-sm">{saving ? "Adding..." : "Add"}</button>
            </form>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>

          {loading ? (
            <p className="text-slate-500 text-sm">Loading classes...</p>
          ) : classList.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
              <p className="text-slate-500 text-sm">No classes created for {branch} yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {classList.map((c) => (
                <div key={c.id} onClick={() => openClass(c)} className="group relative border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer bg-white overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-brand-blue opacity-60 group-hover:scale-110 transition-transform"></div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-slate-800">{c.name}</h3>
                      <button onClick={(e) => handleDelete(c.id, e)} className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
                    </div>
                    <p className="text-3xl font-bold text-brand-blue-strong mt-3">{classCounts[c.name] || 0}</p>
                    <p className="text-xs text-slate-500">student{(classCounts[c.name] || 0) === 1 ? "" : "s"} enrolled</p>
                    <p className="text-xs text-brand-blue-strong font-medium mt-4 group-hover:translate-x-1 transition-transform inline-block">View details →</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "detail" && (
        <div>
          <div className="border border-slate-200 rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Class Teacher</h2>
            {loadingDetail ? (
              <p className="text-slate-500 text-sm">Loading...</p>
            ) : (
              <div className="flex items-center gap-4">
                <select value={activeClass.class_teacher_id || ""} onChange={(e) => assignTeacher(e.target.value)} disabled={assigning} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong min-w-[240px]">
                  <option value="">No teacher assigned</option>
                  {branchTeachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                {assignedTeacher && <span className="text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full font-medium">Assigned: {assignedTeacher.full_name}</span>}
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Students ({classStudents.length})</h2>
              <Link href="/admin-dashboard/students/add" className="text-sm text-brand-blue-strong font-medium hover:underline">+ Add Student</Link>
            </div>
            {loadingDetail ? (
              <p className="text-slate-500 text-sm">Loading students...</p>
            ) : classStudents.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center">
                <p className="text-slate-500 text-sm">No students in this class yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {classStudents.map((s) => (
                  <Link key={s.id} href={"/admin-dashboard/students/view/" + s.id} className="flex items-center gap-3 border border-slate-200 rounded-lg px-4 py-2.5 hover:bg-slate-50 transition">
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.full_name} className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-blue" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-xs font-semibold text-brand-blue-strong">{s.full_name.charAt(0)}</div>
                    )}
                    <span className="text-sm font-medium text-slate-800">{s.full_name}</span>
                    <span className="text-xs text-slate-400 ml-auto">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}