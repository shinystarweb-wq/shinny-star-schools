"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const SESSION = "2025/2026";
const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function TeacherCreateAssignment() {
  const router = useRouter();
  const [teacher, setTeacher] = useState(null);
  const [classOptions, setClassOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ class: "", subject: "", title: "", instructions: "", questions: "", due_date: "", term: "1st Term" });

  useEffect(() => {
    async function init() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setTeacher(user);
      const [classRes, subjectRes] = await Promise.all([
        supabase.from("classes").select("name").eq("branch", user.branch).eq("location", user.location).order("name"),
        supabase.from("subjects").select("name").eq("branch", user.branch).eq("location", user.location).order("name"),
      ]);
      setClassOptions((classRes.data || []).map((c) => c.name));
      setSubjectOptions((subjectRes.data || []).map((s) => s.name));
    }
    init();
  }, []);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(publish) {
    setError("");
    if (!form.class || !form.subject || !form.title) {
      setError("Class, subject, and title are required.");
      return;
    }
    setSaving(true);

    const { error: insertError } = await supabase.from("assignments").insert([{
      branch: teacher.branch, location: teacher.location, class: form.class, subject: form.subject, title: form.title,
      instructions: form.instructions, questions: form.questions, due_date: form.due_date || null,
      term: form.term, session: SESSION, teacher_id: teacher.id, status: publish ? "published" : "draft",
    }]);

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/teacher-dashboard/assignments");
  }

  if (!teacher) return <p className="text-slate-500 text-sm">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Create Assignment</h1>
      <p className="text-sm text-slate-500 mb-8">{teacher.branch} Section</p>

      <div className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Class">
            <select value={form.class} onChange={(e) => update("class", e.target.value)} className={inputClass}>
              <option value="">Select class</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Subject">
            <select value={form.subject} onChange={(e) => update("subject", e.target.value)} className={inputClass}>
              <option value="">Select subject</option>
              {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Term">
            <select value={form.term} onChange={(e) => update("term", e.target.value)} className={inputClass}>
              {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Due Date (optional)">
            <input type="date" value={form.due_date} onChange={(e) => update("due_date", e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label="Title">
          <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Week 3 Algebra Assignment" className={inputClass} />
        </Field>

        <Field label="Instructions (optional)">
          <textarea value={form.instructions} onChange={(e) => update("instructions", e.target.value)} rows={2} className={inputClass}></textarea>
        </Field>

        <Field label="Questions">
          <textarea value={form.questions} onChange={(e) => update("questions", e.target.value)} rows={6} placeholder="Write out the assignment questions here..." className={inputClass}></textarea>
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button onClick={() => handleSubmit(false)} disabled={saving} className="border border-slate-300 text-slate-700 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-60">{saving ? "Saving..." : "Save as Draft"}</button>
          <button onClick={() => handleSubmit(true)} disabled={saving} className="bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Publishing..." : "Publish"}</button>
        </div>
      </div>
    </div>
  );
}