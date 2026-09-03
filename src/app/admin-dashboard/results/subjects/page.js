"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BRANCHES = ["School", "College", "Tutorial"];

export default function SubjectsPage() {
  const [branch, setBranch] = useState("School");
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadSubjects() {
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data } = await supabase.from("subjects").select("*").eq("branch", branch).eq("location", location).order("name");
    setSubjects(data || []);
    setLoading(false);
  }

  useEffect(() => { loadSubjects(); }, [branch]);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    setSaving(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { error: insertError } = await supabase.from("subjects").insert([{ name: name.trim(), branch, location }]);
    setSaving(false);
    if (insertError) {
      setError(insertError.code === "23505" ? "This subject already exists for this section." : insertError.message);
      return;
    }
    setName("");
    loadSubjects();
  }

  async function handleDelete(id) {
    if (!confirm("Remove this subject?")) return;
    await supabase.from("subjects").delete().eq("id", id);
    loadSubjects();
  }

  return (
    <div>
      <Link href="/admin-dashboard/results" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← Results</Link>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Manage Subjects</h1>
      <p className="text-sm text-slate-500 mb-6">Define which subjects are offered in each section.</p>

      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl w-fit">
        {BRANCHES.map((b) => (
          <button key={b} onClick={() => setBranch(b)} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (branch === b ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>{b}</button>
        ))}
      </div>

      <div className="border border-slate-200 rounded-2xl p-6 mb-6 max-w-md">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Add Subject to {branch}</h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
          <button type="submit" disabled={saving} className="bg-brand-blue-strong text-white px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Adding..." : "Add"}</button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading subjects...</p>
      ) : subjects.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center">
          <p className="text-slate-500 text-sm">No subjects added for {branch} yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {subjects.map((s) => (
            <div key={s.id} className="border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800">{s.name}</span>
              <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}