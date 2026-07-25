"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    upcomingExams: 0,
    attendancePercent: null,
    presentToday: 0,
    totalMarkedToday: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const today = new Date().toISOString().split("T")[0];

      const [studentsRes, teachersRes, classesRes, examsRes, attendanceRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("students").select("class"),
        supabase.from("exams").select("id", { count: "exact", head: true }).gte("exam_date", today),
        supabase.from("attendance").select("status").eq("attendance_date", today),
      ]);

      const uniqueClasses = new Set((classesRes.data || []).map((s) => s.class));
      const attendanceRows = attendanceRes.data || [];
      const presentCount = attendanceRows.filter((r) => r.status === "present" || r.status === "late").length;
      const attendancePercent = attendanceRows.length > 0 ? Math.round((presentCount / attendanceRows.length) * 100) : null;

      setStats({
        students: studentsRes.count || 0,
        teachers: teachersRes.count || 0,
        classes: uniqueClasses.size,
        upcomingExams: examsRes.count || 0,
        attendancePercent,
        presentToday: presentCount,
        totalMarkedToday: attendanceRows.length,
      });
      setLoading(false);
    }
    loadStats();
  }, []);

  const cards = [
    { label: "Total Students", value: stats.students, icon: "🎓", color: "bg-blue-50 text-blue-700" },
    { label: "Total Teachers", value: stats.teachers, icon: "🧑‍🏫", color: "bg-purple-50 text-purple-700" },
    { label: "Active Classes", value: stats.classes, icon: "🏫", color: "bg-amber-50 text-amber-700" },
    { label: "Upcoming Exams", value: stats.upcomingExams, icon: "📝", color: "bg-rose-50 text-rose-700" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Overview</h1>
      <p className="text-slate-500 text-sm mb-8">Welcome back. Here's what's happening at Shinny Star Schools today.</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading dashboard...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card) => (
              <div key={card.label} className="border border-slate-200 rounded-xl p-5">
                <div className={"w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3 " + card.color}>{card.icon}</div>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-sm text-slate-500">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="border border-slate-200 rounded-xl p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Today's Attendance</h2>
            {stats.attendancePercent === null ? (
              <p className="text-sm text-slate-500">No attendance has been marked yet today.</p>
            ) : (
              <>
                <div className="flex items-end gap-2 mb-2">
                  <p className="text-3xl font-bold text-slate-800">{stats.attendancePercent}%</p>
                  <p className="text-sm text-slate-500 mb-1">present ({stats.presentToday} of {stats.totalMarkedToday} marked)</p>
                </div>
                <div className="w-full bg-brand-blue rounded-full h-2.5">
                  <div className="bg-brand-blue-strong h-2.5 rounded-full" style={{ width: stats.attendancePercent + "%" }}></div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}