"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const PAGE_SIZE = 10;
const CLASSES_BY_BRANCH = {
  School: ["Creche", "Nursery 1", "Nursery 2", "KG 1", "KG 2", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"],
  College: ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"],
  Tutorial: ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3", "WAEC", "NECO", "GCE", "JUPEB", "SAT", "TOEFL", "IELTS", "JAMB"],
};
const DEPARTMENTS = ["Art", "Science", "Commercial"];

export default function BranchStudentsPage() {
  const params = useParams();
  const branchLabel = params.branch.charAt(0).toUpperCase() + params.branch.slice(1);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  useEffect(() => {
    async function loadStudents() {
      setLoading(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase.from("students").select("*", { count: "exact" }).eq("branch", branchLabel).order("full_name").range(from, to);
      if (search.trim()) query = query.ilike("full_name", "%" + search.trim() + "%");
      if (classFilter) query = query.eq("class", classFilter);
      if (departmentFilter) query = query.eq("department", departmentFilter);
      if (genderFilter) query = query.eq("gender", genderFilter);
      const { data, count, error } = await query;
      if (!error) {
        setStudents(data);
        setTotalCount(count);
      }
      setLoading(false);
    }
    loadStudents();
  }, [page, search, classFilter, departmentFilter, genderFilter, branchLabel]);

  useEffect(() => { setPage(0); }, [search, classFilter, departmentFilter, genderFilter]);

  const CLASSES = CLASSES_BY_BRANCH[branchLabel] || [];
const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const selectClass = "border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent";

  return (
    <div>
      <Link href="/admin-dashboard/students" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← All Students</Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{branchLabel} Students</h1>
          <p className="text-sm text-slate-500 mt-1">{totalCount} students in this section</p>
        </div>
        <Link href="/admin-dashboard/students/add" className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm">+ Add Student</Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent" />
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={selectClass}>
          <option value="">All Classes</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
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
        <p className="text-slate-500 text-sm">Loading students...</p>
      ) : students.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No students match your filters.</p>
        </div>
      ) : (
        <>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-blue text-slate-700">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Student</th>
                  <th className="text-left px-5 py-3 font-semibold">Class</th>
                  <th className="text-left px-5 py-3 font-semibold">Department</th>
                  <th className="text-left px-5 py-3 font-semibold">Gender</th>
                  <th className="text-left px-5 py-3 font-semibold">Guardian</th>
                  <th className="text-left px-5 py-3 font-semibold">Phone</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} onClick={() => window.location.href = "/admin-dashboard/students/view/" + s.id} className="border-t border-slate-200 hover:bg-slate-50 transition cursor-pointer">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt={s.full_name} className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-blue" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-xs font-semibold text-brand-blue-strong">{s.full_name.charAt(0)}</div>
                        )}
                        <span className="font-medium text-slate-800">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className="inline-block bg-brand-blue text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full">{s.class}</span></td>
                    <td className="px-5 py-3 text-slate-600">{s.department}</td>
                    <td className="px-5 py-3 capitalize text-slate-600">{s.gender}</td>
                    <td className="px-5 py-3 text-slate-600">{s.parent_name}</td>
                    <td className="px-5 py-3 text-slate-600">{s.parent_phone}</td>
                    <td className="px-5 py-3">
                      <span className={"text-xs font-semibold px-2.5 py-1 rounded-full " + (s.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                        {s.verified ? "✓ Verified" : "⚠ Not Verified"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
            <p>Page {page + 1} of {totalPages} ({totalCount} students)</p>
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