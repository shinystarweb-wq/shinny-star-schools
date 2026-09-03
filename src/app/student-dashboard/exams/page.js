"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function StudentExamsPage() {
  const [student, setStudent] = useState(null);
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setStudent(user);

      const { data: examData } = await supabase.from("exams").select("*, exam_questions(count)")
        .eq("branch", user.branch).eq("class", user.class).eq("location", user.location)
        .eq("submission_status", "published").order("exam_date");

      const examIds = (examData || []).map((e) => e.id);
      let attemptMap = {};
      if (examIds.length > 0) {
        const { data: attemptData } = await supabase.from("exam_attempts").select("*").eq("student_id", user.id).in("exam_id", examIds);
        (attemptData || []).forEach((a) => { attemptMap[a.exam_id] = a; });
      }

      setExams(examData || []);
      setAttempts(attemptMap);
      setLoading(false);
    }
    load();
  }, []);

  const today = todayStr();
  const upcoming = exams.filter((e) => !attempts[e.id] && (!e.exam_date || e.exam_date >= today));
  const completed = exams.filter((e) => attempts[e.id] && attempts[e.id].submitted_at);
  const missed = exams.filter((e) => !attempts[e.id] && e.exam_date && e.exam_date < today);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">My Exams</h1>
      <p className="text-sm text-slate-500 mb-8">{student?.class} • {student?.branch} Section</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading exams...</p>
      ) : exams.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No exams published for your class yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">Available</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {upcoming.map((e) => (
                  <Link key={e.id} href={"/student-dashboard/exams/take/" + e.id} className="border border-brand-blue-strong/30 bg-brand-blue/30 rounded-xl p-5 hover:shadow-md transition-all duration-200 block">
                    <h3 className="font-semibold text-slate-800 mb-1">{e.name}</h3>
                    <p className="text-xs text-slate-500 mb-3">{e.subject}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>⏱ {e.duration_minutes} min</span>
                      <span>• {e.exam_questions?.[0]?.count || 0} questions</span>
                    </div>
                    {e.exam_date && <p className="text-xs text-slate-400 mt-2">{e.exam_date}</p>}
                    <p className="text-sm text-brand-blue-strong font-medium mt-3">Start Exam →</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">Completed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {completed.map((e) => {
                  const a = attempts[e.id];
                  const pct = a.total_marks ? Math.round((a.score / a.total_marks) * 100) : 0;
                  return (
                    <div key={e.id} className="border border-slate-200 rounded-xl p-5">
                      <h3 className="font-semibold text-slate-800 mb-1">{e.name}</h3>
                      <p className="text-xs text-slate-500 mb-3">{e.subject}</p>
                      <p className="text-2xl font-bold text-slate-800">{a.score} / {a.total_marks}</p>
                      <p className="text-xs text-slate-500">{pct}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {missed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">Missed</h2>
              <div className="flex flex-col gap-2">
                {missed.map((e) => (
                  <div key={e.id} className="border border-slate-200 rounded-lg px-4 py-2.5 opacity-60">
                    <p className="text-sm text-slate-600">{e.name} — {e.exam_date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}