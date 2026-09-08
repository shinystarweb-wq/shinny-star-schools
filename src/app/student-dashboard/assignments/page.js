"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function StudentAssignmentsPage() {
  const [student, setStudent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setStudent(user);

      const { data: assignmentData } = await supabase.from("assignments").select("*")
        .eq("branch", user.branch).eq("class", user.class).eq("location", user.location)
        .eq("status", "published").order("due_date");

      const ids = (assignmentData || []).map((a) => a.id);
      let subMap = {};
      if (ids.length > 0) {
        const { data: subData } = await supabase.from("assignment_submissions").select("*").eq("student_id", user.id).in("assignment_id", ids);
        (subData || []).forEach((s) => { subMap[s.assignment_id] = s; });
      }

      setAssignments(assignmentData || []);
      setSubmissions(subMap);
      setLoading(false);
    }
    load();
  }, []);

  const today = todayStr();
  const pending = assignments.filter((a) => !submissions[a.id]);
  const submitted = assignments.filter((a) => submissions[a.id]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Assignments</h1>
      <p className="text-sm text-slate-500 mb-8">{student?.class} • {student?.branch} Section</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading assignments...</p>
      ) : assignments.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No assignments for your class yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">Pending</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {pending.map((a) => {
                  const overdue = a.due_date && a.due_date < today;
                  return (
                    <Link key={a.id} href={"/student-dashboard/assignments/" + a.id} className={"border rounded-xl p-5 hover:shadow-md transition-all duration-200 block " + (overdue ? "border-red-200 bg-red-50/40" : "border-brand-blue-strong/30 bg-brand-blue/30")}>
                      <h3 className="font-semibold text-slate-800 mb-1">{a.title}</h3>
                      <p className="text-xs text-slate-500 mb-2">{a.subject}</p>
                      {a.due_date && <p className={"text-xs " + (overdue ? "text-red-600 font-medium" : "text-slate-500")}>{overdue ? "Overdue — was due " : "Due "}{a.due_date}</p>}
                      <p className="text-sm text-brand-blue-strong font-medium mt-3">View & Submit →</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {submitted.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">Submitted</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {submitted.map((a) => (
                  <Link key={a.id} href={"/student-dashboard/assignments/" + a.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all duration-200 block">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-slate-800">{a.title}</h3>
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">Submitted</span>
                    </div>
                    <p className="text-xs text-slate-500">{a.subject}</p>
                    {submissions[a.id].score !== null && submissions[a.id].score !== undefined && (
                      <p className="text-sm font-bold text-slate-800 mt-2">Score: {submissions[a.id].score}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}