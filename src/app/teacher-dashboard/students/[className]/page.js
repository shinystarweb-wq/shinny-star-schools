"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function TeacherClassStudentsPage() {
  const params = useParams();
  const className = decodeURIComponent(params.className);
  const [branch, setBranch] = useState("");
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setBranch(user.branch);

      const { data } = await supabase.from("students").select("*").eq("branch", user.branch).eq("class", className).order("full_name");
      setStudents(data || []);
      setLoading(false);
    }
    load();
  }, [className]);

  const filtered = students.filter((s) => !search.trim() || s.full_name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div>
      <Link href="/teacher-dashboard/students" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← All Classes</Link>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">{className}</h1>
      <p className="text-sm text-slate-500 mb-6">{students.length} students • {branch} Section</p>

      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="w-full max-w-sm border border-slate-300 rounded-lg px-4 py-2.5 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />

      {loading ? (
        <p className="text-slate-500 text-sm">Loading students...</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No students found.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-blue text-slate-700">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Student</th>
                <th className="text-left px-5 py-3 font-semibold">Gender</th>
                <th className="text-left px-5 py-3 font-semibold">Guardian</th>
                <th className="text-left px-5 py-3 font-semibold">Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-slate-200">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt={s.full_name} className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-blue" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-xs font-semibold text-brand-blue-strong">{s.full_name.charAt(0)}</div>
                      )}
                      <span className="font-medium text-slate-800">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 capitalize text-slate-600">{s.gender}</td>
                  <td className="px-5 py-3 text-slate-600">{s.parent_name}</td>
                  <td className="px-5 py-3 text-slate-600">{s.parent_phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}