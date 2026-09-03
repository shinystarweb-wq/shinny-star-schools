"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TeacherProfilePage() {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      const { data } = await supabase.from("teachers").select("*").eq("id", user.id).single();
      setTeacher(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="text-slate-500 text-sm">Loading profile...</p>;
  if (!teacher) return <p className="text-slate-500 text-sm">Profile not found.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">My Profile</h1>

      <div className="flex items-center gap-4 mb-8">
        {teacher.photo_url ? (
          <img src={teacher.photo_url} alt={teacher.full_name} className="w-20 h-20 rounded-full object-cover ring-4 ring-brand-blue" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-brand-blue flex items-center justify-center text-2xl font-semibold text-brand-blue-strong ring-4 ring-brand-blue">{teacher.full_name.charAt(0)}</div>
        )}
        <div>
          <h2 className="text-xl font-bold text-slate-800">{teacher.full_name}</h2>
          <p className="text-sm text-slate-500">{teacher.subject || "Teacher"} • {teacher.branch}</p>
          <p className="text-xs text-slate-400">{teacher.staff_id}</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <p><span className="text-slate-500">Gender:</span> <span className="text-slate-800 font-medium capitalize">{teacher.gender || "-"}</span></p>
          <p><span className="text-slate-500">Department:</span> <span className="text-slate-800 font-medium">{teacher.department || "-"}</span></p>
          <p><span className="text-slate-500">Subject:</span> <span className="text-slate-800 font-medium">{teacher.subject || "-"}</span></p>
          <p><span className="text-slate-500">Qualification:</span> <span className="text-slate-800 font-medium">{teacher.qualification || "-"}</span></p>
          <p><span className="text-slate-500">Phone:</span> <span className="text-slate-800 font-medium">{teacher.phone || "-"}</span></p>
          <p><span className="text-slate-500">Email:</span> <span className="text-slate-800 font-medium">{teacher.email || "-"}</span></p>
        </div>
      </div>
    </div>
  );
}