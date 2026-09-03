"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import mammoth from "mammoth";

const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function ManageExam() {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState("manual");
  const [publishing, setPublishing] = useState(false);
  const [view, setView] = useState("questions");

  async function loadData() {
    setLoading(true);
    const [examRes, qRes] = await Promise.all([
      supabase.from("exams").select("*").eq("id", id).single(),
      supabase.from("exam_questions").select("*").eq("exam_id", id).order("order_index"),
    ]);
    setExam(examRes.data);
    setQuestions(qRes.data || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [id]);

  async function deleteQuestion(qid) {
    if (!confirm("Delete this question?")) return;
    await supabase.from("exam_questions").delete().eq("id", qid);
    loadData();
  }

  async function pushToAdmin() {
    setPublishing(true);
    const { error } = await supabase.from("exams").update({ submission_status: "pending_review" }).eq("id", id);
    setPublishing(false);
    if (!error) setExam((prev) => ({ ...prev, submission_status: "pending_review" }));
  }

  if (loading) return <p className="text-slate-500 text-sm">Loading exam...</p>;
  if (!exam) return <p className="text-slate-500 text-sm">Exam not found.</p>;

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  return (
    <div>
      <Link href="/teacher-dashboard/exams" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← Back to Exams</Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{exam.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{exam.class} • {exam.subject} • ⏱ {exam.duration_minutes} min • {questions.length} questions • {totalMarks} marks</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("questions")} className={"text-sm font-medium px-5 py-2.5 rounded-lg " + (view === "questions" ? "bg-brand-blue-strong text-white" : "border border-slate-300 hover:bg-slate-50")}>Questions</button>
          <button onClick={() => setView("results")} className={"text-sm font-medium px-5 py-2.5 rounded-lg " + (view === "results" ? "bg-brand-blue-strong text-white" : "border border-slate-300 hover:bg-slate-50")}>Results</button>
          {exam.submission_status === "draft" && (
            <button onClick={pushToAdmin} disabled={publishing || questions.length === 0} className="text-sm font-medium px-5 py-2.5 rounded-lg bg-brand-blue-strong text-white hover:opacity-90 disabled:opacity-50">
              {publishing ? "..." : "Push to Admin"}
            </button>
          )}
          {exam.submission_status === "pending_review" && (
            <span className="text-sm font-medium px-5 py-2.5 rounded-lg bg-amber-50 text-amber-700">Pending Admin Review</span>
          )}
          {exam.submission_status === "published" && (
            <span className="text-sm font-medium px-5 py-2.5 rounded-lg bg-green-50 text-green-700">✓ Published by Admin</span>
          )}
        </div>
      </div>

      {exam.status === "draft" && questions.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-3 mb-6">Add at least one question before publishing this exam.</div>
      )}

      {view === "results" && <ExamResults examId={id} totalMarks={totalMarks} />}

      {view === "questions" && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex gap-2 mb-5 bg-slate-100 p-1.5 rounded-xl w-fit">
            <button onClick={() => setMethod("manual")} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (method === "manual" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>Manual</button>
            <button onClick={() => setMethod("import")} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (method === "import" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>Import File</button>
            <button onClick={() => setMethod("ai")} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (method === "ai" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>AI Generate</button>
          </div>

          {method === "manual" && <ManualAdd examId={id} onAdded={loadData} />}
          {method === "import" && <ImportAdd examId={id} onAdded={loadData} nextOrder={questions.length} />}
          {method === "ai" && <AiGenerate examId={id} onAdded={loadData} nextOrder={questions.length} defaultTopic={exam.subject} />}

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Questions ({questions.length})</h2>
            {questions.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-xl py-12 text-center">
                <p className="text-slate-500 text-sm">No questions added yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {questions.map((q, i) => (
                  <div key={q.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-slate-800 flex-1">{i + 1}. {q.question}</p>
                      <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-500 hover:text-red-700 ml-3">Remove</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      {["a", "b", "c", "d"].map((opt) => (
                        <div key={opt} className={"px-3 py-1.5 rounded-lg " + (q.correct_answer === opt ? "bg-green-50 text-green-700 font-medium" : "bg-slate-50 text-slate-600")}>
                          {opt.toUpperCase()}. {q["option_" + opt]} {q.correct_answer === opt && "✓"}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-5 h-fit">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Exam Summary</h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={"font-medium " + (exam.status === "published" ? "text-green-700" : "text-slate-500")}>{exam.status}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Questions</span><span className="font-medium text-slate-800">{questions.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Total Marks</span><span className="font-medium text-slate-800">{totalMarks}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-medium text-slate-800">{exam.duration_minutes} min</span></div>
            {exam.exam_date && <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-medium text-slate-800">{exam.exam_date}</span></div>}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function ExamResults({ examId, totalMarks }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("exam_attempts")
        .select("*, students(full_name, photo_url, reg_number)")
        .eq("exam_id", examId)
        .order("score", { ascending: false });
      setAttempts(data || []);
      setLoading(false);
    }
    load();
  }, [examId]);

  const average = attempts.length > 0 ? Math.round((attempts.reduce((s, a) => s + Number(a.score), 0) / attempts.length) * 10) / 10 : null;
  const highest = attempts.length > 0 ? Math.max(...attempts.map((a) => Number(a.score))) : null;
  const lowest = attempts.length > 0 ? Math.min(...attempts.map((a) => Number(a.score))) : null;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Students Attempted</p>
          <p className="text-2xl font-bold text-slate-800">{attempts.length}</p>
        </div>
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Average Score</p>
          <p className="text-2xl font-bold text-slate-800">{average !== null ? average : "-"}</p>
        </div>
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Highest Score</p>
          <p className="text-2xl font-bold text-green-700">{highest !== null ? highest : "-"}</p>
        </div>
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Lowest Score</p>
          <p className="text-2xl font-bold text-red-600">{lowest !== null ? lowest : "-"}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading results...</p>
      ) : attempts.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No students have taken this exam yet.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-blue text-slate-700">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Rank</th>
                <th className="text-left px-5 py-3 font-semibold">Student</th>
                <th className="text-left px-5 py-3 font-semibold">Score</th>
                <th className="text-left px-5 py-3 font-semibold">Percentage</th>
                <th className="text-left px-5 py-3 font-semibold">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => (
                <tr key={a.id} className="border-t border-slate-200">
                  <td className="px-5 py-3 font-medium text-slate-500">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {a.students?.photo_url ? (
                        <img src={a.students.photo_url} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-blue" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-xs font-semibold text-brand-blue-strong">{a.students?.full_name?.charAt(0)}</div>
                      )}
                      <span className="font-medium text-slate-800">{a.students?.full_name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-800">{a.score} / {a.total_marks || totalMarks}</td>
                  <td className="px-5 py-3 text-slate-600">{a.total_marks ? Math.round((a.score / a.total_marks) * 100) : 0}%</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "In progress"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ManualAdd({ examId, onAdded }) {
  const [q, setQ] = useState({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "a", marks: 1 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setQ((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    if (!q.question || !q.option_a || !q.option_b || !q.option_c || !q.option_d) {
      setError("Fill in the question and all four options.");
      return;
    }
    setSaving(true);
    const { data: existing } = await supabase.from("exam_questions").select("id", { count: "exact", head: true }).eq("exam_id", examId);
    const { error: insertError } = await supabase.from("exam_questions").insert([{ ...q, exam_id: examId, order_index: existing?.length || 0 }]);
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setQ({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "a", marks: 1 });
    onAdded();
  }

  return (
    <form onSubmit={handleAdd} className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
        <textarea value={q.question} onChange={(e) => update("question", e.target.value)} rows={2} className={inputClass}></textarea>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {["a", "b", "c", "d"].map((opt) => (
          <div key={opt}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Option {opt.toUpperCase()}</label>
            <input type="text" value={q["option_" + opt]} onChange={(e) => update("option_" + opt, e.target.value)} className={inputClass} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Correct Answer</label>
          <select value={q.correct_answer} onChange={(e) => update("correct_answer", e.target.value)} className={inputClass}>
            <option value="a">A</option>
            <option value="b">B</option>
            <option value="c">C</option>
            <option value="d">D</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Marks</label>
          <input type="number" min="1" value={q.marks} onChange={(e) => update("marks", parseInt(e.target.value) || 1)} className={inputClass} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="self-start bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Adding..." : "Add Question"}</button>
    </form>
  );
}

function parseQuestionText(raw) {
  const blocks = raw.split(/\n\s*\n/).filter((b) => b.trim());
  const parsed = [];
  blocks.forEach((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 6) return;
    const question = lines[0].replace(/^\d+[\.\)]\s*/, "");
    const opts = {};
    let correct = "";
    lines.slice(1).forEach((line) => {
      const optMatch = line.match(/^([A-Da-d])[\.\)]\s*(.+)/);
      const ansMatch = line.match(/^Ans(?:wer)?\s*[:\-]\s*([A-Da-d])/i);
      if (ansMatch) correct = ansMatch[1].toLowerCase();
      else if (optMatch) opts[optMatch[1].toLowerCase()] = optMatch[2];
    });
    if (question && opts.a && opts.b && opts.c && opts.d && correct) {
      parsed.push({ question, option_a: opts.a, option_b: opts.b, option_c: opts.c, option_d: opts.d, correct_answer: correct, marks: 1 });
    }
  });
  return parsed;
}

function ImportAdd({ examId, onAdded, nextOrder }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState([]);
  const [fileName, setFileName] = useState("");

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    setPreview([]);

    try {
      if (file.name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setText(result.value);
      } else {
        const content = await file.text();
        setText(content);
      }
    } catch (err) {
      setError("Could not read file: " + err.message);
    }
  }

  function handlePreview() {
    setError("");
    const parsed = parseQuestionText(text);
    if (parsed.length === 0) {
      setError("Could not parse any questions. Check the format below.");
      return;
    }
    setPreview(parsed);
  }

  async function handleImport() {
    setSaving(true);
    const rows = preview.map((q, i) => ({ ...q, exam_id: examId, order_index: nextOrder + i }));
    const { error: insertError } = await supabase.from("exam_questions").insert(rows);
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setText("");
    setPreview([]);
    setFileName("");
    onAdded();
  }

  return (
    <div className="border border-slate-200 rounded-2xl p-6">
      <p className="text-sm text-slate-600 mb-3">Upload a .txt or .docx file, or paste questions directly, using this format — one question per block, separated by a blank line:</p>
      <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 mb-4 whitespace-pre-wrap">{`What is the capital of Nigeria?
A. Lagos
B. Abuja
C. Kano
D. Ibadan
Ans: B

2 + 2 = ?
A. 3
B. 4
C. 5
D. 6
Ans: B`}</pre>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium cursor-pointer">
          Choose File
          <input type="file" accept=".txt,.docx" onChange={handleFileUpload} className="hidden" />
        </label>
        {fileName && <span className="text-xs text-slate-500">{fileName}</span>}
      </div>

      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder="Or paste your questions here..." className={inputClass}></textarea>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {preview.length > 0 && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mt-3">{preview.length} question(s) ready to import.</div>
      )}

      <div className="flex gap-3 mt-4">
        {preview.length === 0 ? (
          <button onClick={handlePreview} className="bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90">Parse Questions</button>
        ) : (
          <>
            <button onClick={handleImport} disabled={saving} className="bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Importing..." : "Import " + preview.length + " Questions"}</button>
            <button onClick={() => setPreview([])} className="border border-slate-300 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-50">Edit Text</button>
          </>
        )}
      </div>
    </div>
  );
}

function AiGenerate({ examId, onAdded, nextOrder, defaultTopic }) {
  const [topics, setTopics] = useState(defaultTopic ? [{ name: defaultTopic, count: 5, difficulty: "medium" }] : [{ name: "", count: 5, difficulty: "medium" }]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState([]);
  const [saving, setSaving] = useState(false);

  function updateTopic(index, field, value) {
    setTopics((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }

  function addTopicRow() {
    setTopics((prev) => [...prev, { name: "", count: 5, difficulty: "medium" }]);
  }

  function removeTopicRow(index) {
    setTopics((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerate() {
    setError("");
    setPreview([]);
    const validTopics = topics.filter((t) => t.name.trim());
    if (validTopics.length === 0) {
      setError("Add at least one topic.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicList: validTopics }),
      });
      const data = await res.json();
      setGenerating(false);
      if (data.error) {
        setError(data.error);
        return;
      }
      setPreview(data.questions.map((q) => ({ ...q, marks: 1 })));
    } catch (err) {
      setGenerating(false);
      setError("Request failed: " + err.message);
    }
  }

  async function handleImport() {
    setSaving(true);
    const rows = preview.map((q, i) => ({ ...q, exam_id: examId, order_index: nextOrder + i }));
    const { error: insertError } = await supabase.from("exam_questions").insert(rows);
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setPreview([]);
    onAdded();
  }

  const totalRequested = topics.reduce((sum, t) => sum + (t.name.trim() ? parseInt(t.count) || 0 : 0), 0);

  return (
    <div className="border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center text-xl">✨</div>
        <div>
          <h2 className="font-semibold text-slate-800">AI Question Generator</h2>
          <p className="text-xs text-slate-500">Add topics one by one, each with its own question count and difficulty.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {topics.map((t, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Topic {i + 1}</span>
              {topics.length > 1 && (
                <button onClick={() => removeTopicRow(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              )}
            </div>
            <input type="text" value={t.name} onChange={(e) => updateTopic(i, "name", e.target.value)} placeholder="e.g. Photosynthesis" className={inputClass + " mb-3"} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Number of Questions</label>
                <input type="number" min="1" max="20" value={t.count} onChange={(e) => updateTopic(i, "count", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Difficulty</label>
                <select value={t.difficulty} onChange={(e) => updateTopic(i, "difficulty", e.target.value)} className={inputClass}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addTopicRow} className="text-sm text-brand-blue-strong font-medium hover:underline mb-5">+ Add Another Topic</button>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {preview.length === 0 ? (
        <button onClick={handleGenerate} disabled={generating} className="bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{generating ? "Generating..." : "Generate " + (totalRequested || "") + " Questions"}</button>
      ) : (
        <div>
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-3">{preview.length} question(s) generated. Review below before adding.</div>
          <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto">
            {preview.map((q, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">{i + 1}. {q.question}</div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={handleImport} disabled={saving} className="bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Adding..." : "Add All to Exam"}</button>
            <button onClick={() => setPreview([])} className="border border-slate-300 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-50">Discard</button>
          </div>
        </div>
      )}
    </div>
  );
}