"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const PAGE_SIZE = 10;
const DEPARTMENTS = ["Art", "Science", "Commercial"];

export default function BranchTeachersPage() {
  const params = useParams();
  const branchLabel = params.branch.charAt(0).toUpperCase() + params.branch.slice(1);

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  useEffect(() => {
    async function loadTeachers() {
      setLoading(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const stored = sessionStorage.getItem("shinnystar_user");
      const location = stored ? JSON.parse(stored).location : null;
      let query = supabase.from("teachers").select("*", { count: "exact" }).eq("branch", branchLabel).order("full_name").range(from, to);
      if (location) query = query.eq("location", location);
      if (search.trim()) query = query.ilike("full_name", "%" + search.trim() + "%");
      if (departmentFilter) query = query.eq("department", departmentFilter);
      if (genderFilter) query = query.eq("gender", genderFilter);
      const { data, count, error } = await query;
      if (!error) {
        setTeachers(data);
        setTotalCount(count);
      }
      setLoading(false);
    }
    loadTeachers();
  }, [page, search, departmentFilter, genderFilter, branchLabel]);

  useEffect(() => { setPage(0); }, [search, departmentFilter, genderFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const selectClass = "border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent";

  return (
    <div>
      <Link href="/admin-dashboard/teachers" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← All Teachers</Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{branchLabel} Teachers</h1>
          <p className="text-sm text-slate-500 mt-1">{totalCount} teachers in this section</p>
        </div>
        <Link href="/admin-dashboard/teachers/add" className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm">+ Add Teacher</Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent" />
        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className={selectClass}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className={selectClass}>
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading teachers...</p>
      ) : teachers.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No teachers match your filters.</p>
        </div>
      ) : (
        <>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-blue text-slate-700">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Teacher</th>
                  <th className="text-left px-5 py-3 font-semibold">Subject</th>
                  <th className="text-left px-5 py-3 font-semibold">Department</th>
                  <th className="text-left px-5 py-3 font-semibold">Gender</th>
                  <th className="text-left px-5 py-3 font-semibold">PIN</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id} onClick={() => window.location.href = "/admin-dashboard/teachers/view/" + t.id} className="border-t border-slate-200 hover:bg-slate-50 transition cursor-pointer">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {t.photo_url ? (
                          <img src={t.photo_url} alt={t.full_name} className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-blue" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-xs font-semibold text-brand-blue-strong">{t.full_name.charAt(0)}</div>
                        )}
                        <span className="font-medium text-slate-800">{t.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{t.subject}</td>
                    <td className="px-5 py-3 text-slate-600">{t.department}</td>
                    <td className="px-5 py-3 capitalize text-slate-600">{t.gender}</td>
                    <td className="px-5 py-3 text-slate-600 font-mono tracking-widest">{t.pin || "-"}</td>
                    <td className="px-5 py-3">
                      <span className={"text-xs font-semibold px-2.5 py-1 rounded-full " + (t.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                        {t.verified ? "✓ Verified" : "⚠ Not Verified"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
            <p>Page {page + 1} of {totalPages} ({totalCount} teachers)</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50">Previous</button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}