"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as faceapi from "face-api.js";
import jsQR from "jsqr";

const BRANCHES = [
  { key: "School", icon: "🏫", color: "bg-blue-50 text-blue-700" },
  { key: "College", icon: "🎓", color: "bg-purple-50 text-purple-700" },
  { key: "Tutorial", icon: "📘", color: "bg-amber-50 text-amber-700" },
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function AttendancePage() {
  const [topTab, setTopTab] = useState("overview");
  const [who, setWho] = useState("students");

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setWho("students")} className={"text-sm font-medium px-4 py-1.5 rounded-md transition " + (who === "students" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>Students</button>
          <button onClick={() => setWho("teachers")} className={"text-sm font-medium px-4 py-1.5 rounded-md transition " + (who === "teachers" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500")}>Teachers</button>
        </div>
      </div>
      <p className="text-sm text-slate-500 mb-6">Track, review, and record {who} attendance across all sections.</p>

      <div className="flex gap-2 border-b border-slate-200 mb-6">
        <button onClick={() => setTopTab("overview")} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px " + (topTab === "overview" ? "border-brand-blue-strong text-brand-blue-strong" : "border-transparent text-slate-500")}>Overview</button>
        <button onClick={() => setTopTab("remark")} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px " + (topTab === "remark" ? "border-brand-blue-strong text-brand-blue-strong" : "border-transparent text-slate-500")}>Remark</button>
        <button onClick={() => setTopTab("mark")} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px " + (topTab === "mark" ? "border-brand-blue-strong text-brand-blue-strong" : "border-transparent text-slate-500")}>Mark Attendance</button>
      </div>

      {topTab === "overview" && <OverviewTab who={who} />}
      {topTab === "remark" && <RemarkTab who={who} />}
      {topTab === "mark" && <MarkTab who={who} />}
    </div>
  );
}

function OverviewTab({ who }) {
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  const table = who === "students" ? "students" : "teachers";
  const attTable = who === "students" ? "attendance" : "teacher_attendance";
  const idField = who === "students" ? "student_id" : "teacher_id";

  useEffect(() => {
    async function load() {
      setLoading(true);
      const stored = sessionStorage.getItem("shinnystar_user");
      const location = stored ? JSON.parse(stored).location : null;
      const newStats = {};
      for (const b of BRANCHES) {
        const { data: people } = await supabase.from(table).select("id").eq("branch", b.key).eq("location", location);
        const ids = (people || []).map((p) => p.id);
        let present = 0;
        let marked = 0;
        if (ids.length > 0) {
          const { data: att } = await supabase.from(attTable).select("status").eq("attendance_date", date).in(idField, ids);
          marked = (att || []).length;
          present = (att || []).filter((a) => a.status === "present" || a.status === "late").length;
        }
        newStats[b.key] = { total: ids.length, marked, present, percent: marked > 0 ? Math.round((present / marked) * 100) : null };
      }
      setStats(newStats);
      setLoading(false);
    }
    load();
  }, [date, who]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-slate-700">Date:</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading attendance overview...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BRANCHES.map((b) => {
            const s = stats[b.key] || {};
            return (
              <div key={b.key} className="border border-slate-200 rounded-2xl p-6">
                <div className={"w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4 " + b.color}>{b.icon}</div>
                <h3 className="font-semibold text-slate-800 mb-1">{b.key}</h3>
                {s.percent === null ? (
                  <p className="text-sm text-slate-400 mt-3">No attendance marked yet.</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-slate-800 mt-2">{s.percent}%</p>
                    <p className="text-xs text-slate-500 mb-3">{s.present} of {s.marked} marked present ({s.total} total {who})</p>
                    <div className="w-full bg-brand-blue rounded-full h-2.5 overflow-hidden">
                      <div className={"h-2.5 rounded-full " + (s.percent >= 75 ? "bg-green-500" : s.percent >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: s.percent + "%" }}></div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RemarkTab({ who }) {
  const [view, setView] = useState("branches");
  const [branch, setBranch] = useState("");
  const [date, setDate] = useState(todayStr());
  const [classCards, setClassCards] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [activeClass, setActiveClass] = useState("");
  const [roster, setRoster] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const attTable = who === "students" ? "attendance" : "teacher_attendance";
  const idField = who === "students" ? "student_id" : "teacher_id";

  async function openBranch(b) {
    setBranch(b);
    if (who === "students") {
      setView("classes");
      await loadClassCards(b, date);
    } else {
      await openTeacherRoster(b);
    }
  }

  async function loadClassCards(b, d) {
    setLoadingClasses(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data: classes } = await supabase.from("classes").select("*").eq("branch", b).eq("location", location).order("name");
    const cards = [];
    for (const c of classes || []) {
      const { data: students } = await supabase.from("students").select("id").eq("branch", b).eq("class", c.name).eq("location", location);
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

  async function openClass(c) {
    setActiveClass(c);
    setView("roster");
    setLoadingRoster(true);
    setMessage("");

    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data: students } = await supabase.from("students").select("id, full_name, photo_url, parent_phone").eq("branch", branch).eq("class", c).eq("location", location).order("full_name");
    await loadRosterStatus(students || []);
  }

  async function openTeacherRoster(b) {
    setView("roster");
    setActiveClass("");
    setLoadingRoster(true);
    setMessage("");

    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data: teachers } = await supabase.from("teachers").select("id, full_name, photo_url").eq("branch", b).eq("location", location).order("full_name");
    await loadRosterStatus(teachers || []);
  }

  async function loadRosterStatus(people) {
    const ids = people.map((p) => p.id);
    let att = [];
    if (ids.length > 0) {
      const { data } = await supabase.from(attTable).select(idField + ", status").eq("attendance_date", date).in(idField, ids);
      att = data || [];
    }
    const initial = {};
    people.forEach((p) => {
      const found = att.find((a) => a[idField] === p.id);
      initial[p.id] = found ? found.status : "not marked";
    });
    setRoster(people);
    setStatusMap(initial);
    setLoadingRoster(false);
  }

  function setStatus(personId, status) {
    setStatusMap((prev) => ({ ...prev, [personId]: status }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const rows = roster.filter((p) => statusMap[p.id] !== "not marked").map((p) => ({
      [idField]: p.id,
      attendance_date: date,
      status: statusMap[p.id],
    }));
    const conflictKey = idField + ",attendance_date";
    const { error } = await supabase.from(attTable).upsert(rows, { onConflict: conflictKey });
    setSaving(false);
    setMessage(error ? "Could not save: " + error.message : "Changes saved.");

    if (!error && who === "students") {
      const absentRows = rows.filter((r) => r.status === "absent");
      absentRows.forEach((r) => {
        const student = roster.find((p) => p.id === r.student_id);
        if (student && student.parent_phone) {
          fetch("/api/send-attendance-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phoneNumber: student.parent_phone,
              studentName: student.full_name,
              status: "absent",
              date,
              className: activeClass,
            }),
          }).catch(() => {});
        }
      });
    }
  }

  return (
    <div>
      {view !== "branches" && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
          <button onClick={() => setView("branches")} className="hover:text-brand-blue-strong hover:underline">Sections</button>
          <span>/</span>
          {who === "students" && view === "roster" ? (
            <button onClick={() => setView("classes")} className="hover:text-brand-blue-strong hover:underline">{branch}</button>
          ) : (
            <span className="text-slate-800 font-medium">{branch}</span>
          )}
          {who === "students" && view === "roster" && <span>/</span>}
          {who === "students" && view === "roster" && <span className="text-slate-800 font-medium">{activeClass}</span>}
        </div>
      )}

      {view === "branches" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BRANCHES.map((b) => (
            <button key={b.key} onClick={() => openBranch(b.key)} className="border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left">
              <div className={"w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 " + b.color}>{b.icon}</div>
              <h2 className="text-lg font-semibold text-slate-800">{b.key}</h2>
              <p className="text-sm text-brand-blue-strong font-medium mt-4">{who === "students" ? "View classes →" : "View teachers →"}</p>
            </button>
          ))}
        </div>
      )}

      {view === "classes" && who === "students" && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <label className="text-sm font-medium text-slate-700">Date:</label>
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); loadClassCards(branch, e.target.value); }} className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
          </div>
          {loadingClasses ? (
            <p className="text-slate-500 text-sm">Loading classes...</p>
          ) : classCards.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
              <p className="text-slate-500 text-sm">No classes found for {branch}.</p>
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
          {who === "teachers" && (
            <div className="flex items-center gap-3 mb-5">
              <label className="text-sm font-medium text-slate-700">Date:</label>
              <input type="date" value={date} onChange={(e) => { setDate(e.target.value); openTeacherRoster(branch); }} className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong" />
            </div>
          )}
          {loadingRoster ? (
            <p className="text-slate-500 text-sm">Loading roster...</p>
          ) : roster.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
              <p className="text-slate-500 text-sm">No {who} found here.</p>
            </div>
          ) : (
            <>
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-5">
                <table className="w-full text-sm">
                  <thead className="bg-brand-blue text-slate-700">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">{who === "students" ? "Student" : "Teacher"}</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((p) => (
                      <tr key={p.id} className="border-t border-slate-200">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {p.photo_url ? (
                              <img src={p.photo_url} alt={p.full_name} className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-blue" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-xs font-semibold text-brand-blue-strong">{p.full_name.charAt(0)}</div>
                            )}
                            <span className="font-medium text-slate-800">{p.full_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => setStatus(p.id, "present")} className={"text-xs font-medium px-3 py-1.5 rounded-full " + (statusMap[p.id] === "present" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600")}>Present</button>
                            <button onClick={() => setStatus(p.id, "late")} className={"text-xs font-medium px-3 py-1.5 rounded-full " + (statusMap[p.id] === "late" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600")}>Late</button>
                            <button onClick={() => setStatus(p.id, "absent")} className={"text-xs font-medium px-3 py-1.5 rounded-full " + (statusMap[p.id] === "absent" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600")}>Absent</button>
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

function MarkTab({ who }) {
  const [method, setMethod] = useState("face");
  const [allPeople, setAllPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
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

  const table = who === "students" ? "students" : "teachers";
  const attTable = who === "students" ? "attendance" : "teacher_attendance";
  const idField = who === "students" ? "student_id" : "teacher_id";
  const viewPath = who === "students" ? "students" : "teachers";

  useEffect(() => {
    async function loadAll() {
      setLoadingPeople(true);
      const stored = sessionStorage.getItem("shinnystar_user");
      const location = stored ? JSON.parse(stored).location : null;
      const select = who === "students" ? "id, full_name, photo_url, class, branch, face_descriptor, guardian_email" : "id, full_name, photo_url, branch, face_descriptor";
      const { data } = await supabase.from(table).select(select).eq("location", location);
      setAllPeople(data || []);
      setLoadingPeople(false);
    }
    loadAll();
    lastMarkedRef.current = {};
    setMarkedList([]);
    return () => stopScan();
  }, [who]);

  async function loadModels() {
    if (modelsLoaded) return;
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
    setModelsLoaded(true);
  }

  async function markPresent(person) {
    if (lastMarkedRef.current[person.id]) return;
    lastMarkedRef.current[person.id] = true;

    const today = todayStr();
    const row = { [idField]: person.id, attendance_date: today, status: "present" };
    await supabase.from(attTable).upsert([row], { onConflict: idField + ",attendance_date" });

    setMarkedList((prev) => [{ ...person, time: new Date().toLocaleTimeString() }, ...prev]);
    setScanMessage(person.full_name + " marked present.");
    setTimeout(() => setScanMessage(""), 3000);

    if (who === "students" && person.guardian_email) {
      fetch("/api/send-attendance-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guardianEmail: person.guardian_email,
          studentName: person.full_name,
          status: "present",
          date: today,
          className: person.class,
        }),
      }).catch(() => {});
    }
  }

  async function startFaceScan() {
    setScanMessage("");
    setScanning(true);
    setFaceReady(false);
    await loadModels();
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => setFaceReady(true);
    }

    const enrolled = allPeople.filter((p) => p.face_descriptor);

    loopRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4 || enrolled.length === 0) return;
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) return;

      let bestMatch = null;
      let bestDistance = 999;
      enrolled.forEach((p) => {
        const distance = faceapi.euclideanDistance(detection.descriptor, p.face_descriptor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = p;
        }
      });

      if (bestMatch && bestDistance < 0.55) {
        markPresent(bestMatch);
      }
    }, 800);
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
        const match = code.data.match(new RegExp(viewPath + "/view/([a-f0-9-]+)", "i"));
        if (match) {
          const personId = match[1];
          const person = allPeople.find((p) => p.id === personId);
          if (person) markPresent(person);
        }
      }
    }, 400);
  }

  function stopScan() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
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

  const enrolledCount = allPeople.filter((p) => p.face_descriptor).length;
  const personLabel = who === "students" ? "student" : "teacher";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="flex gap-2 mb-5 bg-slate-100 p-1.5 rounded-xl w-fit">
          <button onClick={() => switchMethod("face")} className={"flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all " + (method === "face" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <span>📷</span> Face Scan
          </button>
          <button onClick={() => switchMethod("qr")} className={"flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all " + (method === "qr" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <span>▦</span> ID Card / QR Scan
          </button>
          <button onClick={() => switchMethod("pin")} className={"flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all " + (method === "pin" ? "bg-white text-brand-blue-strong shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            <span>🔢</span> PIN
          </button>
        </div>

        <div className="border border-slate-200 rounded-2xl p-6 bg-white">
          {method === "face" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-slate-800">Face Recognition</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{loadingPeople ? "Loading..." : enrolledCount + " " + who + " enrolled for face scan"}</p>
                </div>
              </div>

              {!scanning ? (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <div className="w-16 h-16 rounded-full bg-brand-blue flex items-center justify-center text-3xl mb-4">📷</div>
                  <p className="text-sm text-slate-500 mb-4">Ready to scan {personLabel} faces</p>
                  <button onClick={startScan} className="bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 shadow-sm">Start Face Scan</button>
                </div>
              ) : (
                <div>
                  <div className={"relative rounded-2xl overflow-hidden bg-slate-900 aspect-video mb-4 border-4 transition-colors " + (faceReady ? "border-brand-blue-strong" : "border-transparent")}>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                    {!faceReady && <p className="absolute inset-0 flex items-center justify-center text-white text-sm bg-slate-900/50">Starting camera...</p>}
                    {faceReady && <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Scanning</div>}
                  </div>
                  <button onClick={stopScan} className="border border-slate-300 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-50">Stop Scanning</button>
                </div>
              )}
            </div>
          )}

          {method === "qr" && (
            <div>
              <div className="mb-4">
                <h2 className="font-semibold text-slate-800">ID Card / QR Scan</h2>
                <p className="text-xs text-slate-500 mt-0.5">Point the camera at a {personLabel}'s ID card QR code</p>
              </div>

              {!scanning ? (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <div className="w-16 h-16 rounded-full bg-brand-blue flex items-center justify-center text-3xl mb-4">▦</div>
                  <p className="text-sm text-slate-500 mb-4">Ready to scan ID cards</p>
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

          {method === "pin" && (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-3xl mb-4">🔢</div>
              <p className="text-sm font-medium text-slate-700 mb-1">PIN Attendance</p>
              <p className="text-xs text-slate-500 text-center max-w-xs">Coming soon — every {personLabel} already has a PIN, this screen just needs a number pad wired up next.</p>
            </div>
          )}

          {scanMessage && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
              <span>✓</span> {scanMessage}
            </div>
          )}
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl p-5 bg-white h-fit">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Marked Today ({markedList.length})</h2>
        {markedList.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs text-slate-400">No {who} marked yet in this session.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto">
            {markedList.map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.full_name} className="w-9 h-9 rounded-full object-cover ring-2 ring-white" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-xs font-semibold text-green-700">{p.full_name.charAt(0)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.full_name}</p>
                  <p className="text-[10px] text-slate-500">{who === "students" ? p.class + " • " : ""}{p.time}</p>
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