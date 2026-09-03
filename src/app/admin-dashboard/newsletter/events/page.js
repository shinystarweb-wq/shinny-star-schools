"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", event_date: "", event_time: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadEvents() {
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data } = await supabase.from("newsletter_events").select("*").eq("location", location).order("event_date");
    setEvents(data || []);
    setLoading(false);
  }

  useEffect(() => { loadEvents(); }, []);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startNew() {
    setEditingId(null);
    setForm({ title: "", description: "", event_date: "", event_time: "", location: "" });
    setShowForm(true);
  }

  function startEdit(e) {
    setEditingId(e.id);
    setForm({ title: e.title, description: e.description || "", event_date: e.event_date, event_time: e.event_time || "", location: e.location || "" });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.title || !form.event_date) {
      setError("Title and date are required.");
      return;
    }
    setSaving(true);

    let dbError;
    if (editingId) {
      const { error: updateError } = await supabase.from("newsletter_events").update(form).eq("id", editingId);
      dbError = updateError;
    } else {
      setSaving(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { error: insertError } = await supabase.from("newsletter_events").insert([{ ...form, location }]);
      dbError = insertError;
    }

    setSaving(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setShowForm(false);
    setEditingId(null);
    loadEvents();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this event?")) return;
    await supabase.from("newsletter_events").delete().eq("id", id);
    loadEvents();
  }

  const upcoming = events.filter((e) => e.event_date >= new Date().toISOString().split("T")[0]);
  const past = events.filter((e) => e.event_date < new Date().toISOString().split("T")[0]);

  return (
    <div>
      <Link href="/admin-dashboard/newsletter" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← Newsletter</Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Events</h1>
          <p className="text-sm text-slate-500 mt-1">{events.length} events recorded</p>
        </div>
        <button onClick={() => (showForm ? setShowForm(false) : startNew())} className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm">{showForm ? "Close" : "+ Add Event"}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-slate-200 rounded-2xl p-6 mb-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{editingId ? "Edit Event" : "New Event"}</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
            <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Inter-House Sports" className={inputClass} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={form.event_date} onChange={(e) => update("event_date", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time (optional)</label>
              <input type="time" value={form.event_time} onChange={(e) => update("event_time", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location (optional)</label>
              <input type="text" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Main Field" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} className={inputClass}></textarea>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Saving..." : editingId ? "Save Changes" : "Add Event"}</button>
            {editingId && <button type="button" onClick={() => setShowForm(false)} className="border border-slate-300 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-50">Cancel</button>}
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No events added yet.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">Upcoming</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {upcoming.map((e) => (
                  <div key={e.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-brand-blue-strong text-white text-center py-3">
                      <p className="text-2xl font-bold">{new Date(e.event_date + "T00:00:00").getDate()}</p>
                      <p className="text-xs uppercase tracking-wide">{new Date(e.event_date + "T00:00:00").toLocaleString("default", { month: "short" })}</p>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-slate-800 text-sm">{e.title}</h3>
                        <div className="flex gap-2 flex-shrink-0 ml-2">
                          <button onClick={() => startEdit(e)} className="text-xs text-brand-blue-strong font-medium hover:underline">Edit</button>
                          <button onClick={() => handleDelete(e.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        </div>
                      </div>
                      {e.event_time && <p className="text-xs text-slate-500 mt-1">⏰ {e.event_time}</p>}
                      {e.location && <p className="text-xs text-slate-500">📍 {e.location}</p>}
                      {e.description && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{e.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">Past</h2>
              <div className="flex flex-col gap-2">
                {past.map((e) => (
                  <div key={e.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-2.5 opacity-60">
                    <p className="text-sm text-slate-600">{e.title} — {e.event_date}</p>
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(e)} className="text-xs text-brand-blue-strong font-medium hover:underline">Edit</button>
                      <button onClick={() => handleDelete(e.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}