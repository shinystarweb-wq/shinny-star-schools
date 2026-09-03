"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ReadyExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadExams() {
    setLoading(true);
    const { data } = await supabase.from("exams").select("*, exam_questions(count)").eq("submission_status", "pending_review").order("created_at", { ascending: false });
    setExams(data || []);
    setLoading(false);
  }

  useEffect(() => { loadExams(); }, []);

  return (
    <div>
      <Link href="/admin-dashboard/exams" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← All Exams</Link>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Ready Exams</h1>
      <p className="text-sm text-slate-500 mb-8">Exams pushed by teachers, awaiting your review and approval.</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : exams.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No exams waiting for review right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {exams.map((e) => {
            const qCount = e.exam_questions?.[0]?.count || 0;
            return (
              <Link key={e.id} href={"/admin-dashboard/exams/manage/" + e.id} className="border border-amber-200 bg-amber-50/40 rounded-xl p-5 hover:shadow-md transition-all duration-200 block">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-800">{e.name}</h3>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">Pending Review</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">{e.branch} • {e.class} {e.subject ? "• " + e.subject : ""}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>⏱ {e.duration_minutes} min</span>
                  <span>• {qCount} questions</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}