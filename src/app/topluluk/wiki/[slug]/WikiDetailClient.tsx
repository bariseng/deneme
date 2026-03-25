"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type WikiArticle = {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  category: string | null;
  tags: string[];
  version: number;
  viewCount: number;
  updatedAt: string;
  editor: { id: string; name: string | null };
};

const WIKI_CATEGORY_LABELS: Record<string, string> = {
  genel: "Genel",
  mevzuat: "Mevzuat",
  hesaplama: "Hesaplama",
  "süreç": "Süreç",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default function WikiDetailClient() {
  const params = useParams();
  const slug = params.slug as string;
  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/wiki/${slug}`);
        const json = await res.json();
        if (json.success) {
          setArticle(json.data);
          setEditContent(json.data.content);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleSave() {
    await fetch(`/api/wiki/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setEditing(false);
    // Reload
    const res = await fetch(`/api/wiki/${slug}`);
    const json = await res.json();
    if (json.success) setArticle(json.data);
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">Yükleniyor...</div>;
  if (!article) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">Makale bulunamadı</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/topluluk" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        Topluluğa Dön
      </Link>

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-3">
          {article.category && (
            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">
              {WIKI_CATEGORY_LABELS[article.category] || article.category}
            </span>
          )}
          <span className="text-xs text-gray-400">v{article.version}</span>
          <span className="text-xs text-gray-400">{article.viewCount} görüntülenme</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{article.title}</h1>

        {article.summary && (
          <p className="text-gray-600 mb-4 italic">{article.summary}</p>
        )}

        <div className="flex flex-wrap gap-1 mb-4">
          {article.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tag}</span>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-6 pb-4 border-b">
          <span>Son düzenleyen: {article.editor.name || "Anonim"}</span>
          <span>{formatDate(article.updatedAt)}</span>
        </div>

        {editing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              rows={20}
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Kaydet</button>
              <button onClick={() => { setEditing(false); setEditContent(article.content); }} className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">İptal</button>
            </div>
          </div>
        ) : (
          <>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{article.content}</div>
            <div className="mt-6 pt-4 border-t">
              <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">Bu Makaleyi Düzenle</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
