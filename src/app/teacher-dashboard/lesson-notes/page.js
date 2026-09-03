"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const SESSION = "2025/2026";
const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function TeacherLessonNotesPage() {
  const [teacher, setTeacher] = useState(null);
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function loadData(user) {
    setLoading(true);
    const [notesRes, subjectsRes, classesRes] = await Promise.all([
      supabase.from("lesson_notes").select("*").eq("branch", user.branch).eq("teacher_id", user.id).eq("location", user.location).order("created_at", { ascending: false }),
      supabase.from("subjects").select("name").eq("branch", user.branch).eq("location", user.location).order("name"),
      supabase.from("classes").select("name").eq("branch", user.branch).eq("location", user.location).order("name"),
    ]);
    setNotes(notesRes.data || []);
    setSubjects((subjectsRes.data || []).map((s) => s.name));
    setClassOptions((classesRes.data || []).map((c) => c.name));
    setLoading(false);
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("shinnystar_user");
    if (!stored) return;
    const user = JSON.parse(stored);
    setTeacher(user);
    loadData(user);
  }, []);

  const filtered = notes.filter((n) => (!subjectFilter || n.subject === subjectFilter) && (!classFilter || n.class === classFilter));

  const grouped = {};
  filtered.forEach((n) => {
    if (!grouped[n.class]) grouped[n.class] = [];
    grouped[n.class].push(n);
  });

  async function handleDelete(id) {
    if (!confirm("Delete this lesson note?")) return;
    await supabase.from("lesson_notes").delete().eq("id", id);
    loadData(teacher);
  }

  async function togglePublish(note, visibility) {
    if (note.status === "published") {
      await supabase.from("lesson_notes").update({ status: "draft", visibility: null }).eq("id", note.id);
    } else {
      await supabase.from("lesson_notes").update({ status: "published", visibility }).eq("id", note.id);
    }
    loadData(teacher);
  }

  if (!teacher) return <p className="text-slate-500 text-sm">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lesson Notes</h1>
          <p className="text-sm text-slate-500 mt-1">{teacher.branch} Section — {notes.length} notes written by you</p>
        </div>
        <button onClick={() => setShowForm((prev) => !prev)} className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm">{showForm ? "Close" : "+ Add Note"}</button>
      </div>

      {showForm && <AddNoteForm teacher={teacher} subjects={subjects} classOptions={classOptions} onAdded={() => { loadData(teacher); setShowForm(false); }} />}

      <div className="flex flex-wrap gap-3 mb-5 mt-6">
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={inputClass + " max-w-[200px]"}>
          <option value="">All Classes</option>
          {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={inputClass + " max-w-[200px]"}>
          <option value="">All Subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
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
          {Object.keys(grouped).sort().map((cls) => (
            <div key={cls}>
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">{cls}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {grouped[cls].map((note) => (
                  <div key={note.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{note.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{note.subject} • {note.term}{note.week_number ? " • Week " + note.week_number : ""}</p>
                      </div>
                      <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 " + (note.status === "published" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>{note.status === "published" ? "Published" : "Draft"}</span>
                    </div>
                    {note.content && <p className="text-xs text-slate-600 mt-2 line-clamp-3">{note.content}</p>}
                    {note.file_url && (
                      <a href={note.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue-strong font-medium mt-2 inline-flex items-center gap-1 hover:underline">📎 {note.file_name || "View attached file"}</a>
                    )}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {note.status === "published" ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Pushed to: {note.visibility === "admin" ? "Admin only" : note.visibility === "students" ? "Students only" : "Admin & Students"}</span>
                          <div className="flex gap-3">
                            <button onClick={() => togglePublish(note)} className="text-xs text-slate-500 hover:text-slate-700">Unpublish</button>
                            <button onClick={() => handleDelete(note.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex gap-2">
                            <button onClick={() => togglePublish(note, "admin")} className="text-xs border border-slate-300 px-2.5 py-1 rounded-lg hover:bg-slate-50 font-medium">Push to Admin</button>
                            <button onClick={() => togglePublish(note, "admin_and_students")} className="text-xs border border-slate-300 px-2.5 py-1 rounded-lg hover:bg-slate-50 font-medium">Push to Admin & Students</button>
                            <button onClick={() => togglePublish(note, "students")} className="text-xs border border-slate-300 px-2.5 py-1 rounded-lg hover:bg-slate-50 font-medium">Push to Students</button>
                          </div>
                          <button onClick={() => handleDelete(note.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        </div>
                      )}
                    </div>
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

function AddNoteForm({ teacher, subjects, classOptions, onAdded }) {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ class: "", subject: "", title: "", content: "", term: "1st Term", week_number: "" });
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
    if (!form.class || !form.subject || !form.title) {
      setError("Class, subject, and title are required.");
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
      branch: teacher.branch, class: form.class, subject: form.subject, title: form.title, content: form.content,
      term: form.term, week_number: form.week_number ? parseInt(form.week_number) : null,
      session: SESSION, file_url, file_name, teacher_id: teacher.id, status: "draft", location: teacher.location,
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
          <select value={form.class} onChange={(e) => update("class", e.target.value)} className={inputClass}>
            <option value="">Select class</option>
            {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Introduction to Fractions" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Week Number (optional)</label>
          <input type="number" min="1" value={form.week_number} onChange={(e) => update("week_number", e.target.value)} className={inputClass} />
        </div>
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