"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ClassReportCardsPage() {
  const params = useParams();
  const branch = params.branch.charAt(0).toUpperCase() + params.branch.slice(1);
  const className = decodeURIComponent(params.className);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const stored = sessionStorage.getItem("shinnystar_user");
      const location = stored ? JSON.parse(stored).location : null;
      const { data } = await supabase.from("students").select("id, full_name, photo_url, reg_number").eq("branch", branch).eq("class", className).eq("location", location).order("full_name");
      setStudents(data || []);
      setLoading(false);
    }
    load();
  }, [branch, className]);

  return (
    <div>
      <Link href="/admin-dashboard/results/reportcards" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← All Sections</Link>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">{className} — {branch}</h1>
      <p className="text-sm text-slate-500 mb-6">Select a student to view their report card.</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading students...</p>
      ) : students.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No students in this class.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {students.map((s) => (
            <Link key={s.id} href={"/admin-dashboard/results/reportcards/view/" + s.id} className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-50 transition">
              {s.photo_url ? (
                <img src={s.photo_url} alt={s.full_name} className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-blue" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-xs font-semibold text-brand-blue-strong">{s.full_name.charAt(0)}</div>
              )}
              <div>
                <p className="text-sm font-medium text-slate-800">{s.full_name}</p>
                <p className="text-xs text-slate-500">{s.reg_number}</p>
              </div>
              <span className="text-slate-400 ml-auto">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}