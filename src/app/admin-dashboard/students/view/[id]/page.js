"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import * as faceapi from "face-api.js";

const STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];
const CLASSES_BY_BRANCH = {
  School: ["Creche", "Nursery 1", "Nursery 2", "KG 1", "KG 2", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"],
  College: ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"],
  Tutorial: ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3", "WAEC", "NECO", "GCE", "JUPEB", "SAT", "TOEFL", "IELTS", "JAMB"],
};
const BRANCHES = ["School", "College", "Tutorial"];
const DEPARTMENTS = ["Art", "Science", "Commercial"];
const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
const [faceDetected, setFaceDetected] = useState(false);
  const detectIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    async function loadStudent() {
      const { data, error } = await supabase.from("students").select("*").eq("id", id).single();
      if (!error) {
        setStudent(data);
        setForm(data);
      }
      setLoading(false);
    }
    loadStudent();
  }, [id]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("students").update(form).eq("id", id);
    setSaving(false);
    if (!error) {
      setStudent(form);
      setEditing(false);
    }
  }

  async function toggleVerified() {
    const newValue = !student.verified;
    const { error } = await supabase.from("students").update({ verified: newValue }).eq("id", id);
    if (!error) {
      setStudent((prev) => ({ ...prev, verified: newValue }));
      setForm((prev) => ({ ...prev, verified: newValue }));
    }
  }

  async function loadModels() {
    if (modelsLoaded) return;
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
    setModelsLoaded(true);
  }

  async function startScan() {
    setScanStatus("");
    setFaceDetected(false);
    setScanning(true);
    await loadModels();
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;

    detectIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) return;
      const result = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions());
      setFaceDetected(!!result);
    }, 400);
  }

  function stopScan() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    setScanning(false);
    setFaceDetected(false);
  }

  async function captureAndEnroll() {
    setScanStatus("Scanning face...");
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setScanStatus("No face detected. Make sure your face is clearly visible and try again.");
      return;
    }

    const descriptor = Array.from(detection.descriptor);
    const { error } = await supabase.from("students").update({ face_descriptor: descriptor, verified: true }).eq("id", id);

    if (error) {
      setScanStatus("Could not save: " + error.message);
      return;
    }

    setStudent((prev) => ({ ...prev, face_descriptor: descriptor, verified: true }));
    setForm((prev) => ({ ...prev, face_descriptor: descriptor, verified: true }));
    setScanStatus("Face enrolled successfully. Student marked as verified.");
    stopScan();
  }

  if (loading) return <p className="text-slate-500 text-sm">Loading profile...</p>;
  if (!student) return <p className="text-slate-500 text-sm">Student not found.</p>;

  const qrData = typeof window !== "undefined" ? window.location.origin + "/admin-dashboard/students/view/" + id : id;
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(qrData);

  return (
    <div className="max-w-3xl">
      <Link href={"/admin-dashboard/students/" + (student.branch || "").toLowerCase()} className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← Back to list</Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {student.photo_url ? (
            <img src={student.photo_url} alt={student.full_name} className="w-16 h-16 rounded-full object-cover ring-4 ring-brand-blue" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-blue flex items-center justify-center text-xl font-semibold text-brand-blue-strong ring-4 ring-brand-blue">{student.full_name.charAt(0)}</div>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-800">{student.full_name}</h1>
            <p className="text-sm text-slate-500">{student.class} • {student.branch}</p>
          </div>
        </div>
        <span className={"text-xs font-semibold px-3 py-1.5 rounded-full " + (student.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
          {student.verified ? "✓ Verified" : "⚠ Not Verified"}
        </span>
      </div>

      <div className="flex gap-2 border-b border-slate-200 mb-6">
        <button onClick={() => setTab("profile")} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px " + (tab === "profile" ? "border-brand-blue-strong text-brand-blue-strong" : "border-transparent text-slate-500")}>Profile</button>
        <button onClick={() => setTab("idcard")} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px " + (tab === "idcard" ? "border-brand-blue-strong text-brand-blue-strong" : "border-transparent text-slate-500")}>ID Card</button>
        <button onClick={() => setTab("verification")} className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px " + (tab === "verification" ? "border-brand-blue-strong text-brand-blue-strong" : "border-transparent text-slate-500")}>Face Verification</button>
      </div>

      {tab === "profile" && (
        <div className="border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Details</h2>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-sm border border-slate-300 px-4 py-1.5 rounded-lg hover:bg-slate-50 font-medium">Edit</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="text-sm bg-brand-blue-strong text-white px-4 py-1.5 rounded-lg hover:opacity-90 font-medium disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => { setForm(student); setEditing(false); }} className="text-sm border border-slate-300 px-4 py-1.5 rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
              </div>
            )}
          </div>

          {!editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <p><span className="text-slate-500">Date of Birth:</span> <span className="text-slate-800 font-medium">{student.date_of_birth || "-"}</span></p>
              <p><span className="text-slate-500">Gender:</span> <span className="text-slate-800 font-medium capitalize">{student.gender || "-"}</span></p>
              <p><span className="text-slate-500">State of Origin:</span> <span className="text-slate-800 font-medium">{student.state_of_origin || "-"}</span></p>
              <p><span className="text-slate-500">Department:</span> <span className="text-slate-800 font-medium">{student.department || "-"}</span></p>
              <p><span className="text-slate-500">Parent/Guardian:</span> <span className="text-slate-800 font-medium">{student.parent_name || "-"}</span></p>
              <p><span className="text-slate-500">Parent Phone:</span> <span className="text-slate-800 font-medium">{student.parent_phone || "-"}</span></p>
              <p className="md:col-span-2"><span className="text-slate-500">Address:</span> <span className="text-slate-800 font-medium">{student.address || "-"}</span></p>
              <p className="md:col-span-2"><span className="text-slate-500">Medical Note:</span> <span className="text-slate-800 font-medium">{student.medical_note || "-"}</span></p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Full Name"><input type="text" value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} className={inputClass} /></Field>
              <Field label="Date of Birth"><input type="date" value={form.date_of_birth || ""} onChange={(e) => updateField("date_of_birth", e.target.value)} className={inputClass} /></Field>
              <Field label="Gender">
                <select value={form.gender} onChange={(e) => updateField("gender", e.target.value)} className={inputClass}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
              <Field label="State of Origin">
                <select value={form.state_of_origin || ""} onChange={(e) => updateField("state_of_origin", e.target.value)} className={inputClass}>
                  <option value="">Select state</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Branch">
                <select value={form.branch || ""} onChange={(e) => { updateField("branch", e.target.value); updateField("class", ""); }} className={inputClass}>
                  <option value="">Select branch</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Class">
                <select value={form.class || ""} onChange={(e) => updateField("class", e.target.value)} className={inputClass}>
                  <option value="">Select class</option>
                  {(CLASSES_BY_BRANCH[form.branch] || []).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select value={form.department || ""} onChange={(e) => updateField("department", e.target.value)} className={inputClass}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Parent/Guardian Name"><input type="text" value={form.parent_name || ""} onChange={(e) => updateField("parent_name", e.target.value)} className={inputClass} /></Field>
              <Field label="Parent/Guardian Phone"><input type="text" value={form.parent_phone || ""} onChange={(e) => updateField("parent_phone", e.target.value)} className={inputClass} /></Field>
              <Field label="Address"><textarea value={form.address || ""} onChange={(e) => updateField("address", e.target.value)} rows={2} className={inputClass}></textarea></Field>
              <Field label="Medical Note"><textarea value={form.medical_note || ""} onChange={(e) => updateField("medical_note", e.target.value)} rows={2} className={inputClass}></textarea></Field>
            </div>
          )}
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
                <p><span className="text-slate-400">Date of Birth</span><br /><span className="text-slate-700 font-medium">{student.date_of_birth || "-"}</span></p>
                <p><span className="text-slate-400">Guardian</span><br /><span className="text-slate-700 font-medium">{student.parent_name || "-"}</span></p>
                <p><span className="text-slate-400">Phone</span><br /><span className="text-slate-700 font-medium">{student.parent_phone || "-"}</span></p>
              </div>

              <div className="border-t border-dashed border-slate-200 mt-5 pt-3 flex items-center justify-between">
                <p className="text-[10px] text-slate-400">ID: {id.slice(0, 8).toUpperCase()}</p>
                <p className="text-[10px] text-slate-400">shinnystarschools.com</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "verification" && (
        <div className="border border-slate-200 rounded-2xl p-6 max-w-md">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Face Verification</h2>

          {student.face_descriptor ? (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">This student's face has already been enrolled. Re-scanning will replace the saved face data.</div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-3 mb-4">No face data on record yet. Scan the student's face to enroll them for verification and attendance.</div>
          )}

          {!scanning ? (
            <button onClick={startScan} className="bg-brand-blue-strong text-white px-5 py-2.5 rounded-lg font-medium hover:opacity-90">Start Face Scan</button>
          ) : (
            <div>
              <div className={"rounded-xl overflow-hidden bg-slate-900 aspect-video mb-3 border-4 transition-colors " + (faceDetected ? "border-green-500" : "border-transparent")}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
              </div>
              <p className={"text-xs font-medium mb-3 " + (faceDetected ? "text-green-600" : "text-slate-400")}>
                {faceDetected ? "✓ Face detected, ready to capture" : "Position face in the frame..."}
              </p>
              <div className="flex gap-3">
                <button onClick={captureAndEnroll} disabled={!faceDetected} className="flex-1 bg-brand-blue-strong text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">Capture & Enroll</button>
                <button onClick={stopScan} className="flex-1 border border-slate-300 py-2.5 rounded-lg font-medium hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          )}

          {scanStatus && <p className="text-sm text-slate-600 mt-4">{scanStatus}</p>}
        </div>
      )}
    </div>
  );
}