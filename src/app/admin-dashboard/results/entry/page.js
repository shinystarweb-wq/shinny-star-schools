"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BRANCHES = [
  { key: "School", icon: "🏫", color: "bg-blue-50 text-blue-700" },
  { key: "College", icon: "🎓", color: "bg-purple-50 text-purple-700" },
  { key: "Tutorial", icon: "📘", color: "bg-amber-50 text-amber-700" },
];
const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const SESSION = "2025/2026";

function grade(total) {
  if (total >= 70) return { letter: "A", remark: "Excellent" };
  if (total >= 60) return { letter: "B", remark: "Very Good" };
  if (total >= 50) return { letter: "C", remark: "Good" };
  if (total >= 40) return { letter: "D", remark: "Fair" };
  return { letter: "F", remark: "Needs Improvement" };
}

export default function ScoreEntryPage() {
  const [step, setStep] = useState("branch");
  const [branch, setBranch] = useState("");
  const [term, setTerm] = useState("");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");

  const [classOptions, setClassOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [priorTotals, setPriorTotals] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");

  function pickBranch(b) {
    setBranch(b);
    setStep("term");
  }

  function pickTerm(t) {
    setTerm(t);
    setStep("class");
  }

  async function pickClassStep() {
    setLoadingOptions(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data } = await supabase.from("classes").select("name").eq("branch", branch).eq("location", location).order("name");
    setClassOptions((data || []).map((c) => c.name));
    setLoadingOptions(false);
  }

  useEffect(() => { if (step === "class") pickClassStep(); }, [step]);

  function pickClass(c) {
    setClassName(c);
    setStep("subject");
  }

  async function pickSubjectStep() {
    setLoadingOptions(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data } = await supabase.from("subjects").select("name").eq("branch", branch).eq("location", location).order("name");
    setSubjectOptions((data || []).map((s) => s.name));
    setLoadingOptions(false);
  }

  useEffect(() => { if (step === "subject") pickSubjectStep(); }, [step]);

  async function pickSubject(subj) {
    setSubject(subj);
    setStep("scores");
    await loadStudents(subj);
  }

  const priorTerms = TERMS.slice(0, TERMS.indexOf(term));

  async function loadStudents(subj) {
    setLoading(true);
    setMessage("");

    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data: studentData } = await supabase.from("students").select("id, full_name, photo_url").eq("branch", branch).eq("class", className).eq("location", location).order("full_name");
    const studentIds = (studentData || []).map((s) => s.id);

    const { data: existing } = await supabase.from("results").select("*")
      .eq("branch", branch).eq("class", className).eq("subject", subj).eq("term", term).eq("session", SESSION)
      .in("student_id", studentIds);

    const initial = {};
    (studentData || []).forEach((s) => {
      const found = (existing || []).find((e) => e.student_id === s.id);
      initial[s.id] = {
        ca1: found ? found.ca1_score : "",
        ca2: found ? found.ca2_score : "",
        exam: found ? found.exam_score : "",
        status: found ? found.status : "draft",
      };
    });

    const priors = {};
    if (priorTerms.length > 0 && studentIds.length > 0) {
      const { data: priorResults } = await supabase.from("results").select("student_id, term, total_score")
        .eq("branch", branch).eq("class", className).eq("subject", subj).eq("session", SESSION).eq("status", "published")
        .in("student_id", studentIds).in("term", priorTerms);

      studentIds.forEach((id) => {
        priors[id] = {};
        priorTerms.forEach((t) => {
          const r = (priorResults || []).find((x) => x.student_id === id && x.term === t);
          priors[id][t] = r ? Number(r.total_score) : null;
        });
      });
    }

    setStudents(studentData || []);
    setScores(initial);
    setPriorTotals(priors);
    setLoading(false);
  }

  function updateScore(studentId, field, value) {
    const max = field === "exam" ? 60 : 20;
    const num = value === "" ? "" : Math.max(0, Math.min(max, parseFloat(value) || 0));
    setScores((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: num } }));
  }

  async function handleSaveAll(publish) {
    setSaving(true);
    setMessage("");
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;

    const rows = students.map((s) => {
      const sc = scores[s.id] || {};
      const ca1 = sc.ca1 === "" ? 0 : sc.ca1;
      const ca2 = sc.ca2 === "" ? 0 : sc.ca2;
      const exam = sc.exam === "" ? 0 : sc.exam;
      const total = ca1 + ca2 + exam;
      const g = grade(total);
      return {
        student_id: s.id, branch, class: className, subject, term, session: SESSION, location,
        ca1_score: ca1, ca2_score: ca2, exam_score: exam, remark: g.remark,
        status: publish ? "published" : "draft",
      };
    });

    const { error } = await supabase.from("results").upsert(rows, { onConflict: "student_id,subject,term,session" });
    setSaving(false);

    if (error) {
      setMessage("Could not save: " + error.message);
      return;
    }

    setScores((prev) => {
      const updated = { ...prev };
      students.forEach((s) => { updated[s.id] = { ...updated[s.id], status: publish ? "published" : "draft" }; });
      return updated;
    });

    setMessage(publish ? "Published scores for " + students.length + " students. Ready for report cards." : "Saved as draft for " + students.length + " students.");
  }

  function totalFor(s) {
    const sc = scores[s.id] || {};
    const ca1 = sc.ca1 === "" || sc.ca1 === undefined ? 0 : sc.ca1;
    const ca2 = sc.ca2 === "" || sc.ca2 === undefined ? 0 : sc.ca2;
    const exam = sc.exam === "" || sc.exam === undefined ? 0 : sc.exam;
    return ca1 + ca2 + exam;
  }

  function cumulativeFor(s) {
    const priors = priorTerms.map((t) => priorTotals[s.id]?.[t]).filter((v) => v !== null && v !== undefined);
    const all = [...priors, totalFor(s)];
    if (all.length === 0) return null;
    return Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10;
  }

  let visibleStudents = students.filter((s) => !search.trim() || s.full_name.toLowerCase().includes(search.trim().toLowerCase()));
  if (sortBy === "name") visibleStudents = [...visibleStudents].sort((a, b) => a.full_name.localeCompare(b.full_name));
  if (sortBy === "score_high") visibleStudents = [...visibleStudents].sort((a, b) => totalFor(b) - totalFor(a));
  if (sortBy === "score_low") visibleStudents = [...visibleStudents].sort((a, b) => totalFor(a) - totalFor(b));

  return (
    <div>
      <Link href="/admin-dashboard/results" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← Results</Link>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Record Scores</h1>
      <p className="text-sm text-slate-500 mb-6">CA1 and CA2 are out of 20 each (40 total), Exam is out of 60.</p>

      {step !== "branch" && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <button onClick={() => setStep("branch")} className="hover:text-brand-blue-strong hover:underline">Sections</button>
          {branch && <span>/</span>}
          {branch && (step === "term" ? <span className="text-slate-800 font-medium">{branch}</span> : <button onClick={() => setStep("term")} className="hover:text-brand-blue-strong hover:underline">{branch}</button>)}
          {term && step !== "term" && <span>/</span>}
          {term && (step === "class" ? <span className="text-slate-800 font-medium">{term}</span> : step !== "term" && <button onClick={() => setStep("class")} className="hover:text-brand-blue-strong hover:underline">{term}</button>)}
          {className && step !== "class" && step !== "term" && <span>/</span>}
          {className && (step === "subject" ? <span className="text-slate-800 font-medium">{className}</span> : (step === "scores") && <button onClick={() => setStep("subject")} className="hover:text-brand-blue-strong hover:underline">{className}</button>)}
          {subject && step === "scores" && <span>/</span>}
          {subject && step === "scores" && <span className="text-slate-800 font-medium">{subject}</span>}
        </div>
      )}

      {step === "branch" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BRANCHES.map((b) => (
            <button key={b.key} onClick={() => pickBranch(b.key)} className="border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left">
              <div className={"w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 " + b.color}>{b.icon}</div>
              <h2 className="text-lg font-semibold text-slate-800">{b.key}</h2>
              <p className="text-sm text-brand-blue-strong font-medium mt-4">Select section →</p>
            </button>
          ))}
        </div>
      )}

      {step === "term" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TERMS.map((t) => (
            <button key={t} onClick={() => pickTerm(t)} className="border border-slate-200 rounded-xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center">
              <p className="font-semibold text-slate-800">{t}</p>
            </button>
          ))}
        </div>
      )}

      {step === "class" && (
        loadingOptions ? <p className="text-slate-500 text-sm">Loading classes...</p> :
        classOptions.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center"><p className="text-slate-500 text-sm">No classes found for {branch}.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {classOptions.map((c) => (
              <button key={c} onClick={() => pickClass(c)} className="border border-slate-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left">
                <h3 className="font-semibold text-slate-800">{c}</h3>
              </button>
            ))}
          </div>
        )
      )}

      {step === "subject" && (
        loadingOptions ? <p className="text-slate-500 text-sm">Loading subjects...</p> :
        subjectOptions.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center"><p className="text-slate-500 text-sm">No subjects configured for {branch}.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {subjectOptions.map((s) => (
              <button key={s} onClick={() => pickSubject(s)} className="border border-slate-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left">
                <h3 className="font-semibold text-slate-800">{s}</h3>
              </button>
            ))}
          </div>
        )
      )}

      {step === "scores" && (
        loading ? <p className="text-slate-500 text-sm">Loading students...</p> :
        students.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center"><p className="text-slate-500 text-sm">No students found in {className}.</p></div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong">
                <option value="name">Sort: Name (A-Z)</option>
                <option value="score_high">Sort: Score (High to Low)</option>
                <option value="score_low">Sort: Score (Low to High)</option>
              </select>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto mb-5">
              <table className="w-full text-sm">
                <thead className="bg-brand-blue text-slate-700">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Student</th>
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">CA1 (/20)</th>
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">CA2 (/20)</th>
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Exam (/60)</th>
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Total</th>
                    {priorTerms.map((t) => (
                      <th key={t} className="text-left px-5 py-3 font-semibold whitespace-nowrap text-slate-500">{t} Total</th>
                    ))}
                    {priorTerms.length > 0 && <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Cumulative Avg</th>}
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Grade</th>
                    <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((s) => {
                    const sc = scores[s.id] || {};
                    const total = totalFor(s);
                    const g = grade(total);
                    const cumulative = cumulativeFor(s);
                    return (
                      <tr key={s.id} className="border-t border-slate-200">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {s.photo_url ? (
                              <img src={s.photo_url} alt={s.full_name} className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-blue" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-xs font-semibold text-brand-blue-strong">{s.full_name.charAt(0)}</div>
                            )}
                            <span className="font-medium text-slate-800 whitespace-nowrap">{s.full_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <input type="number" min="0" max="20" value={sc.ca1 ?? ""} onChange={(e) => updateScore(s.id, "ca1", e.target.value)} className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
                        </td>
                        <td className="px-5 py-3">
                          <input type="number" min="0" max="20" value={sc.ca2 ?? ""} onChange={(e) => updateScore(s.id, "ca2", e.target.value)} className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
                        </td>
                        <td className="px-5 py-3">
                          <input type="number" min="0" max="60" value={sc.exam ?? ""} onChange={(e) => updateScore(s.id, "exam", e.target.value)} className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{total}</td>
                        {priorTerms.map((t) => (
                          <td key={t} className="px-5 py-3 text-slate-500">{priorTotals[s.id]?.[t] ?? "-"}</td>
                        ))}
                        {priorTerms.length > 0 && <td className="px-5 py-3 font-semibold text-brand-blue-strong">{cumulative !== null ? cumulative : "-"}</td>}
                        <td className="px-5 py-3">
                          <span className={"text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap " + (g.letter === "F" ? "bg-red-50 text-red-700" : g.letter === "A" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>{g.letter} - {g.remark}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={"text-xs font-semibold px-2.5 py-1 rounded-full " + (sc.status === "published" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>{sc.status === "published" ? "Published" : "Draft"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {message && <p className="text-sm text-slate-600 mb-3">{message}</p>}
            <div className="flex gap-3">
              <button onClick={() => handleSaveAll(false)} disabled={saving} className="border border-slate-300 text-slate-700 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-60">{saving ? "Saving..." : "Save as Draft"}</button>
              <button onClick={() => handleSaveAll(true)} disabled={saving} className="bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Publishing..." : "Publish"}</button>
            </div>
          </>
        )
      )}
    </div>
  );
}