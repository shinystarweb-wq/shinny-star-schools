"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as faceapi from "face-api.js";
import jsQR from "jsqr";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function TeacherAttendancePage() {
  const [teacher, setTeacher] = useState(null);
  const [topTab, setTopTab] = useState("overview");

  useEffect(() => {
    const stored = sessionStorage.getItem("shinnystar_user");
    if (stored) setTeacher(JSON.parse(stored));
  }, []);

  if (!teacher) return <p className="text-slate-500 text-sm">Loading...</p>;

  const isSchool = teacher.branch === "School";

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Attendance</h1>
      <p className="text-sm text-slate-500 mb-6">{teacher.branch} Section</p>

      {isSchool ? (
        <>
          <div className="flex gap-2 border-b border-slate-200 mb-6">
            <button onClick={() => setTopTab("overview")} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px " + (topTab === "overview" ? "border-brand-blue-strong text-brand-blue-strong" : "border-transparent text-slate-500")}>Overview</button>
            <button onClick={() => setTopTab("remark")} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px " + (topTab === "remark" ? "border-brand-blue-strong text-brand-blue-strong" : "border-transparent text-slate-500")}>Remark</button>
            <button onClick={() => setTopTab("mark")} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px " + (topTab === "mark" ? "border-brand-blue-strong text-brand-blue-strong" : "border-transparent text-slate-500")}>Mark Attendance</button>
          </div>
          {topTab === "overview" && <OverviewTab branch={teacher.branch} />}
          {topTab === "remark" && <RemarkTab branch={teacher.branch} />}
          {topTab === "mark" && <MarkTab branch={teacher.branch} />}
        </>
      ) : (
        <SubjectAttendanceTab teacher={teacher} />
      )}
    </div>
  );
}

