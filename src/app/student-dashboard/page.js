"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [stats, setStats] = useState({ attendancePercent: null, upcomingExams: 0, unreadNotices: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setStudent(user);

      const today = todayStr();

      const [attendanceRes, examsRes, noticesRes] = await Promise.all([
        supabase.from("attendance").select("status").eq("student_id", user.id),
        supabase.from("exams").select("id", { count: "exact", head: true }).eq("branch", user.branch).eq("class", user.class).eq("location", user.location).eq("submission_status", "published").gte("exam_date", today),
        supabase.from("notices").select("id", { count: "exact", head: true }).eq("location", user.location).in("audience", ["all", "students"]),
      ]);

      const attRows = attendanceRes.data || [];
      const present = attRows.filter((a) => a.status === "present" || a.status === "late").length;
      const percent = attRows.length > 0 ? Math.round((present / attRows.length) * 100) : null;

      setStats({
        attendancePercent: percent,
        upcomingExams: examsRes.count || 0,
        unreadNotices: noticesRes.count || 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (!student) return <p className="text-slate-500 text-sm">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Welcome back, {student.full_name?.split(" ")[0]}</h1>
      <p className="text-slate-500 text-sm mb-8">{student.class} • {student.branch} Section</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading dashboard...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-slate-200 rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-lg mb-3">📅</div>
            <p className="text-2xl font-bold text-slate-800">{stats.attendancePercent !== null ? stats.attendancePercent + "%" : "-"}</p>
            <p className="text-sm text-slate-500">Overall Attendance</p>
          </div>
          <div className="border border-slate-200 rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-lg mb-3">📝</div>
            <p className="text-2xl font-bold text-slate-800">{stats.upcomingExams}</p>
            <p className="text-sm text-slate-500">Upcoming Exams</p>
          </div>
          <div className="border border-slate-200 rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center text-lg mb-3">📢</div>
            <p className="text-2xl font-bold text-slate-800">{stats.unreadNotices}</p>
            <p className="text-sm text-slate-500">Notices</p>
          </div>
        </div>
      )}
    </div>
  );
}