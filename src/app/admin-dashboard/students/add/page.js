"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];
const CLASSES_BY_BRANCH = {
  School: ["Creche", "Nursery 1", "Nursery 2", "KG 1", "KG 2", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"],
  College: ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"],
  Tutorial: ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3", "WAEC", "NECO", "GCE", "JUPEB", "SAT", "TOEFL", "IELTS", "JAMB"],
};
const BRANCHES = ["School", "College", "Tutorial"];
const DEPARTMENTS = ["Art", "Science", "Commercial"];

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

export default function AddStudent() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const [form, setForm] = useState({
    full_name: "", date_of_birth: "", gender: "male", state_of_origin: "",
    class: "", branch: "", department: "", parent_name: "", parent_phone: "",
    address: "", medical_note: "",
  });

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Photo must be under 2MB.");
      return;
    }
    setError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function openCamera() {
    setError("");
    setCameraOpen(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err) {
      setError("Could not access camera: " + err.message + ". Check that your browser has camera permission for this site.");
      setCameraOpen(false);
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCameraReady(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video.videoWidth) {
      setError("Camera not ready yet, wait a second and try again.");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(blob));
      closeCamera();
    }, "image/jpeg", 0.9);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.full_name || !form.class) {
      setError("Full name and class are required.");
      return;
    }

    setSaving(true);
    let photo_url = null;

    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop();
      const fileName = Date.now() + "." + fileExt;
      const { error: uploadError } = await supabase.storage.from("student-photos").upload(fileName, photoFile);
      if (uploadError) {
        setError("Photo upload failed: " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("student-photos").getPublicUrl(fileName);
      photo_url = urlData.publicUrl;
    }

    const { error: insertError } = await supabase.from("students").insert([{ ...form, photo_url }]);
    setSaving(false);

    if (insertError) {
      setError("Could not save student: " + insertError.message);
      return;
    }

    router.push("/admin-dashboard/students");
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Add Student</h1>
        <p className="text-sm text-slate-500 mt-1">Fill in the student's details below to add them to the school register.</p>
      </div>

      {cameraOpen && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <p className="text-sm font-medium text-slate-700 mb-3">Position your face in the frame</p>
            <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
              {!cameraReady && <p className="absolute inset-0 flex items-center justify-center text-white text-sm">Starting camera...</p>}
            </div>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={capturePhoto} disabled={!cameraReady} className="flex-1 bg-brand-blue-strong text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">Capture</button>
              <button type="button" onClick={closeCamera} className="flex-1 border border-slate-300 py-2.5 rounded-lg font-medium hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div className="border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Photo</h2>
          <div className="flex items-center gap-5">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover ring-4 ring-brand-blue" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-blue flex items-center justify-center text-2xl text-brand-blue-strong ring-4 ring-brand-blue">?</div>
            )}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current.click()} className="text-sm border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium">Upload photo</button>
                <button type="button" onClick={openCamera} className="text-sm border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium">Take photo</button>
              </div>
              <p className="text-xs text-slate-400">Max 2MB. JPG, PNG, or WEBP.</p>
              <input ref={fileInputRef} type="file" accept="image/png, image/jpeg, image/webp" onChange={handlePhotoChange} className="hidden" />
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Full Name">
              <input type="text" value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Date of Birth">
              <input type="date" value={form.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Gender">
              <select value={form.gender} onChange={(e) => updateField("gender", e.target.value)} className={inputClass}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="State of Origin">
              <select value={form.state_of_origin} onChange={(e) => updateField("state_of_origin", e.target.value)} className={inputClass}>
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Academic Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Branch">
              <select value={form.branch} onChange={(e) => { updateField("branch", e.target.value); updateField("class", ""); }} className={inputClass}>
                <option value="">Select branch</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Class">
              <select value={form.class} onChange={(e) => updateField("class", e.target.value)} disabled={!form.branch} className={inputClass + (!form.branch ? " opacity-50 cursor-not-allowed" : "")}>
                <option value="">{form.branch ? "Select class" : "Select branch first"}</option>
                {(CLASSES_BY_BRANCH[form.branch] || []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Department">
              <select value={form.department} onChange={(e) => updateField("department", e.target.value)} className={inputClass}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Guardian & Other Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <Field label="Parent/Guardian Name">
              <input type="text" value={form.parent_name} onChange={(e) => updateField("parent_name", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Parent/Guardian Phone">
              <input type="text" value={form.parent_phone} onChange={(e) => updateField("parent_phone", e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="flex flex-col gap-5">
            <Field label="Address">
              <textarea value={form.address} onChange={(e) => updateField("address", e.target.value)} rows={2} className={inputClass}></textarea>
            </Field>
            <Field label="Medical Note" hint="Allergies, conditions, or anything staff should be aware of.">
              <textarea value={form.medical_note} onChange={(e) => updateField("medical_note", e.target.value)} rows={2} className={inputClass}></textarea>
            </Field>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

        <div className="flex gap-3 pb-4">
          <button type="submit" disabled={saving} className="bg-brand-blue-strong text-white px-8 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60 transition">{saving ? "Saving..." : "Save Student"}</button>
          <button type="button" onClick={() => router.push("/admin-dashboard/students")} className="border border-slate-300 text-slate-700 px-8 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition">Cancel</button>
        </div>
      </form>
    </div>
  );
}