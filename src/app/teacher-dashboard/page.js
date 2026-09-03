"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState(null);
  const [stats, setStats] = useState({ students: 0, classes: 0, exams: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("shinnystar_user");
    if (!stored) return;
    const user = JSON.parse(stored);
    setTeacher(user);

    async function loadStats() {
      const [studentsRes, classesRes, examsRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("branch", user.branch),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("branch", user.branch),
        supabase.from("exams").select("id", { count: "exact", head: true }).eq("branch", user.branch),
      ]);
      setStats({ students: studentsRes.count || 0, classes: classesRes.count || 0, exams: examsRes.count || 0 });
      setLoading(false);
    }
    loadStats();
  }, []);

  if (!teacher) return <p className="text-slate-500 text-sm">Loading...</p>;

  const cards = [
    { label: "Students in Section", value: stats.students, icon: "🎓", color: "bg-blue-50 text-blue-700" },
    { label: "Classes", value: stats.classes, icon: "🏫", color: "bg-purple-50 text-purple-700" },
    { label: "Exams", value: stats.exams, icon: "📝", color: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Welcome back, {teacher.full_name?.split(" ")[0]}</h1>
      <p className="text-slate-500 text-sm mb-8">{teacher.branch} Section</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading dashboard...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="border border-slate-200 rounded-xl p-5">
              <div className={"w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3 " + card.color}>{card.icon}</div>
              <p className="text-2xl font-bold text-slate-800">{card.value}</p>
              <p className="text-sm text-slate-500">{card.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}