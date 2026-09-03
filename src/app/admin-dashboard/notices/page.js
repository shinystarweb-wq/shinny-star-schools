"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const BRANCHES = ["School", "College", "Tutorial"];
const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

const URGENCY_STYLES = {
  normal: { label: "Normal", badge: "bg-slate-100 text-slate-600", border: "border-slate-200", accent: "bg-slate-400" },
  important: { label: "Important", badge: "bg-amber-100 text-amber-700", border: "border-amber-200", accent: "bg-amber-500" },
  urgent: { label: "Urgent", badge: "bg-red-100 text-red-700", border: "border-red-300", accent: "bg-red-500" },
};

const AUDIENCE_LABELS = { all: "Everyone", teachers: "Teachers Only", students: "Students Only" };

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState("");
  const [printNotice, setPrintNotice] = useState(null);

  async function loadNotices() {
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data, error } = await supabase
      .from("notices")
      .select("*")
      .eq("location", location)
      .order("created_at", { ascending: false });
    if (error) console.error("Notices load error:", error);
    setNotices(data || []);
    setLoading(false);
  }

  useEffect(() => { loadNotices(); }, []);

  async function handleDelete(id) {
    if (!confirm("Delete this notice?")) return;
    await supabase.from("notices").delete().eq("id", id);
    loadNotices();
  }

  const filtered = audienceFilter ? notices.filter((n) => n.audience === audienceFilter) : notices;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notices</h1>
          <p className="text-sm text-slate-500 mt-1">Post announcements for teachers, students, or everyone.</p>
        </div>
        <button onClick={() => setShowForm((p) => !p)} className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm">{showForm ? "Close" : "+ New Notice"}</button>
      </div>

      {showForm && <NoticeForm onAdded={() => { loadNotices(); setShowForm(false); }} />}

      <div className="flex gap-2 mb-6 mt-6 bg-slate-100 p-1.5 rounded-xl w-fit">
        <button onClick={() => setAudienceFilter("")} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (audienceFilter === "" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>All</button>
        <button onClick={() => setAudienceFilter("all")} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (audienceFilter === "all" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>Everyone</button>
        <button onClick={() => setAudienceFilter("teachers")} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (audienceFilter === "teachers" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>Teachers</button>
        <button onClick={() => setAudienceFilter("students")} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (audienceFilter === "students" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>Students</button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading notices...</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No notices yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((n) => {
            const u = URGENCY_STYLES[n.urgency];
            return (
              <div key={n.id} className={"border rounded-2xl overflow-hidden flex " + u.border}>
                <div className={"w-1.5 " + u.accent}></div>
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800">{n.title}</h3>
                        <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + u.badge}>{u.label}</span>
                      </div>
                      <p className="text-xs text-slate-400">{AUDIENCE_LABELS[n.audience]}{n.branch ? " • " + n.branch : ""} • {new Date(n.created_at).toLocaleDateString()}{n.expires_at ? " • Expires " + n.expires_at : ""}</p>
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                      <button onClick={() => setPrintNotice(n)} className="text-xs text-brand-blue-strong font-medium hover:underline">Print</button>
                      <button onClick={() => handleDelete(n.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{n.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {printNotice && <PrintModal notice={printNotice} onClose={() => setPrintNotice(null)} />}
    </div>
  );
}

function NoticeForm({ onAdded }) {
  const [form, setForm] = useState({ title: "", message: "", audience: "all", urgency: "normal", branch: "", expires_at: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.title || !form.message) {
      setError("Title and message are required.");
      return;
    }
    setSaving(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { error: insertError } = await supabase.from("notices").insert([{
      title: form.title, message: form.message, audience: form.audience, urgency: form.urgency,
      branch: form.branch || null, expires_at: form.expires_at || null, location,
    }]);
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-slate-200 rounded-2xl p-6 mt-6 flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
        <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Resumption Date for Second Term" className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
        <textarea value={form.message} onChange={(e) => update("message", e.target.value)} rows={4} placeholder="Write the full notice here..." className={inputClass}></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Audience</label>
          <select value={form.audience} onChange={(e) => update("audience", e.target.value)} className={inputClass}>
            <option value="all">Everyone</option>
            <option value="teachers">Teachers Only</option>
            <option value="students">Students Only</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
          <select value={form.urgency} onChange={(e) => update("urgency", e.target.value)} className={inputClass}>
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Branch (optional)</label>
          <select value={form.branch} onChange={(e) => update("branch", e.target.value)} className={inputClass}>
            <option value="">All Branches</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Expires (optional)</label>
          <input type="date" value={form.expires_at} onChange={(e) => update("expires_at", e.target.value)} className={inputClass} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={saving} className="self-start bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Posting..." : "Post Notice"}</button>
    </form>
  );
}

function PrintModal({ notice, onClose }) {
  const u = URGENCY_STYLES[notice.urgency];
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 px-6 print:hidden">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        <div id="notice-print-area" className="p-8">
          <div className="text-center border-b-2 border-brand-blue-strong pb-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-brand-blue flex items-center justify-center text-2xl mx-auto mb-2">🏫</div>
            <h1 className="text-xl font-bold text-slate-800 tracking-wide">SHINNY STAR SCHOOLS</h1>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{notice.branch ? notice.branch + " Section — " : ""}Official Notice</p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">{notice.title}</h2>
            <span className={"text-xs font-semibold px-3 py-1 rounded-full " + u.badge}>{u.label}</span>
          </div>

          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-6">{notice.message}</p>

          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-200 pt-3">
            <span>To: {AUDIENCE_LABELS[notice.audience]}</span>
            <span>Date: {new Date(notice.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-slate-100 print:hidden">
          <button onClick={() => window.print()} className="flex-1 bg-brand-blue-strong text-white py-2.5 rounded-lg font-medium hover:opacity-90">🖨 Print</button>
          <button onClick={onClose} className="flex-1 border border-slate-300 py-2.5 rounded-lg font-medium hover:bg-slate-50">Close</button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #notice-print-area, #notice-print-area * { visibility: visible; }
          #notice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}