function SubjectAttendanceTab({ teacher }) {
  const [step, setStep] = useState("select");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [date] = useState(todayStr());
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const assignments = teacher.assignedClasses || [];
  const uniqueClasses = [...new Set(assignments.map((a) => a.class))];

  function subjectsForClass(className) {
    return [...new Set(assignments.filter((a) => a.class === className && a.subject).map((a) => a.subject))];
  }

  async function loadRoster() {
    setLoading(true);
    setMessage("");

    const assignmentForClass = assignments.find((a) => a.class === selectedClass && a.department);
    let query = supabase.from("students").select("id, full_name, photo_url, department")
      .eq("branch", teacher.branch).eq("class", selectedClass).eq("location", teacher.location);
    if (assignmentForClass) query = query.eq("department", assignmentForClass.department);

    const { data: studentData } = await query.order("full_name");
    const ids = (studentData || []).map((s) => s.id);

    let existing = [];
    if (ids.length > 0) {
      const { data } = await supabase.from("subject_attendance").select("student_id, status")
        .eq("subject", selectedSubject).eq("class", selectedClass).eq("attendance_date", date).in("student_id", ids);
      existing = data || [];
    }

    const initial = {};
    (studentData || []).forEach((s) => {
      const found = existing.find((e) => e.student_id === s.id);
      initial[s.id] = found ? found.status : "absent";
    });

    setStudents(studentData || []);
    setStatusMap(initial);
    setLoading(false);
    setStep("roster");
  }

  function toggleStatus(studentId) {
    setStatusMap((prev) => ({ ...prev, [studentId]: prev[studentId] === "present" ? "absent" : "present" }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const rows = students.map((s) => ({
      student_id: s.id, teacher_id: teacher.id, branch: teacher.branch, location: teacher.location,
      class: selectedClass, subject: selectedSubject, attendance_date: date, status: statusMap[s.id] || "absent",
    }));
    const { error } = await supabase.from("subject_attendance").upsert(rows, { onConflict: "student_id,subject,attendance_date" });
    setSaving(false);
    setMessage(error ? "Could not save: " + error.message : "Attendance saved for " + selectedSubject + ", " + selectedClass + ".");
  }

  const presentCount = students.filter((s) => statusMap[s.id] === "present").length;

  if (uniqueClasses.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
        <p className="text-slate-500 text-sm">You haven't been assigned to any classes yet. Contact your admin.</p>
      </div>
    );
  }

  return (
    <div>
      {step === "roster" && (
        <button onClick={() => setStep("select")} className="text-sm text-brand-blue-strong font-medium mb-5 inline-block hover:underline">← Change Class/Subject</button>
      )}

      {step === "select" && (
        <div className="border border-slate-200 rounded-2xl p-6 max-w-lg">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Select Class & Subject</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject(""); }} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong">
                <option value="">Select class</option>
                {uniqueClasses.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={!selectedClass} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong disabled:opacity-50">
                <option value="">Select subject</option>
                {subjectsForClass(selectedClass).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={loadRoster} disabled={!selectedClass || !selectedSubject || loading} className="self-start bg-brand-blue-strong text-white px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">{loading ? "Loading..." : "Continue"}</button>
          </div>
        </div>
      )}

      {step === "roster" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800">{selectedSubject} — {selectedClass}</h2>
              <p className="text-xs text-slate-500">{date} • {presentCount} of {students.length} present</p>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center"><p className="text-slate-500 text-sm">No students found for this class.</p></div>
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-5">
                {students.map((s) => {
                  const isPresent = statusMap[s.id] === "present";
                  return (
                    <button key={s.id} onClick={() => toggleStatus(s.id)} className={"flex items-center justify-between border rounded-xl px-4 py-3 transition text-left " + (isPresent ? "border-green-300 bg-green-50" : "border-slate-200 hover:bg-slate-50")}>
                      <div className="flex items-center gap-3">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt={s.full_name} className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-blue" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-xs font-semibold text-brand-blue-strong">{s.full_name.charAt(0)}</div>
                        )}
                        <span className="font-medium text-slate-800">{s.full_name}</span>
                      </div>
                      <span className={"text-xs font-semibold px-3 py-1.5 rounded-full " + (isPresent ? "bg-green-600 text-white" : "bg-slate-100 text-slate-500")}>{isPresent ? "✓ Present" : "Absent"}</span>
                    </button>
                  );
                })}
              </div>
              {message && <p className="text-sm text-slate-600 mb-3">{message}</p>}
              <button onClick={handleSave} disabled={saving} className="bg-brand-blue-strong text-white px-8 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Saving..." : "Save Attendance"}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function OverviewTab({ branch }) {
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [stat, setStat] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: students } = await supabase.from("students").select("id").eq("branch", branch);
      const ids = (students || []).map((s) => s.id);
      let present = 0, marked = 0;
      if (ids.length > 0) {
        const { data: att } = await supabase.from("attendance").select("status").eq("attendance_date", date).in("student_id", ids);
        marked = (att || []).length;
        present = (att || []).filter((a) => a.status === "present" || a.status === "late").length;
      }
      setStat({ total: ids.length, marked, present, percent: marked > 0 ? Math.round((present / marked) * 100) : null });
      setLoading(false);
    }
    load();
  }, [date, branch]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-slate-700">Date:</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        <div className="border border-slate-200 rounded-2xl p-6 max-w-sm">
          <h3 className="font-semibold text-slate-800 mb-1">{branch}</h3>
          {stat.percent === null ? (
            <p className="text-sm text-slate-400 mt-3">No attendance marked yet.</p>
          ) : (
            <>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stat.percent}%</p>
              <p className="text-xs text-slate-500 mb-3">{stat.present} of {stat.marked} marked present ({stat.total} total students)</p>
              <div className="w-full bg-brand-blue rounded-full h-2.5 overflow-hidden">
                <div className={"h-2.5 rounded-full " + (stat.percent >= 75 ? "bg-green-500" : stat.percent >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: stat.percent + "%" }}></div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RemarkTab({ branch }) {
  const [view, setView] = useState("classes");
  const [date, setDate] = useState(todayStr());
  const [classCards, setClassCards] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [activeClass, setActiveClass] = useState("");
  const [roster, setRoster] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadClassCards(d) {
    setLoadingClasses(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const user = stored ? JSON.parse(stored) : null;
    const assignedClassNames = [...new Set((user?.assignedClasses || []).map((a) => a.class))];

    let classes = [];
    if (assignedClassNames.length > 0) {
      const { data } = await supabase.from("classes").select("*").eq("branch", branch).in("name", assignedClassNames).order("name");
      classes = data || [];
    }
    const cards = [];
    for (const c of classes) {
      const { data: students } = await supabase.from("students").select("id").eq("branch", branch).eq("class", c.name);
      const ids = (students || []).map((s) => s.id);
      let present = 0, late = 0, absent = 0;
      if (ids.length > 0) {
        const { data: att } = await supabase.from("attendance").select("status").eq("attendance_date", d).in("student_id", ids);
        present = (att || []).filter((a) => a.status === "present").length;
        late = (att || []).filter((a) => a.status === "late").length;
        absent = (att || []).filter((a) => a.status === "absent").length;
      }
      cards.push({ name: c.name, total: ids.length, present, late, absent });
    }
    setClassCards(cards);
    setLoadingClasses(false);
  }

  useEffect(() => { loadClassCards(date); }, [branch]);

  async function openClass(c) {
    setActiveClass(c);
    setView("roster");
    setLoadingRoster(true);
    setMessage("");

    const { data: students } = await supabase.from("students").select("id, full_name, photo_url").eq("branch", branch).eq("class", c).order("full_name");
    const ids = (students || []).map((s) => s.id);
    let att = [];
    if (ids.length > 0) {
      const { data } = await supabase.from("attendance").select("student_id, status").eq("attendance_date", date).in("student_id", ids);
      att = data || [];
    }
    const initial = {};
    (students || []).forEach((s) => {
      const found = att.find((a) => a.student_id === s.id);
      initial[s.id] = found ? found.status : "not marked";
    });
    setRoster(students || []);
    setStatusMap(initial);
    setLoadingRoster(false);
  }

  function setStatus(studentId, status) {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const rows = roster.filter((s) => statusMap[s.id] !== "not marked").map((s) => ({
      student_id: s.id, attendance_date: date, status: statusMap[s.id],
    }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,attendance_date" });
    setSaving(false);
    setMessage(error ? "Could not save: " + error.message : "Changes saved.");
  }

  return (
    <div>
      {view === "roster" && (
        <button onClick={() => setView("classes")} className="text-sm text-brand-blue-strong font-medium mb-5 inline-block hover:underline">← All Classes</button>
      )}

      {view === "classes" && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <label className="text-sm font-medium text-slate-700">Date:</label>
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); loadClassCards(e.target.value); }} className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
          </div>
          {loadingClasses ? (
            <p className="text-slate-500 text-sm">Loading classes...</p>
          ) : classCards.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
              <p className="text-slate-500 text-sm">No classes found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {classCards.map((c) => (
                <button key={c.name} onClick={() => openClass(c.name)} className="border border-slate-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left">
                  <h3 className="font-semibold text-slate-800 mb-3">{c.name}</h3>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">{c.present} Present</span>
                    <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-medium">{c.late} Late</span>
                    <span className="bg-red-50 text-red-700 px-2 py-1 rounded-full font-medium">{c.absent} Absent</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">{c.total} total students</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "roster" && (
        <div>
          <h2 className="font-semibold text-slate-800 mb-4">{activeClass}</h2>
          {loadingRoster ? (
            <p className="text-slate-500 text-sm">Loading roster...</p>
          ) : roster.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
              <p className="text-slate-500 text-sm">No students in this class.</p>
            </div>
          ) : (
            <>
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-5">
                <table className="w-full text-sm">
                  <thead className="bg-brand-blue text-slate-700">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Student</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => (
                      <tr key={s.id} className="border-t border-slate-200">
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
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => setStatus(s.id, "present")} className={"text-xs font-medium px-3 py-1.5 rounded-full " + (statusMap[s.id] === "present" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600")}>Present</button>
                            <button onClick={() => setStatus(s.id, "late")} className={"text-xs font-medium px-3 py-1.5 rounded-full " + (statusMap[s.id] === "late" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600")}>Late</button>
                            <button onClick={() => setStatus(s.id, "absent")} className={"text-xs font-medium px-3 py-1.5 rounded-full " + (statusMap[s.id] === "absent" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600")}>Absent</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {message && <p className="text-sm text-slate-600 mb-3">{message}</p>}
              <button onClick={handleSave} disabled={saving} className="bg-brand-blue-strong text-white px-8 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MarkTab({ branch }) {
  const [method, setMethod] = useState("face");
  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [markedList, setMarkedList] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceReady, setFaceReady] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const lastMarkedRef = useRef({});

  useEffect(() => {
    async function loadAll() {
      const { data } = await supabase.from("students").select("id, full_name, photo_url, class, branch, face_descriptor, guardian_email").eq("branch", branch);
      setAllStudents(data || []);
      setLoadingStudents(false);
    }
    loadAll();
    return () => stopScan();
  }, [branch]);

  async function loadModels() {
    if (modelsLoaded) return;
    await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
    setModelsLoaded(true);
  }

  async function markPresent(student) {
    if (lastMarkedRef.current[student.id]) return;
    lastMarkedRef.current[student.id] = true;

    const today = todayStr();
    await supabase.from("attendance").upsert([{ student_id: student.id, attendance_date: today, status: "present" }], { onConflict: "student_id,attendance_date" });

    setMarkedList((prev) => [{ ...student, time: new Date().toLocaleTimeString() }, ...prev]);
    setScanMessage(student.full_name + " marked present.");
    setTimeout(() => setScanMessage(""), 3000);

    if (student.guardian_email) {
      fetch("/api/send-attendance-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guardianEmail: student.guardian_email, studentName: student.full_name, status: "present", date: today, className: student.class }),
      }).catch(() => {});
    }
  }

  async function startFaceScan() {
    setScanMessage("");
    setScanning(true);
    setFaceReady(false);
    await loadModels();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => setFaceReady(true);
    }

    const enrolled = allStudents.filter((s) => s.face_descriptor);
    let pendingMatch = null;
    let pendingCount = 0;

    loopRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4 || enrolled.length === 0) return;
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        pendingMatch = null;
        pendingCount = 0;
        return;
      }

      const distances = enrolled.map((s) => ({
        student: s,
        distance: faceapi.euclideanDistance(detection.descriptor, s.face_descriptor),
      })).sort((a, b) => a.distance - b.distance);

      const best = distances[0];
      const secondBest = distances[1];

      const isConfident = best && best.distance < 0.42 && (!secondBest || secondBest.distance - best.distance > 0.08);

      if (isConfident) {
        if (pendingMatch === best.student.id) {
          pendingCount++;
        } else {
          pendingMatch = best.student.id;
          pendingCount = 1;
        }

        if (pendingCount >= 3) {
          markPresent(best.student);
          pendingMatch = null;
          pendingCount = 0;
        }
      } else {
        pendingMatch = null;
        pendingCount = 0;
      }
    }, 700);
  }

  async function startQrScan() {
    setScanMessage("");
    setScanning(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;

    loopRef.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState !== 4) return;
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        const match = code.data.match(/view\/([a-f0-9-]+)/i);
        if (match) {
          const student = allStudents.find((s) => s.id === match[1]);
          if (student) markPresent(student);
        }
      }
    }, 400);
  }

  function stopScan() {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    setScanning(false);
    setFaceReady(false);
  }

  function switchMethod(m) {
    stopScan();
    setMethod(m);
    setScanMessage("");
  }

  function startScan() {
    if (method === "face") startFaceScan();
    if (method === "qr") startQrScan();
  }

  const enrolledCount = allStudents.filter((s) => s.face_descriptor).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="flex gap-2 mb-5 bg-slate-100 p-1.5 rounded-xl w-fit flex-wrap">
          <button onClick={() => switchMethod("face")} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (method === "face" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>📷 Face Scan</button>
          <button onClick={() => switchMethod("qr")} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (method === "qr" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>▦ ID Card / QR</button>
          <button onClick={() => switchMethod("list")} className={"text-sm font-medium px-4 py-2 rounded-lg transition " + (method === "list" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>📋 List</button>
        </div>

        <div className="border border-slate-200 rounded-2xl p-6 bg-white">
          {method === "face" && (
            <div>
              <p className="text-xs text-slate-500 mb-4">{loadingStudents ? "Loading..." : enrolledCount + " students enrolled for face scan"}</p>
              {!scanning ? (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <div className="w-16 h-16 rounded-full bg-brand-blue flex items-center justify-center text-3xl mb-4">📷</div>
                  <button onClick={startScan} className="bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 shadow-sm">Start Face Scan</button>
                </div>
              ) : (
                <div>
                  <div className={"relative rounded-2xl overflow-hidden bg-slate-900 aspect-video mb-4 border-4 " + (faceReady ? "border-brand-blue-strong" : "border-transparent")}>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                    {faceReady && <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Scanning</div>}
                  </div>
                  <button onClick={stopScan} className="border border-slate-300 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-50">Stop Scanning</button>
                </div>
              )}
            </div>
          )}

          {method === "qr" && (
            <div>
              {!scanning ? (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <div className="w-16 h-16 rounded-full bg-brand-blue flex items-center justify-center text-3xl mb-4">▦</div>
                  <button onClick={startScan} className="bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 shadow-sm">Start QR Scan</button>
                </div>
              ) : (
                <div>
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video mb-4 border-4 border-brand-blue-strong">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                    <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Scanning</div>
                  </div>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  <button onClick={stopScan} className="border border-slate-300 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-50">Stop Scanning</button>
                </div>
              )}
            </div>
          )}

          {method === "list" && (
            <ListMarkPanel branch={branch} allStudents={allStudents} onMarked={(student) => {
              setMarkedList((prev) => [{ ...student, time: new Date().toLocaleTimeString() }, ...prev]);
            }} />
          )}

          {scanMessage && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">✓ {scanMessage}</div>}
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl p-5 bg-white h-fit">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Marked Today ({markedList.length})</h2>
        {markedList.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-10">No students marked yet.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
            {markedList.map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                {s.photo_url ? <img src={s.photo_url} alt={s.full_name} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-xs font-semibold text-green-700">{s.full_name.charAt(0)}</div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.full_name}</p>
                  <p className="text-[10px] text-slate-500">{s.class} • {s.time}</p>
                </div>
                <span className="text-green-600 text-sm">✓</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function ListMarkPanel({ branch, allStudents, onMarked }) {
  const [classFilter, setClassFilter] = useState("");
  const [search, setSearch] = useState("");
  const [statusMap, setStatusMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const classOptions = [...new Set(allStudents.map((s) => s.class))].sort();
  const filtered = allStudents.filter((s) => {
    if (classFilter && s.class !== classFilter) return false;
    if (search.trim() && !s.full_name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  function toggleStatus(studentId) {
    setStatusMap((prev) => ({ ...prev, [studentId]: prev[studentId] === "present" ? "absent" : "present" }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const today = todayStr();
    const marked = Object.entries(statusMap).filter(([, status]) => status);
    if (marked.length === 0) {
      setMessage("Mark at least one student first.");
      setSaving(false);
      return;
    }

    const rows = marked.map(([studentId, status]) => ({ student_id: studentId, attendance_date: today, status }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,attendance_date" });
    setSaving(false);

    if (error) {
      setMessage("Could not save: " + error.message);
      return;
    }

    marked.forEach(([studentId, status]) => {
      if (status === "present") {
        const student = allStudents.find((s) => s.id === studentId);
        if (student) onMarked(student);
      }
    });

    setMessage("Attendance saved for " + marked.length + " students.");
    setStatusMap({});
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="flex-1 min-w-[180px] border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong">
          <option value="">All Classes</option>
          {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">No students found.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto mb-4">
          {filtered.map((s) => {
            const status = statusMap[s.id];
            return (
              <div key={s.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-2.5">
                <div className="flex items-center gap-3">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.full_name} className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-blue" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-xs font-semibold text-brand-blue-strong">{s.full_name.charAt(0)}</div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.full_name}</p>
                    <p className="text-xs text-slate-400">{s.class}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleStatus(s.id)} className={"text-xs font-medium px-3 py-1.5 rounded-full " + (status === "present" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600")}>Present</button>
                  <button onClick={() => setStatusMap((prev) => ({ ...prev, [s.id]: prev[s.id] === "absent" ? undefined : "absent" }))} className={"text-xs font-medium px-3 py-1.5 rounded-full " + (status === "absent" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600")}>Absent</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {message && <p className="text-sm text-slate-600 mb-3">{message}</p>}
      <button onClick={handleSave} disabled={saving} className="bg-brand-blue-strong text-white px-8 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Saving..." : "Save Attendance"}</button>
    </div>
  );
}