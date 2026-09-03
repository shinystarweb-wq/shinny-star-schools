"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const fileInputRef = useRef(null);
  const [location, setLocation] = useState("");
  const [settings, setSettings] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const stored = sessionStorage.getItem("shinnystar_user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setLocation(user.location);

      const { data } = await supabase.from("school_settings").select("*").eq("location", user.location).single();
      setSettings(data);
      setLoading(false);
    }
    load();
  }, []);

  function update(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Logo must be under 2MB.");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    let logo_url = settings.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = location.toLowerCase() + "-logo-" + Date.now() + "." + ext;
      const { error: uploadError } = await supabase.storage.from("school-assets").upload(path, logoFile);
      if (uploadError) {
        setMessage("Logo upload failed: " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(path);
      logo_url = urlData.publicUrl;
    }

    const { error } = await supabase.from("school_settings").update({
      school_name: settings.school_name, logo_url, address: settings.address, phone: settings.phone,
      email: settings.email, website: settings.website, current_term: settings.current_term,
      current_session: settings.current_session, updated_at: new Date().toISOString(),
    }).eq("location", location);

    setSaving(false);
    if (error) {
      setMessage("Could not save: " + error.message);
      return;
    }
    setSettings((prev) => ({ ...prev, logo_url }));
    setLogoFile(null);
    setLogoPreview(null);
    setMessage("Settings saved successfully.");
  }

  if (loading) return <p className="text-slate-500 text-sm">Loading settings...</p>;
  if (!settings) return <p className="text-slate-500 text-sm">Settings not found for {location}.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">School Settings</h1>
      <p className="text-sm text-slate-500 mb-8">{location} branch — this information appears on printed report cards, bills, ID cards, and newsletters.</p>

      <div className="flex flex-col gap-8">
        <div className="border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">School Logo</h2>
          <div className="flex items-center gap-5">
            {logoPreview || settings.logo_url ? (
              <img src={logoPreview || settings.logo_url} alt="Logo" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-brand-blue bg-white" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-brand-blue flex items-center justify-center text-2xl ring-4 ring-brand-blue">🏫</div>
            )}
            <div>
              <button type="button" onClick={() => fileInputRef.current.click()} className="text-sm border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium">Upload Logo</button>
              <p className="text-xs text-slate-400 mt-1">PNG or JPG, max 2MB. Square works best.</p>
              <input ref={fileInputRef} type="file" accept="image/png, image/jpeg, image/webp" onChange={handleLogoChange} className="hidden" />
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">School Information</h2>
          <div className="flex flex-col gap-4">
            <Field label="School Name">
              <input type="text" value={settings.school_name || ""} onChange={(e) => update("school_name", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Address">
              <textarea value={settings.address || ""} onChange={(e) => update("address", e.target.value)} rows={2} className={inputClass} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Phone">
                <input type="text" value={settings.phone || ""} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Email">
                <input type="email" value={settings.email || ""} onChange={(e) => update("email", e.target.value)} className={inputClass} />
              </Field>
            </div>
            <Field label="Website">
              <input type="text" value={settings.website || ""} onChange={(e) => update("website", e.target.value)} className={inputClass} />
            </Field>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Academic Session</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Current Term">
              <select value={settings.current_term} onChange={(e) => update("current_term", e.target.value)} className={inputClass}>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Current Session">
              <input type="text" value={settings.current_session || ""} onChange={(e) => update("current_session", e.target.value)} placeholder="e.g. 2025/2026" className={inputClass} />
            </Field>
          </div>
        </div>

        {message && <p className={"text-sm " + (message.includes("failed") || message.includes("Could not") ? "text-red-600" : "text-green-700")}>{message}</p>}

        <button onClick={handleSave} disabled={saving} className="self-start bg-brand-blue-strong text-white px-8 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Saving..." : "Save Settings"}</button>
      </div>
    </div>
  );
}