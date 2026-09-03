"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function TeacherClassesPage() {
  const [branch, setBranch] = useState("");
  const [classes, setClasses] = useState([]);
  const [counts, setCounts] = useState({});
  const [teacherMap, setTeacherMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setBranch(user.branch);

      const [classesRes, studentsRes, teachersRes] = await Promise.all([
        supabase.from("classes").select("*").eq("branch", user.branch).order("name"),
        supabase.from("students").select("class").eq("branch", user.branch),
        supabase.from("teachers").select("id, full_name").eq("branch", user.branch),
      ]);

      const c = {};
      (studentsRes.data || []).forEach((s) => { c[s.class] = (c[s.class] || 0) + 1; });

      const tMap = {};
      (teachersRes.data || []).forEach((t) => { tMap[t.id] = t.full_name; });

      setClasses(classesRes.data || []);
      setCounts(c);
      setTeacherMap(tMap);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Classes</h1>
      <p className="text-sm text-slate-500 mb-8">{branch} Section — view class details and assigned teachers.</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading classes...</p>
      ) : classes.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No classes found for {branch}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {classes.map((c) => (
            <Link key={c.id} href={"/teacher-dashboard/students/" + encodeURIComponent(c.name)} className="group relative border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 block bg-white overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-brand-blue opacity-60 group-hover:scale-110 transition-transform"></div>
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-xl bg-brand-blue flex items-center justify-center text-xl mb-4">🏫</div>
                <h3 className="font-bold text-slate-800">{c.name}</h3>
                <p className="text-3xl font-bold text-brand-blue-strong mt-2">{counts[c.name] || 0}</p>
                <p className="text-xs text-slate-500 mb-3">student{(counts[c.name] || 0) === 1 ? "" : "s"} enrolled</p>
                <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                  Class Teacher: <span className="font-medium text-slate-700">{c.class_teacher_id ? teacherMap[c.class_teacher_id] || "Unknown" : "Not assigned"}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}