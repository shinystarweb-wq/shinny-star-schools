"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function StudentLessonNotesPage() {
  const [student, setStudent] = useState(null);
  const [notes, setNotes] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setStudent(user);

      const { data } = await supabase.from("lesson_notes").select("*, teachers(full_name)")
        .eq("branch", user.branch).eq("class", user.class).eq("location", user.location)
        .eq("status", "published").in("visibility", ["students", "admin_and_students"])
        .order("created_at", { ascending: false });

      setNotes(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const subjects = [...new Set(notes.map((n) => n.subject))].sort();
  const filtered = subjectFilter ? notes.filter((n) => n.subject === subjectFilter) : notes;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Lesson Notes</h1>
      <p className="text-sm text-slate-500 mb-6">{student?.class} • {student?.branch} Section</p>

      {subjects.length > 0 && (
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-brand-blue-strong">
          <option value="">All Subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading notes...</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No lesson notes shared with your class yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((note) => (
            <div key={note.id} className="border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-800">{note.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{note.subject} • {note.term}{note.week_number ? " • Week " + note.week_number : ""}</p>
              {note.teachers?.full_name && <p className="text-xs text-slate-500 mt-1">By {note.teachers.full_name}</p>}
              {note.content && <p className="text-xs text-slate-600 mt-2 line-clamp-3">{note.content}</p>}
              {note.file_url && (
                <a href={note.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue-strong font-medium mt-2 inline-flex items-center gap-1 hover:underline">📎 {note.file_name || "View attached file"}</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}