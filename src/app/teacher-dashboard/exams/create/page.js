"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function TeacherCreateExam() {
  const router = useRouter();
  const [branch, setBranch] = useState("");
  const [classOptions, setClassOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", class: "", subject: "", duration_minutes: 60, exam_date: "", start_time: "" });

  useEffect(() => {
    async function init() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setBranch(user.branch);
      const { data } = await supabase.from("classes").select("name").eq("branch", user.branch).eq("location", user.location).order("name");
      setClassOptions((data || []).map((c) => c.name));
    }
    init();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.class) {
      setError("Exam name and class are required.");
      return;
    }
    setSaving(true);
    const startTimestamp = form.exam_date && form.start_time ? new Date(form.exam_date + "T" + form.start_time).toISOString() : null;

    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data, error: insertError } = await supabase.from("exams").insert([{
      name: form.name, branch, class: form.class, subject: form.subject, location,
      duration_minutes: form.duration_minutes, exam_date: form.exam_date || null,
      start_time: startTimestamp, status: "draft",
    }]).select().single();

    setSaving(false);
    if (insertError) {
      setError("Could not create exam: " + insertError.message);
      return;
    }
    router.push("/teacher-dashboard/exams/manage/" + data.id);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Create Exam</h1>
      <p className="text-sm text-slate-500 mb-8">{branch} Section — set up the exam details, then add questions.</p>

      <form onSubmit={handleSubmit} className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-5">
        <Field label="Exam Name">
          <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. First Term Mathematics Exam" className={inputClass} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Class">
            <select value={form.class} onChange={(e) => updateField("class", e.target.value)} className={inputClass}>
              <option value="">Select class</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Subject">
            <input type="text" value={form.subject} onChange={(e) => updateField("subject", e.target.value)} placeholder="e.g. Mathematics" className={inputClass} />
          </Field>
          <Field label="Duration (minutes)">
            <input type="number" min="5" value={form.duration_minutes} onChange={(e) => updateField("duration_minutes", parseInt(e.target.value) || 0)} className={inputClass} />
          </Field>
          <Field label="Exam Date">
            <input type="date" value={form.exam_date} onChange={(e) => updateField("exam_date", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Start Time">
            <input type="time" value={form.start_time} onChange={(e) => updateField("start_time", e.target.value)} className={inputClass} />
          </Field>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-brand-blue-strong text-white px-8 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Creating..." : "Continue to Questions"}</button>
          <button type="button" onClick={() => router.push("/teacher-dashboard/exams")} className="border border-slate-300 text-slate-700 px-8 py-2.5 rounded-lg font-medium hover:bg-slate-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}