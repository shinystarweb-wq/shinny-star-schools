"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const BRANCHES = ["School", "College", "Tutorial"];

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("School");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadClasses() {
    setLoading(true);
    const { data, error } = await supabase.from("classes").select("*").order("branch").order("name");
    if (!error) setClasses(data);
    setLoading(false);
  }

  useEffect(() => {
    loadClasses();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Class name is required.");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("classes").insert([{ name: name.trim(), branch }]);
    setSaving(false);
    if (insertError) {
      setError(insertError.code === "23505" ? "This class already exists for this branch." : insertError.message);
      return;
    }
    setName("");
    loadClasses();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this class?")) return;
    await supabase.from("classes").delete().eq("id", id);
    loadClasses();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Classes</h1>
      <p className="text-sm text-slate-500 mb-8">Create and manage the class list for each section.</p>

      <div className="border border-slate-200 rounded-2xl p-6 mb-8 max-w-xl">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Add New Class</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. JSS 1" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
              <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent">
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="self-start bg-brand-blue-strong text-white px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Adding..." : "Add Class"}</button>
        </form>
      </div>

      <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">All Classes</h2>
      {loading ? (
        <p className="text-slate-500 text-sm">Loading classes...</p>
      ) : classes.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No classes created yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BRANCHES.map((b) => (
            <div key={b} className="border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">{b}</h3>
              <div className="flex flex-col gap-2">
                {classes.filter((c) => c.branch === b).length === 0 ? (
                  <p className="text-xs text-slate-400">No classes yet.</p>
                ) : (
                  classes.filter((c) => c.branch === b).map((c) => (
                    <div key={c.id} className="flex items-center justify-between bg-brand-blue rounded-lg px-3 py-2">
                      <span className="text-sm text-slate-700 font-medium">{c.name}</span>
                      <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}