"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-strong focus:border-transparent transition";

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["blockquote", "link"],
    ["clean"],
  ],
};

const editorStyles = `
  .ql-editor {
    min-height: 200px;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }
`;

export default function ArticlesPage() {
  const fileInputRef = useRef(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", author: "", featured: false });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadArticles() {
    setLoading(true);
    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    const { data } = await supabase.from("newsletter_articles").select("*").eq("location", location).order("created_at", { ascending: false });
    setArticles(data || []);
    setLoading(false);
  }

  useEffect(() => { loadArticles(); }, []);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be under 3MB.");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function startNew() {
    setEditingId(null);
    setForm({ title: "", content: "", author: "", featured: false });
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    setShowForm(true);
  }

  function startEdit(a) {
    setEditingId(a.id);
    setForm({ title: a.title, content: a.content, author: a.author || "", featured: a.featured });
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(a.image_url);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.title || !form.content) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);

    let image_url = existingImageUrl;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = Date.now() + "." + ext;
      const { error: uploadError } = await supabase.storage.from("newsletter-images").upload(path, imageFile);
      if (uploadError) {
        setError("Image upload failed: " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("newsletter-images").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    const stored = sessionStorage.getItem("shinnystar_user");
    const location = stored ? JSON.parse(stored).location : null;
    let dbError;
    if (editingId) {
      const { error: updateError } = await supabase.from("newsletter_articles").update({ ...form, image_url }).eq("id", editingId);
      dbError = updateError;
    } else {
      const { error: insertError } = await supabase.from("newsletter_articles").insert([{ ...form, image_url, location }]);
      dbError = insertError;
    }

    setSaving(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setShowForm(false);
    setEditingId(null);
    loadArticles();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this article?")) return;
    await supabase.from("newsletter_articles").delete().eq("id", id);
    loadArticles();
  }

  function stripHtml(html) {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  return (
    <div>
      <style>{editorStyles}</style>
      <Link href="/admin-dashboard/newsletter" className="text-sm text-brand-blue-strong font-medium mb-2 inline-block hover:underline">← Newsletter</Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Articles</h1>
          <p className="text-sm text-slate-500 mt-1">{articles.length} articles written</p>
        </div>
        <button onClick={() => (showForm ? setShowForm(false) : startNew())} className="bg-brand-blue-strong text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition shadow-sm">{showForm ? "Close" : "+ Write Article"}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-slate-200 rounded-2xl p-6 mb-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{editingId ? "Edit Article" : "New Article"}</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Our Students Shine at the Science Fair" className={inputClass} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Author (optional)</label>
              <input type="text" value={form.author} onChange={(e) => update("author", e.target.value)} placeholder="e.g. Mrs. Adaeze Nwosu" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cover Image (optional)</label>
              <button type="button" onClick={() => fileInputRef.current.click()} className="text-sm border border-slate-300 px-4 py-2.5 rounded-lg hover:bg-slate-50 font-medium w-full text-left">{imageFile ? imageFile.name : existingImageUrl ? "Change image" : "Choose image"}</button>
              <input ref={fileInputRef} type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} className="hidden" />
            </div>
          </div>
          {(imagePreview || existingImageUrl) && <img src={imagePreview || existingImageUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg" />}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
            <ReactQuill theme="snow" value={form.content} onChange={(val) => update("content", val)} modules={quillModules} className="bg-white" />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 mt-10">
            <input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} className="rounded" />
            Feature this article on the front page of the newsletter
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-brand-blue-strong text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60">{saving ? "Saving..." : editingId ? "Save Changes" : "Publish Article"}</button>
            {editingId && <button type="button" onClick={() => setShowForm(false)} className="border border-slate-300 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-50">Cancel</button>}
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading articles...</p>
      ) : articles.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl py-16 text-center">
          <p className="text-slate-500 text-sm">No articles written yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {articles.map((a) => (
            <div key={a.id} className="border border-slate-200 rounded-xl overflow-hidden">
              {a.image_url && <img src={a.image_url} alt={a.title} className="w-full h-36 object-cover" />}
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-slate-800 text-sm">{a.title}</h3>
                  <div className="flex gap-2 flex-shrink-0 ml-2">
                    <button onClick={() => startEdit(a)} className="text-xs text-brand-blue-strong font-medium hover:underline">Edit</button>
                    <button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </div>
                </div>
                {a.featured && <span className="text-[10px] font-semibold bg-brand-blue text-brand-blue-strong px-2 py-0.5 rounded-full">Featured</span>}
                {a.author && <p className="text-xs text-slate-400 mt-1">By {a.author}</p>}
                <p className="text-xs text-slate-600 mt-2 line-clamp-3">{stripHtml(a.content)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}