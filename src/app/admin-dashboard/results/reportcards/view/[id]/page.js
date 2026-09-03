"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const SESSION = "2025/2026";

function grade(total) {
  if (total >= 70) return "A";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 40) return "D";
  return "F";
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function ReportCardPage() {
  const [schoolSettings, setSchoolSettings] = useState(null);
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [resultsByTerm, setResultsByTerm] = useState({});
  const [showPosition, setShowPosition] = useState(false);
  const [positionByTerm, setPositionByTerm] = useState({});
  const [subjectPositions, setSubjectPositions] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTerm, setActiveTerm] = useState("1st Term");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: studentData } = await supabase.from("students").select("*").eq("id", id).single();
      if (!studentData) { setLoading(false); return; }
      setStudent(studentData);

      const { data: settingsData } = await supabase.from("school_settings").select("*").eq("location", studentData.location).single();
      setSchoolSettings(settingsData);

      const { data: subjectData } = await supabase.from("subjects").select("name").eq("branch", studentData.branch).order("name");
      setSubjects((subjectData || []).map((s) => s.name));

      const byTerm = {};
      for (const term of TERMS) {
        const { data } = await supabase.from("results").select("*").eq("student_id", id).eq("term", term).eq("session", SESSION).eq("status", "published");
        byTerm[term] = data || [];
      }
      setResultsByTerm(byTerm);

      const subjectPos = {};
      const { data: classmates } = await supabase.from("students").select("id").eq("branch", studentData.branch).eq("class", studentData.class);
      for (const subj of (subjectData || []).map((s) => s.name)) {
        subjectPos[subj] = {};
        for (const term of TERMS) {
          const scoresForSubject = [];
          for (const mate of classmates || []) {
            const { data: mateResult } = await supabase.from("results").select("total_score").eq("student_id", mate.id).eq("subject", subj).eq("term", term).eq("session", SESSION).eq("status", "published").maybeSingle();
            if (mateResult) scoresForSubject.push({ id: mate.id, score: Number(mateResult.total_score) });
          }
          scoresForSubject.sort((a, b) => b.score - a.score);
          const rank = scoresForSubject.findIndex((s) => s.id === id) + 1;
          subjectPos[subj][term] = rank > 0 ? rank : null;
        }
      }
      setSubjectPositions(subjectPos);

      const { data: settingsData } = await supabase.from("class_settings").select("show_position").eq("branch", studentData.branch).eq("class", studentData.class).eq("session", SESSION).maybeSingle();
      const positionOn = settingsData?.show_position || false;
      setShowPosition(positionOn);

      if (positionOn) {
        const { data: classmates } = await supabase.from("students").select("id").eq("branch", studentData.branch).eq("class", studentData.class);
        const posByTerm = {};
        for (const term of TERMS) {
          const totals = [];
          for (const mate of classmates || []) {
            const { data: mateResults } = await supabase.from("results").select("total_score").eq("student_id", mate.id).eq("term", term).eq("session", SESSION);
            const sum = (mateResults || []).reduce((s, r) => s + Number(r.total_score), 0);
            totals.push({ id: mate.id, sum });
          }
          totals.sort((a, b) => b.sum - a.sum);
          const rank = totals.findIndex((t) => t.id === id) + 1;
          posByTerm[term] = rank > 0 ? rank : null;
        }
        setPositionByTerm(posByTerm);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <p className="text-slate-500 text-sm">Loading report card...</p>;
  if (!student) return <p className="text-slate-500 text-sm">Student not found.</p>;

  function subjectRow(subject) {
    return TERMS.map((term) => {
      const r = (resultsByTerm[term] || []).find((x) => x.subject === subject);
      return r ? Number(r.total_score) : null;
    });
  }

  function termTotal(term) {
    return (resultsByTerm[term] || []).reduce((s, r) => s + Number(r.total_score), 0);
  }

  function cumulativeFor(subject, uptoTerm) {
    const termIndex = TERMS.indexOf(uptoTerm);
    const relevantTerms = TERMS.slice(0, termIndex + 1);
    const scoresFound = relevantTerms
      .map((t) => (resultsByTerm[t] || []).find((r) => r.subject === subject))
      .filter(Boolean)
      .map((r) => Number(r.total_score));
    if (scoresFound.length === 0) return null;
    return Math.round((scoresFound.reduce((a, b) => a + b, 0) / scoresFound.length) * 10) / 10;
  }

  function termAverage(term) {
    const rows = resultsByTerm[term] || [];
    if (rows.length === 0) return null;
    return Math.round((termTotal(term) / rows.length) * 10) / 10;
  }

  function diff(termA, termB) {
    const a = termAverage(termA);
    const b = termAverage(termB);
    if (a === null || b === null) return null;
    return Math.round((b - a) * 10) / 10;
  }

  const activeResults = resultsByTerm[activeTerm] || [];
  const activeTotal = termTotal(activeTerm);
  const activeAvg = termAverage(activeTerm);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link href={"/admin-dashboard/results/reportcards/" + student.branch.toLowerCase() + "/" + encodeURIComponent(student.class)} className="text-sm text-brand-blue-strong font-medium hover:underline">← Back to Class</Link>
        <button onClick={() => window.print()} className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90">🖨 Print Report Card</button>
      </div>

      <div className="flex gap-2 mb-5 print:hidden">
        {TERMS.map((t) => (
          <button key={t} onClick={() => setActiveTerm(t)} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (activeTerm === t ? "bg-brand-blue-strong text-white" : "bg-slate-100 text-slate-600")}>{t}</button>
        ))}
      </div>

      <div className="border border-slate-200 rounded-2xl p-8 print:border-0 print:p-0 print:shadow-none max-w-4xl mx-auto bg-white" id="report-card">
        <div className="text-center border-b-2 border-brand-blue-strong pb-4 mb-6">
          {schoolSettings?.logo_url ? (
            <img src={schoolSettings.logo_url} alt="Logo" className="w-14 h-14 rounded-full object-cover mx-auto mb-2" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand-blue flex items-center justify-center text-2xl mx-auto mb-2">🏫</div>
          )}
          <h1 className="text-xl font-bold text-slate-800 tracking-wide">{schoolSettings?.school_name || "SHINNY STAR SCHOOLS"}</h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider">{student.branch} Section — Student Report Card</p>
          {schoolSettings?.address && <p className="text-xs text-slate-400 mt-1">{schoolSettings.address}</p>}
          <p className="text-xs text-slate-400">{[schoolSettings?.phone, schoolSettings?.email].filter(Boolean).join(" • ")}</p>
          <p className="text-xs text-slate-400">{schoolSettings?.website || "shinystarschools.com.ng"}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
          <div className="flex items-center gap-3 md:col-span-1 col-span-2">
            {student.photo_url ? (
              <img src={student.photo_url} alt={student.full_name} className="w-14 h-14 rounded-full object-cover ring-2 ring-brand-blue" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-brand-blue flex items-center justify-center text-lg font-semibold text-brand-blue-strong ring-2 ring-brand-blue">{student.full_name.charAt(0)}</div>
            )}
            <div>
              <p className="font-semibold text-slate-800">{student.full_name}</p>
              <p className="text-xs text-slate-500">{student.reg_number}</p>
            </div>
          </div>
          <p><span className="text-slate-500">Class:</span> <span className="font-medium text-slate-800">{student.class}</span></p>
          <p><span className="text-slate-500">Gender:</span> <span className="font-medium text-slate-800 capitalize">{student.gender}</span></p>
          <p><span className="text-slate-500">Session:</span> <span className="font-medium text-slate-800">{schoolSettings?.current_session || SESSION}</span></p>
        </div>

        <h2 className="font-semibold text-slate-800 mb-3">{activeTerm} — Subject Scores</h2>
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-brand-blue text-slate-700">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Subject</th>
                <th className="text-left px-4 py-2.5 font-semibold">CA1</th>
                <th className="text-left px-4 py-2.5 font-semibold">CA2</th>
                <th className="text-left px-4 py-2.5 font-semibold">Exam</th>
                <th className="text-left px-4 py-2.5 font-semibold">Total</th>
                <th className="text-left px-4 py-2.5 font-semibold">Cumulative</th>
                <th className="text-left px-4 py-2.5 font-semibold">Grade</th>
                {showPosition && <th className="text-left px-4 py-2.5 font-semibold">Position</th>}
                <th className="text-left px-4 py-2.5 font-semibold">Remark</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr><td colSpan="9" className="text-center text-slate-400 py-6 text-xs">No subjects configured for this section yet.</td></tr>
              ) : subjects.map((subj) => {
                const r = activeResults.find((x) => x.subject === subj);
                const cumulative = cumulativeFor(subj, activeTerm);
                const subjPos = subjectPositions[subj]?.[activeTerm];
                return (
                  <tr key={subj} className="border-t border-slate-200">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{subj}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r ? r.ca1_score : "-"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r ? r.ca2_score : "-"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r ? r.exam_score : "-"}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{r ? Number(r.total_score) : "-"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{cumulative !== null ? cumulative : "-"}</td>
                    <td className="px-4 py-2.5">{r ? grade(Number(r.total_score)) : "-"}</td>
                    {showPosition && <td className="px-4 py-2.5 text-slate-600">{subjPos ? ordinal(subjPos) : "-"}</td>}
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{r ? r.remark : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-brand-blue rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Total Score</p>
            <p className="text-xl font-bold text-slate-800">{activeTotal}</p>
          </div>
          <div className="bg-brand-blue rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Average</p>
            <p className="text-xl font-bold text-slate-800">{activeAvg !== null ? activeAvg + "%" : "-"}</p>
          </div>
          {showPosition && (
            <div className="bg-brand-blue rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Position</p>
              <p className="text-xl font-bold text-slate-800">{positionByTerm[activeTerm] ? ordinal(positionByTerm[activeTerm]) : "-"}</p>
            </div>
          )}
          <div className="bg-brand-blue rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Overall Grade</p>
            <p className="text-xl font-bold text-slate-800">{activeAvg !== null ? grade(activeAvg) : "-"}</p>
          </div>
        </div>

        <h2 className="font-semibold text-slate-800 mb-3">Term-on-Term Comparison</h2>
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-brand-blue text-slate-700">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Term</th>
                <th className="text-left px-4 py-2.5 font-semibold">Average</th>
                {showPosition && <th className="text-left px-4 py-2.5 font-semibold">Position</th>}
                <th className="text-left px-4 py-2.5 font-semibold">Change</th>
              </tr>
            </thead>
            <tbody>
              {TERMS.map((term, i) => {
                const avg = termAverage(term);
                const prevTerm = i > 0 ? TERMS[i - 1] : null;
                const change = prevTerm ? diff(prevTerm, term) : null;
                return (
                  <tr key={term} className="border-t border-slate-200">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{term}</td>
                    <td className="px-4 py-2.5 text-slate-800">{avg !== null ? avg + "%" : "-"}</td>
                    {showPosition && <td className="px-4 py-2.5 text-slate-600">{positionByTerm[term] ? ordinal(positionByTerm[term]) : "-"}</td>}
                    <td className="px-4 py-2.5">
                      {change === null ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        <span className={change > 0 ? "text-green-600 font-medium" : change < 0 ? "text-red-600 font-medium" : "text-slate-500"}>
                          {change > 0 ? "▲ +" : change < 0 ? "▼ " : ""}{change}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm mt-10 pt-6 border-t border-slate-200">
          <div>
            <div className="border-b border-slate-400 h-8"></div>
            <p className="text-xs text-slate-500 mt-1">Class Teacher's Signature</p>
          </div>
          <div>
            <div className="border-b border-slate-400 h-8"></div>
            <p className="text-xs text-slate-500 mt-1">Principal's Signature</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #report-card, #report-card * { visibility: visible; }
          #report-card { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}