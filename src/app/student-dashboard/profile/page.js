"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function StudentProfilePage() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profile");

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      const { data } = await supabase.from("students").select("*").eq("id", user.id).single();
      setStudent(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="text-slate-500 text-sm">Loading profile...</p>;
  if (!student) return <p className="text-slate-500 text-sm">Profile not found.</p>;

  const qrData = typeof window !== "undefined" ? window.location.origin + "/admin-dashboard/students/view/" + student.id : student.id;
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(qrData);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">My Profile</h1>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {student.photo_url ? (
            <img src={student.photo_url} alt={student.full_name} className="w-16 h-16 rounded-full object-cover ring-4 ring-brand-blue" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-blue flex items-center justify-center text-xl font-semibold text-brand-blue-strong ring-4 ring-brand-blue">{student.full_name.charAt(0)}</div>
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-800">{student.full_name}</h2>
            <p className="text-sm text-slate-500">{student.class} • {student.branch} • {student.reg_number}</p>
          </div>
        </div>
        <span className={"text-xs font-semibold px-3 py-1.5 rounded-full " + (student.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
          {student.verified ? "✓ Verified" : "⚠ Not Verified"}
        </span>
      </div>

      <div className="flex gap-2 border-b border-slate-200 mb-6">
        <button onClick={() => setTab("profile")} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px " + (tab === "profile" ? "border-brand-blue-strong text-brand-blue-strong" : "border-transparent text-slate-500")}>Details</button>
        <button onClick={() => setTab("idcard")} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px " + (tab === "idcard" ? "border-brand-blue-strong text-brand-blue-strong" : "border-transparent text-slate-500")}>ID Card</button>
      </div>

      {tab === "profile" && (
        <div className="border border-slate-200 rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><span className="text-slate-500">Registration Number:</span> <span className="text-slate-800 font-medium">{student.reg_number || "-"}</span></p>
            <p><span className="text-slate-500">Date of Birth:</span> <span className="text-slate-800 font-medium">{student.date_of_birth || "-"}</span></p>
            <p><span className="text-slate-500">Gender:</span> <span className="text-slate-800 font-medium capitalize">{student.gender || "-"}</span></p>
            <p><span className="text-slate-500">State of Origin:</span> <span className="text-slate-800 font-medium">{student.state_of_origin || "-"}</span></p>
            <p><span className="text-slate-500">Department:</span> <span className="text-slate-800 font-medium">{student.department || "-"}</span></p>
            <p><span className="text-slate-500">Parent/Guardian:</span> <span className="text-slate-800 font-medium">{student.parent_name || "-"}</span></p>
            <p><span className="text-slate-500">Parent Phone:</span> <span className="text-slate-800 font-medium">{student.parent_phone || "-"}</span></p>
            <p className="md:col-span-2"><span className="text-slate-500">Address:</span> <span className="text-slate-800 font-medium">{student.address || "-"}</span></p>
          </div>
        </div>
      )}

      {tab === "idcard" && (
        <div className="flex justify-center">
          <div className="w-[540px] rounded-2xl overflow-hidden border border-slate-200 shadow-lg flex bg-white">
            <div className="bg-brand-blue-strong text-white w-40 flex-shrink-0 flex flex-col items-center justify-between py-6 px-4 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-28 h-28 rounded-full bg-white/10"></div>
              <div className="absolute -bottom-14 -right-10 w-32 h-32 rounded-full bg-white/10"></div>
              <div className="text-center relative z-10 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 border border-white/40 flex items-center justify-center mb-2 text-lg">🏫</div>
                <p className="font-bold tracking-wide text-sm leading-tight">SHINNY STAR SCHOOLS</p>
                <p className="text-[10px] text-white/70 mt-1 uppercase tracking-wider">Identity Card</p>
              </div>
              <img src={qrUrl} alt="QR Code" className="w-24 h-24 rounded-lg bg-white p-1.5 relative z-10" />
            </div>
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {student.photo_url ? (
                    <img src={student.photo_url} alt={student.full_name} className="w-20 h-20 rounded-xl object-cover ring-2 ring-brand-blue" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-brand-blue flex items-center justify-center text-2xl font-semibold text-brand-blue-strong ring-2 ring-brand-blue">{student.full_name.charAt(0)}</div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800 text-lg leading-tight">{student.full_name}</p>
                    <p className="text-sm text-slate-500">{student.class}</p>
                    <p className="text-xs text-slate-400">{student.branch}{student.department ? " • " + student.department : ""}</p>
                  </div>
                </div>
                <span className={"text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap " + (student.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                  {student.verified ? "✓ Verified" : "⚠ Unverified"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-5 text-xs">
                <p><span className="text-slate-400">Gender</span><br /><span className="text-slate-700 font-medium capitalize">{student.gender || "-"}</span></p>
                <p><span className="text-slate-400">Reg. Number</span><br /><span className="text-slate-700 font-medium">{student.reg_number || "-"}</span></p>
                <p><span className="text-slate-400">Guardian</span><br /><span className="text-slate-700 font-medium">{student.parent_name || "-"}</span></p>
                <p><span className="text-slate-400">Phone</span><br /><span className="text-slate-700 font-medium">{student.parent_phone || "-"}</span></p>
              </div>
              <div className="border-t border-dashed border-slate-200 mt-5 pt-3 flex items-center justify-between">
                <p className="text-[10px] text-slate-400">ID: {student.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-[10px] text-slate-400">shinnystarschools.com.ng</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}