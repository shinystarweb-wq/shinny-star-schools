"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function storageKey(examId, studentId) {
  return "exam_progress_" + examId + "_" + studentId;
}

export default function TakeExamPage() {
  const { id } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setStudent(user);

      const { data: examData } = await supabase.from("exams").select("*").eq("id", id).single();
      const { data: questionData } = await supabase.from("exam_questions").select("*").eq("exam_id", id).order("order_index");
      const { data: existingAttempt } = await supabase.from("exam_attempts").select("*").eq("exam_id", id).eq("student_id", user.id).maybeSingle();

      if (existingAttempt && existingAttempt.submitted_at) {
        setAlreadyTaken(true);
        setResult(existingAttempt);
        setLoading(false);
        return;
      }

      const savedProgress = localStorage.getItem(storageKey(id, user.id));
      let restoredAnswers = {};
      let remainingSeconds = examData.duration_minutes * 60;

      if (savedProgress) {
        try {
          const parsed = JSON.parse(savedProgress);
          restoredAnswers = parsed.answers || {};
          const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000);
          remainingSeconds = Math.max(0, examData.duration_minutes * 60 - elapsed);
        } catch (e) {}
      } else {
        localStorage.setItem(storageKey(id, user.id), JSON.stringify({ startedAt: Date.now(), answers: {} }));
      }

      setExam(examData);
      setQuestions(questionData || []);
      setAnswers(restoredAnswers);
      setTimeLeft(remainingSeconds);
      setLoading(false);

      if (remainingSeconds <= 0) {
        setTimeout(() => handleSubmit(questionData || [], restoredAnswers, user), 300);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (timeLeft === null || alreadyTaken || submittedRef.current) return;
    if (timeLeft <= 0) {
      handleSubmit(questions, answers, student);
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, alreadyTaken]);

  function selectAnswer(questionId, option) {
    const updated = { ...answers, [questionId]: option };
    setAnswers(updated);
    if (student) {
      const existing = localStorage.getItem(storageKey(id, student.id));
      const startedAt = existing ? JSON.parse(existing).startedAt : Date.now();
      localStorage.setItem(storageKey(id, student.id), JSON.stringify({ startedAt, answers: updated }));
    }
  }

  async function handleSubmit(qList, ansMap, stu) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    clearTimeout(timerRef.current);

    const finalQuestions = qList || questions;
    const finalAnswers = ansMap || answers;
    const finalStudent = stu || student;

    let score = 0;
    let totalMarks = 0;
    finalQuestions.forEach((q) => {
      totalMarks += q.marks || 1;
      if (finalAnswers[q.id] === q.correct_answer) score += q.marks || 1;
    });

    await supabase.from("exam_attempts").upsert([{
      exam_id: id, student_id: finalStudent.id, score, total_marks: totalMarks,
      answers: finalAnswers, submitted_at: new Date().toISOString(),
    }], { onConflict: "exam_id,student_id" });

    localStorage.removeItem(storageKey(id, finalStudent.id));
    setSubmitting(false);
    router.push("/student-dashboard/exams");
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  if (loading) return <p className="text-slate-500 text-sm">Loading exam...</p>;

  if (alreadyTaken) {
    const pct = result.total_marks ? Math.round((result.score / result.total_marks) * 100) : 0;
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-brand-blue flex items-center justify-center text-2xl mx-auto mb-4">✓</div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Already Submitted</h1>
        <p className="text-sm text-slate-500 mb-6">You've already taken this exam.</p>
        <div className="border border-slate-200 rounded-xl p-6">
          <p className="text-3xl font-bold text-slate-800">{result.score} / {result.total_marks}</p>
          <p className="text-sm text-slate-500 mt-1">{pct}%</p>
        </div>
      </div>
    );
  }

  if (!exam || questions.length === 0) return <p className="text-slate-500 text-sm">This exam has no questions yet.</p>;

  const q = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 -m-8 p-0">
      <div className="lg:col-span-1 bg-brand-blue lg:min-h-full p-5 lg:rounded-l-xl">
        <div className="flex items-center gap-3 mb-5">
          {student?.photo_url ? (
            <img src={student.photo_url} alt={student.full_name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-brand-blue-strong text-white flex items-center justify-center font-semibold ring-2 ring-white">{student?.full_name?.charAt(0)}</div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-800">{student?.full_name}</p>
            <p className="text-xs text-slate-500">{student?.class}</p>
          </div>
        </div>

        <div className={"text-center text-lg font-bold px-4 py-2.5 rounded-lg mb-5 " + (timeLeft < 60 ? "bg-red-100 text-red-600" : "bg-white text-slate-800")}>
          ⏱ {formatTime(timeLeft)}
        </div>

        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Questions ({answeredCount}/{questions.length})</p>
        <div className="grid grid-cols-5 gap-2">
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrentIndex(i)}
              className={
                "w-9 h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition " +
                (i === currentIndex
                  ? "bg-brand-blue-strong text-white ring-2 ring-offset-1 ring-brand-blue-strong"
                  : answers[qq.id]
                  ? "bg-green-500 text-white"
                  : "bg-white text-slate-500 border border-slate-200")
              }
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-5 text-xs text-slate-600">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block"></span> Attempted</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-slate-300 inline-block"></span> Not attempted</span>
        </div>
      </div>

      <div className="lg:col-span-3 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">{exam.name}</h1>
          <p className="text-sm text-slate-500">{exam.subject}</p>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2 mb-6">
          <div className="bg-brand-blue-strong h-2 rounded-full transition-all" style={{ width: ((currentIndex + 1) / questions.length) * 100 + "%" }}></div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-6 mb-5">
          <p className="text-xs text-slate-400 mb-2">Question {currentIndex + 1} of {questions.length}</p>
          <p className="text-base font-medium text-slate-800 mb-5">{q.question}</p>
          <div className="flex flex-col gap-3">
            {["a", "b", "c", "d"].map((opt) => (
              <button key={opt} onClick={() => selectAnswer(q.id, opt)} className={"text-left px-4 py-3 rounded-lg border text-sm transition " + (answers[q.id] === opt ? "border-brand-blue-strong bg-brand-blue text-slate-800 font-medium" : "border-slate-200 hover:bg-slate-50")}>
                <span className="font-semibold mr-2">{opt.toUpperCase()}.</span> {q["option_" + opt]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} className="border border-slate-300 px-5 py-2.5 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-40">Previous</button>

          {currentIndex < questions.length - 1 ? (
            <button onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))} className="bg-brand-blue-strong text-white px-5 py-2.5 rounded-lg font-medium hover:opacity-90">Next</button>
          ) : (
            <button onClick={() => handleSubmit()} disabled={submitting} className="bg-brand-blue-strong text-white px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{submitting ? "Submitting..." : "Submit Exam"}</button>
          )}
        </div>
      </div>
    </div>
  );
}