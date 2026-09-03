"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const SESSION = "2025/2026";
const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function ClassLessonNotesPage() {
  const params = useParams();
  const branch = params.branch.charAt(0).toUpperCase() + params.branch.slice(1);
  const className = decodeURIComponent(params.className);

  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function loadData() {
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const [notesRes, subjectsRes] = await Promise.all([
      supabase.from("lesson_notes").select("*, teachers(full_name)").eq("branch", branch).eq("class", className).eq("status", "published").eq("location", location).in("visibility", ["admin", "admin_and_students"]).order("created_at", { ascending: false }),
      supabase.from("subjects").select("name").eq("branch", branch).eq("location", location).order("name"),
    ]);
    setNotes(notesRes.data || []);
    setSubjects((subjectsRes.data || []).map((s) => s.name));
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [branch, className]);

  const filtered = notes.filter((n) => (!subjectFilter || n.subject === subjectFilter) && (!termFilter || n.term === termFilter));

  const grouped = {};
  filtered.forEach((n) => {
    if (!grouped[n.subject]) grouped[n.subject] = [];
    grouped[n.subject].push(n);
  });

  async function handleDelete(id) {
    if (!confirm("Delete this lesson note?")) return;
    await supabase.from("lesson_notes").delete().eq("id", id);
    loadData();
  }

  return (
    <div>
      <Link href={"/admin-dashboard/lesson-notes/" + branch.toLowerCase()} className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← {branch}</Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{className} — Lesson Notes</h1>
          <p className="text-sm text-slate-500 mt-1">{notes.length} notes recorded</p>
        </div>
        <button onClick={() => setShowForm((prev) => !prev)} className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm">{showForm ? "Close" : "+ Add Note"}</button>
      </div>

      {showForm && <AddNoteForm branch={branch} className={className} subjects={subjects} onAdded={() => { loadData(); setShowForm(false); }} />}

      <div className="flex flex-wrap gap-3 mb-5 mt-6">
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={inputClass + " max-w-[200px]"}>
          <option value="">All Subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={termFilter} onChange={(e) => setTermFilter(e.target.value)} className={inputClass + " max-w-[160px]"}>
          <option value="">All Terms</option>
          {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading notes...</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No lesson notes found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.keys(grouped).sort().map((subject) => (
            <div key={subject}>
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">{subject}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {grouped[subject].map((note) => (
                  <div key={note.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{note.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{note.term}{note.week_number ? " • Week " + note.week_number : ""}</p>
                      </div>
                      <button onClick={() => handleDelete(note.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </div>
                    {note.teachers?.full_name && <p className="text-xs text-slate-500 mt-1">By {note.teachers.full_name}</p>}
                    {note.content && <p className="text-xs text-slate-600 mt-2 line-clamp-3">{note.content}</p>}
                    {note.file_url && (
                      <a href={note.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue-strong font-medium mt-2 inline-flex items-center gap-1 hover:underline">📎 {note.file_name || "View attached file"}</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddNoteForm({ branch, className, subjects, onAdded }) {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ subject: "", title: "", content: "", term: "1st Term", week_number: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }
    setError("");
    setFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.subject || !form.title) {
      setError("Subject and title are required.");
      return;
    }
    setSaving(true);

    let file_url = null;
    let file_name = null;

    if (file) {
      const ext = file.name.split(".").pop();
      const path = Date.now() + "." + ext;
      const { error: uploadError } = await supabase.storage.from("lesson-files").upload(path, file);
      if (uploadError) {
        setError("File upload failed: " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("lesson-files").getPublicUrl(path);
      file_url = urlData.publicUrl;
      file_name = file.name;
    }

    const { error: insertError } = await supabase.from("lesson_notes").insert([{
      branch, class: className, subject: form.subject, title: form.title, content: form.content,
      term: form.term, week_number: form.week_number ? parseInt(form.week_number) : null,
      session: SESSION, file_url, file_name,
    }]);

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-slate-200 rounded-2xl p-6 mb-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
          <select value={form.subject} onChange={(e) => update("subject", e.target.value)} className={inputClass}>
            <option value="">Select subject</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Term</label>
          <select value={form.term} onChange={(e) => update("term", e.target.value)} className={inputClass}>
            {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Week Number (optional)</label>
          <input type="number" min="1" value={form.week_number} onChange={(e) => update("week_number", e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
        <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Introduction to Fractions" className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Note Content (optional)</label>
        <textarea value={form.content} onChange={(e) => update("content", e.target.value)} rows={4} placeholder="Write the lesson note here, or leave blank if attaching a file..." className={inputClass}></textarea>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Attach File (optional)</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => fileInputRef.current.click()} className="text-sm border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium">Choose File</button>
          {file && <span className="text-xs text-slate-500">{file.name}</span>}
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" onChange={handleFileChange} className="hidden" />
        </div>
        <p className="text-xs text-slate-400 mt-1">PDF, Word, PowerPoint, or text files. Max 10MB.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={saving} className="self-start bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Saving..." : "Save Note"}</button>
    </form>
  );
}