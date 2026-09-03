"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatTime(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function MyAttendancePage() {
  const [teacher, setTeacher] = useState(null);
  const [dayRecord, setDayRecord] = useState(null);
  const [classOptions, setClassOptions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [openSession, setOpenSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pinModal, setPinModal] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [subject, setSubject] = useState("");
  const [processing, setProcessing] = useState(false);

  async function loadData() {
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    if (!stored) return;
    const user = JSON.parse(stored);
    setTeacher(user);

    const today = todayStr();

    const [dayRes, classesRes, sessionsRes] = await Promise.all([
      supabase.from("teacher_attendance").select("*").eq("teacher_id", user.id).eq("attendance_date", today).maybeSingle(),
      supabase.from("classes").select("name").eq("branch", user.branch).eq("location", user.location).order("name"),
      supabase.from("class_sessions").select("*").eq("teacher_id", user.id).eq("session_date", today).order("check_in", { ascending: false }),
    ]);

    setDayRecord(dayRes.data);
    setClassOptions((classesRes.data || []).map((c) => c.name));
    setSessions(sessionsRes.data || []);
    setOpenSession((sessionsRes.data || []).find((s) => !s.check_out) || null);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function openPinModal(action) {
    setPinModal(action);
    setPinInput("");
    setPinError("");
    if (action === "class_in") setSelectedClass("");
    if (action === "class_in") setSubject("");
  }

  async function confirmPin() {
    if (pinInput.trim() !== teacher.username && false) {} // placeholder, real check below
    const { data: match } = await supabase.from("teachers").select("id").eq("id", teacher.id).eq("pin", pinInput.trim()).maybeSingle();
    if (!match) {
      setPinError("Incorrect PIN.");
      return;
    }

    setProcessing(true);
    const today = todayStr();
    const now = new Date().toISOString();

    if (pinModal === "sign_in") {
      await supabase.from("teacher_attendance").upsert([{
        teacher_id: teacher.id, attendance_date: today, status: "present", sign_in_time: now,
      }], { onConflict: "teacher_id,attendance_date" });
    }

    if (pinModal === "sign_out") {
      await supabase.from("teacher_attendance").update({ sign_out_time: now }).eq("teacher_id", teacher.id).eq("attendance_date", today);
    }

    if (pinModal === "class_in") {
      if (!selectedClass) {
        setPinError("Select a class first.");
        setProcessing(false);
        return;
      }
      await supabase.from("class_sessions").insert([{
        teacher_id: teacher.id, branch: teacher.branch, location: teacher.location,
        class: selectedClass, subject, session_date: today, check_in: now,
      }]);
    }

    if (pinModal === "class_out") {
      await supabase.from("class_sessions").update({ check_out: now }).eq("id", openSession.id);
    }

    setProcessing(false);
    setPinModal(null);
    loadData();
  }

  if (loading || !teacher) return <p className="text-slate-500 text-sm">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">My Attendance</h1>
      <p className="text-sm text-slate-500 mb-8">{teacher.full_name} • {teacher.branch} Section, {teacher.location}</p>

      <div className="border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Today's Sign In / Sign Out</h2>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-brand-blue rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Signed In</p>
            <p className="text-lg font-bold text-slate-800">{formatTime(dayRecord?.sign_in_time)}</p>
          </div>
          <div className="bg-brand-blue rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Signed Out</p>
            <p className="text-lg font-bold text-slate-800">{formatTime(dayRecord?.sign_out_time)}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => openPinModal("sign_in")} disabled={!!dayRecord?.sign_in_time} className="flex-1 bg-brand-blue-strong text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-40">Sign In</button>
          <button onClick={() => openPinModal("sign_out")} disabled={!dayRecord?.sign_in_time || !!dayRecord?.sign_out_time} className="flex-1 border border-slate-300 py-2.5 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-40">Sign Out</button>
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Class Sessions</h2>

        {openSession ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Currently teaching: {openSession.class}</p>
              <p className="text-xs text-slate-500">Checked in at {formatTime(openSession.check_in)}{openSession.subject ? " • " + openSession.subject : ""}</p>
            </div>
            <button onClick={() => openPinModal("class_out")} className="bg-brand-blue-strong text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90">Check Out</button>
          </div>
        ) : (
          <button onClick={() => openPinModal("class_in")} disabled={!dayRecord?.sign_in_time} className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-40 mb-4">+ Check In to a Class</button>
        )}
        {!dayRecord?.sign_in_time && <p className="text-xs text-amber-600 mb-3">Sign in for the day first before checking into a class.</p>}

        {sessions.length === 0 ? (
          <p className="text-xs text-slate-400">No class sessions recorded today yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-2.5 text-sm">
                <div>
                  <span className="font-medium text-slate-800">{s.class}</span>
                  {s.subject && <span className="text-slate-500"> • {s.subject}</span>}
                </div>
                <div className="text-xs text-slate-500">
                  {formatTime(s.check_in)} — {s.check_out ? formatTime(s.check_out) : <span className="text-green-600 font-medium">In progress</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pinModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="font-semibold text-slate-800 mb-1">
              {pinModal === "sign_in" && "Confirm Sign In"}
              {pinModal === "sign_out" && "Confirm Sign Out"}
              {pinModal === "class_in" && "Check In to Class"}
              {pinModal === "class_out" && "Check Out of " + openSession?.class}
            </h2>
            <p className="text-sm text-slate-500 mb-4">Enter your PIN to confirm.</p>

            {pinModal === "class_in" && (
              <div className="flex flex-col gap-3 mb-4">
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className={inputClass}>
                  <option value="">Select class</option>
                  {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)" className={inputClass} />
              </div>
            )}

            <input type="password" inputMode="numeric" maxLength={6} value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="******" className={inputClass + " tracking-widest text-center mb-3"} />
            {pinError && <p className="text-sm text-red-600 mb-3">{pinError}</p>}

            <div className="flex gap-3">
              <button onClick={confirmPin} disabled={processing} className="flex-1 bg-brand-blue-strong text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{processing ? "..." : "Confirm"}</button>
              <button onClick={() => setPinModal(null)} className="flex-1 border border-slate-300 py-2.5 rounded-lg font-medium hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}