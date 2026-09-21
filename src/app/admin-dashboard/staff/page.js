"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", role: "", year_employed: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function loadStaff() {
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data } = await supabase.from("non_teaching_staff").select("*").eq("location", location).eq("status", "active").order("full_name");
    setStaff(data || []);
    setLoading(false);
  }

  useEffect(() => { loadStaff(); }, []);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.full_name || !form.role) {
      setError("Name and role are required.");
      return;
    }
    setSaving(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    const { error: insertError } = await supabase.from("non_teaching_staff").insert([{
      full_name: form.full_name, role: form.role,
      year_employed: form.year_employed ? parseInt(form.year_employed) : null,
      location, pin,
    }]);

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm({ full_name: "", role: "", year_employed: "" });
    setShowForm(false);
    loadStaff();
  }

  async function handleArchive(id) {
    if (!confirm("Archive this staff member?")) return;
    await supabase.from("non_teaching_staff").update({ status: "archived" }).eq("id", id);
    loadStaff();
  }

  async function handleDelete(id) {
    if (!confirm("Permanently delete this staff member?")) return;
    await supabase.from("non_teaching_staff").delete().eq("id", id);
    loadStaff();
  }

  const filtered = staff.filter((s) => !search.trim() || s.full_name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Non-Teaching Staff</h1>
          <p className="text-sm text-slate-500 mt-1">{staff.length} staff members</p>
        </div>
        <button onClick={() => setShowForm((p) => !p)} className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm">{showForm ? "Close" : "+ Add Staff"}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-slate-200 rounded-2xl p-6 mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <input type="text" value={form.role} onChange={(e) => update("role", e.target.value)} placeholder="e.g. Security, Cleaner, Cook, Driver" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year Employed</label>
              <input type="number" value={form.year_employed} onChange={(e) => update("year_employed", e.target.value)} placeholder="e.g. 2024" className={inputClass} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="self-start bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Adding..." : "Add Staff"}</button>
        </form>
      )}

      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className={inputClass + " max-w-sm mt-6 mb-5"} />

      {loading ? (
        <p className="text-slate-500 text-sm">Loading staff...</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No staff added yet.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-blue text-slate-700">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Role</th>
                <th className="text-left px-5 py-3 font-semibold">Year Employed</th>
                <th className="text-left px-5 py-3 font-semibold">PIN</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-slate-200">
                  <td className="px-5 py-3 font-medium text-slate-800">{s.full_name}</td>
                  <td className="px-5 py-3 text-slate-600">{s.role}</td>
                  <td className="px-5 py-3 text-slate-600">{s.year_employed || "-"}</td>
                  <td className="px-5 py-3 text-slate-600 font-mono tracking-widest">{s.pin}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => handleArchive(s.id)} className="text-xs text-slate-500 hover:text-slate-700">Archive</button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}