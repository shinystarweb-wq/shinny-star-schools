"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const MAX_UPLOAD_MB = 2;

async function compressImage(file, maxSizeMB) {
  if (file.size <= maxSizeMB * 1024 * 1024) return file;

  const bitmap = await createImageBitmap(file);
  let quality = 0.8;
  let width = bitmap.width;
  let height = bitmap.height;

  const maxDimension = 1600;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);

  let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

  while (blob && blob.size > maxSizeMB * 1024 * 1024 && quality > 0.3) {
    quality -= 0.1;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
}

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [student, setStudent] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  const [answerText, setAnswerText] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setStudent(user);

      const { data: assignmentData } = await supabase.from("assignments").select("*").eq("id", id).single();
      const { data: subData } = await supabase.from("assignment_submissions").select("*").eq("assignment_id", id).eq("student_id", user.id).maybeSingle();

      setAssignment(assignmentData);
      setExistingSubmission(subData);
      if (subData?.answer_text) setAnswerText(subData.answer_text);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleFileSelect(e) {
    const selected = e.target.files[0];
    if (!selected) return;
    await processFile(selected);
  }

  async function processFile(selected) {
    setError("");
    setNotice("");

    const isImage = selected.type.startsWith("image/");
    const maxAllowed = isImage ? 10 : 10;

    if (selected.size > maxAllowed * 1024 * 1024) {
      setError("File is too large. Max 10MB.");
      return;
    }

    if (isImage && selected.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setCompressing(true);
      setNotice("Compressing image...");
      try {
        const compressed = await compressImage(selected, MAX_UPLOAD_MB);
        setFile(compressed);
        setFilePreview(URL.createObjectURL(compressed));
        setNotice("Image compressed from " + (selected.size / 1024 / 1024).toFixed(1) + "MB to " + (compressed.size / 1024 / 1024).toFixed(1) + "MB.");
      } catch (err) {
        setError("Could not compress image: " + err.message);
      }
      setCompressing(false);
    } else {
      setFile(selected);
      setFilePreview(isImage ? URL.createObjectURL(selected) : null);
    }
  }

  async function openCamera() {
    setError("");
    setCameraOpen(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err) {
      setError("Could not access camera: " + err.message);
      setCameraOpen(false);
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCameraReady(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      const capturedFile = new File([blob], "capture-" + Date.now() + ".jpg", { type: "image/jpeg" });
      closeCamera();
      await processFile(capturedFile);
    }, "image/jpeg", 0.92);
  }

  async function handleSubmit() {
    setError("");
    if (!answerText.trim() && !file) {
      setError("Type an answer or attach a file/photo before submitting.");
      return;
    }
    setSubmitting(true);

    let file_url = existingSubmission?.file_url || null;
    let file_name = existingSubmission?.file_name || null;

    if (file) {
      const ext = file.name.split(".").pop();
      const path = student.id + "-" + Date.now() + "." + ext;
      const { error: uploadError } = await supabase.storage.from("assignment-files").upload(path, file);
      if (uploadError) {
        setError("Upload failed: " + uploadError.message);
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("assignment-files").getPublicUrl(path);
      file_url = urlData.publicUrl;
      file_name = file.name;
    }

    const { error: insertError } = await supabase.from("assignment_submissions").upsert([{
      assignment_id: id, student_id: student.id, answer_text: answerText || null,
      file_url, file_name, submitted_at: new Date().toISOString(),
    }], { onConflict: "assignment_id,student_id" });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/student-dashboard/assignments");
  }

  if (loading) return <p className="text-slate-500 text-sm">Loading assignment...</p>;
  if (!assignment) return <p className="text-slate-500 text-sm">Assignment not found.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">{assignment.title}</h1>
      <p className="text-sm text-slate-500 mb-6">{assignment.subject} {assignment.due_date ? "• Due " + assignment.due_date : ""}</p>

      <div className="border border-slate-200 rounded-2xl p-6 mb-6">
        {assignment.instructions && <p className="text-sm text-slate-600 mb-3">{assignment.instructions}</p>}
        {assignment.questions && <p className="text-sm text-slate-700 whitespace-pre-wrap border-t border-slate-100 pt-3">{assignment.questions}</p>}
      </div>

      {existingSubmission && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-6">
          You already submitted this on {new Date(existingSubmission.submitted_at).toLocaleString()}. Submitting again will replace your previous answer.
          {existingSubmission.score !== null && existingSubmission.score !== undefined && <p className="font-semibold mt-1">Score: {existingSubmission.score}</p>}
        </div>
      )}

      {cameraOpen && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <p className="text-sm font-medium text-slate-700 mb-3">Position your work in the frame</p>
            <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
              {!cameraReady && <p className="absolute inset-0 flex items-center justify-center text-white text-sm">Starting camera...</p>}
            </div>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="flex gap-3 mt-4">
              <button onClick={capturePhoto} disabled={!cameraReady} className="flex-1 bg-brand-blue-strong text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">Capture</button>
              <button onClick={closeCamera} className="flex-1 border border-slate-300 py-2.5 rounded-lg font-medium hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Typed Answer (optional)</label>
          <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} rows={6} placeholder="Type your answer here..." className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong"></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Attach File or Photo (optional)</label>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => fileInputRef.current.click()} className="text-sm border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium">Upload File</button>
            <button type="button" onClick={openCamera} className="text-sm border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium">Take Photo</button>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,image/*" onChange={handleFileSelect} className="hidden" />
          </div>
          <p className="text-xs text-slate-400 mt-1">PDF, Word, or photo. Images over {MAX_UPLOAD_MB}MB are compressed automatically. Max 10MB.</p>

          {compressing && <p className="text-xs text-amber-600 mt-2">Compressing image...</p>}
          {notice && !compressing && <p className="text-xs text-green-600 mt-2">{notice}</p>}
          {file && (
            <div className="mt-3 flex items-center gap-3">
              {filePreview ? (
                <img src={filePreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover ring-2 ring-brand-blue" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-brand-blue flex items-center justify-center text-xs text-brand-blue-strong">📄</div>
              )}
              <p className="text-xs text-slate-500">{file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)</p>
            </div>
          )}
          {!file && existingSubmission?.file_url && (
            <a href={existingSubmission.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue-strong font-medium mt-2 inline-block hover:underline">📎 Current file: {existingSubmission.file_name}</a>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button onClick={handleSubmit} disabled={submitting || compressing} className="self-start bg-brand-blue-strong text-white px-8 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">
          {submitting ? "Submitting..." : existingSubmission ? "Resubmit" : "Submit Assignment"}
        </button>
      </div>
    </div>
  );
}