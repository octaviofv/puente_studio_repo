import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';

const API_KEY = '{{ARTIFACT_API_KEY}}';
const ARTEFACTO_GROUP_ID = '{{ARTEFACTO_GROUP_ID}}';
const TABLE_ID = '{{TABLE_ID}}';
const BASE_URL = '{{BASE_URL}}';
const MAX_BYTES = 900 * 1024;

type Upload = {
  id: string;
  fila_data: {
    title?: string;
    description?: string;
    image_base64: string;
    filename: string;
    uploaded_at: string;
  };
};

async function compressImage(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The selected file could not be read.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onerror = () => reject(new Error('The selected image could not be processed.'));
    element.onload = () => resolve(element);
    element.src = source;
  });
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image compression is not available in this browser.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.86;
  let output = canvas.toDataURL('image/jpeg', quality);
  while (output.length * 0.75 > MAX_BYTES && quality > 0.45) {
    quality -= 0.1;
    output = canvas.toDataURL('image/jpeg', quality);
  }
  if (output.length * 0.75 > MAX_BYTES) throw new Error('This image is still too large after compression. Choose a smaller image.');
  return output;
}

export default function App() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recent, setRecent] = useState<Upload[]>([]);

  const endpoint = `${BASE_URL}/public/artefacto/${ARTEFACTO_GROUP_ID}/tablas/${TABLE_ID}`;

  const loadRecent = async () => {
    setLoadingRecent(true);
    try {
      const response = await fetch(`${endpoint}/datos?limit=12&offset=0`, { headers: { 'X-API-Key': API_KEY } });
      if (!response.ok) throw new Error('Could not load recent uploads.');
      const data = await response.json();
      setRecent(Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load recent uploads.');
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => { void loadRecent(); }, []);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setError('');
    setSuccess('');
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    try {
      setLoading(true);
      const compressed = await compressImage(selected);
      setFile(selected);
      setImageBase64(compressed);
      setPreview(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare the image.');
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreview('');
    setImageBase64('');
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!file || !imageBase64) {
      setError('Select an image before uploading.');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${endpoint}/dato`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({ datos: {
          title: title.trim(), description: description.trim(), image_base64: imageBase64,
          filename: file.name, mime_type: 'image/jpeg', uploaded_at: new Date().toISOString(), status: 'uploaded',
        } }),
      });
      if (!response.ok) throw new Error('The upload could not be saved.');
      setSuccess('Image uploaded successfully.');
      setTitle(''); setDescription(''); clearSelection();
      await loadRecent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The upload could not be saved.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-8">
        <header><p className="text-sm font-semibold text-indigo-600">PUENTE STUDIO</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Image Uploads</h1><p className="mt-2 text-slate-600">Upload, compress, and keep images in your team table.</p></header>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">Title<input value={title} onChange={e => setTitle(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Optional image title" /></label>
              <label className="grid gap-2 text-sm font-medium">Description<input value={description} onChange={e => setDescription(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Optional note" /></label>
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-6 py-10 text-center hover:bg-indigo-50">
              <ImagePlus className="h-8 w-8 text-indigo-600" /><span className="font-medium">Choose an image</span><span className="text-sm text-slate-500">JPG, PNG, or WebP. It will be compressed before upload.</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} className="sr-only" />
            </label>
            {preview && <div className="relative overflow-hidden rounded-xl border border-slate-200"><img src={preview} alt="Selected upload preview" className="max-h-80 w-full object-contain bg-slate-100" /><button type="button" onClick={clearSelection} className="absolute right-3 top-3 rounded-lg bg-white p-2 shadow"><Trash2 className="h-4 w-4" /></button></div>}
            {error && <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
            {success && <div className="flex gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="h-5 w-5 shrink-0" />{success}</div>}
            <button disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{loading ? 'Preparing…' : 'Upload image'}</button>
          </form>
        </section>
        <section><h2 className="mb-4 text-xl font-bold">Recent uploads</h2>{loadingRecent ? <p className="text-slate-500">Loading…</p> : recent.length === 0 ? <p className="rounded-xl bg-white p-6 text-slate-500">No images yet.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{recent.map(upload => <article key={upload.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><img src={upload.fila_data.image_base64} alt={upload.fila_data.title || upload.fila_data.filename} className="h-44 w-full object-cover bg-slate-100" /><div className="p-4"><p className="font-semibold">{upload.fila_data.title || upload.fila_data.filename}</p><p className="mt-1 text-sm text-slate-500">{upload.fila_data.description}</p></div></article>)}</div>}</section>
      </div>
    </main>
  );
}
