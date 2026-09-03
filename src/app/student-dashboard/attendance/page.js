"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function StudentAttendancePage() {
  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState("");

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setStudent(user);

      const { data } = await supabase.from("attendance").select("*").eq("student_id", user.id).order("attendance_date", { ascending: false });
      setRecords(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const months = [...new Set(records.map((r) => r.attendance_date.slice(0, 7)))].sort().reverse();
  const filtered = monthFilter ? records.filter((r) => r.attendance_date.slice(0, 7) === monthFilter) : records;

  const presentCount = filtered.filter((r) => r.status === "present").length;
  const lateCount = filtered.filter((r) => r.status === "late").length;
  const absentCount = filtered.filter((r) => r.status === "absent").length;
  const total = filtered.length;
  const percent = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : null;

  function monthLabel(m) {
    const [y, mo] = m.split("-");
    return new Date(y, mo - 1).toLocaleString("default", { month: "long", year: "numeric" });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">My Attendance</h1>
      <p className="text-sm text-slate-500 mb-6">{student?.class} • {student?.branch} Section</p>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading attendance...</p>
      ) : records.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No attendance records yet.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <label className="text-sm font-medium text-slate-700">Filter by month:</label>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong">
              <option value="">All Time</option>
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Attendance Rate</p>
              <p className="text-2xl font-bold text-slate-800">{percent !== null ? percent + "%" : "-"}</p>
            </div>
            <div className="border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Present</p>
              <p className="text-2xl font-bold text-green-700">{presentCount}</p>
            </div>
            <div className="border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Late</p>
              <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
            </div>
            <div className="border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Absent</p>
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-blue text-slate-700">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Date</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200">
                    <td className="px-5 py-3 text-slate-700">{new Date(r.attendance_date + "T00:00:00").toLocaleDateString("default", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</td>
                    <td className="px-5 py-3">
                      <span className={"text-xs font-semibold px-2.5 py-1 rounded-full " + (r.status === "present" ? "bg-green-50 text-green-700" : r.status === "late" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700")}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}