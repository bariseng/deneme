"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── TYPES ───────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: { threads: number };
};

type Thread = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  viewCount: number;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
  category?: { name: string; slug: string };
  _count: { replies: number };
};

type WikiArticle = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  tags: string[];
  version: number;
  viewCount: number;
  updatedAt: string;
  editor: { id: string; name: string | null };
};

type VendorSummary = {
  vendorName: string;
  _avg: { rating: number | null; workQuality: number | null; timeliness: number | null; communication: number | null; pricePerformance: number | null };
  _count: { id: number };
};

type VendorReview = {
  id: string;
  vendorName: string;
  rating: number;
  workQuality: number | null;
  timeliness: number | null;
  communication: number | null;
  pricePerformance: number | null;
  comment: string | null;
  projectType: string | null;
  isAnonymous: boolean;
  createdAt: string;
  reviewer: { id: string; name: string | null; image: string | null };
};

type Stats = { threadCount: number; replyCount: number; wikiCount: number; reviewCount: number };

// ─── TABS ────────────────────────────────────────────────

const tabs = [
  { key: "forum", label: "Forum" },
  { key: "wiki", label: "Bilgi Bankası" },
  { key: "vendors", label: "Firma Değerlendirme" },
];

const CATEGORY_ICONS: Record<string, string> = {
  "yapim-isleri": "🏗️",
  "hizmet-alimi": "🤝",
  "mal-alimi": "📦",
  "danismanlik": "💼",
  "mevzuat-hukuk": "⚖️",
  "genel": "💬",
};

const WIKI_CATEGORY_LABELS: Record<string, string> = {
  genel: "Genel",
  mevzuat: "Mevzuat",
  hesaplama: "Hesaplama",
  "süreç": "Süreç",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  return formatDate(d);
}

function Stars({ score, size = 14 }: { score: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width={size} height={size} viewBox="0 0 20 20" fill={s <= Math.round(score) ? "#f59e0b" : "#e5e7eb"}>
          <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.51.91-5.33L2.27 6.68l5.34-.78z" />
        </svg>
      ))}
    </span>
  );
}

export default function CommunityClient() {
  const [activeTab, setActiveTab] = useState("forum");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [latestThreads, setLatestThreads] = useState<Thread[]>([]);
  const [wikiArticles, setWikiArticles] = useState<WikiArticle[]>([]);
  const [wikiSearch, setWikiSearch] = useState("");
  const [vendorSummaries, setVendorSummaries] = useState<VendorSummary[]>([]);
  const [vendorReviews, setVendorReviews] = useState<VendorReview[]>([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Thread detail state
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<(Thread & { replies: Array<{ id: string; content: string; upvotes: number; isAnswer: boolean; createdAt: string; author: { id: string; name: string | null; image: string | null } }> }) | null>(null);

  // Forms
  const [newThreadForm, setNewThreadForm] = useState({ categoryId: "", title: "", content: "" });
  const [showNewThread, setShowNewThread] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [newWikiForm, setNewWikiForm] = useState({ title: "", content: "", summary: "", category: "genel", tags: "" });
  const [showNewWiki, setShowNewWiki] = useState(false);
  const [reviewForm, setReviewForm] = useState({ vendorName: "", rating: "5", workQuality: "5", timeliness: "5", communication: "5", pricePerformance: "5", comment: "", projectType: "", isAnonymous: true });
  const [showReviewForm, setShowReviewForm] = useState(false);

  // ─── FETCHERS ──────────────────────────────────

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/forum/categories");
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } catch { /* ignore */ }
  }, []);

  const fetchLatestThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/forum/threads");
      const json = await res.json();
      if (json.success) setLatestThreads(json.data.threads);
    } catch { /* ignore */ }
  }, []);

  const fetchCategoryThreads = useCallback(async (catId: string) => {
    try {
      const res = await fetch(`/api/forum/threads?categoryId=${catId}`);
      const json = await res.json();
      if (json.success) setThreads(json.data.threads);
    } catch { /* ignore */ }
  }, []);

  const fetchThreadDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/forum/threads/${id}`);
      const json = await res.json();
      if (json.success) setThreadDetail(json.data);
    } catch { /* ignore */ }
  }, []);

  const fetchWiki = useCallback(async (q?: string) => {
    try {
      const url = q ? `/api/wiki?q=${encodeURIComponent(q)}` : "/api/wiki";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setWikiArticles(json.data);
    } catch { /* ignore */ }
  }, []);

  const fetchVendors = useCallback(async (name?: string) => {
    try {
      const [summaryRes, reviewsRes] = await Promise.all([
        fetch("/api/vendors?summary=true"),
        fetch(name ? `/api/vendors?vendor=${encodeURIComponent(name)}` : "/api/vendors"),
      ]);
      const summaryJson = await summaryRes.json();
      const reviewsJson = await reviewsRes.json();
      if (summaryJson.success) setVendorSummaries(summaryJson.data);
      if (reviewsJson.success) setVendorReviews(reviewsJson.data.reviews);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCategories(), fetchLatestThreads(), fetchWiki(), fetchVendors()]).then(() => {
      // compute stats from loaded data
      setLoading(false);
    });
  }, [fetchCategories, fetchLatestThreads, fetchWiki, fetchVendors]);

  useEffect(() => {
    if (selectedCategory) fetchCategoryThreads(selectedCategory);
  }, [selectedCategory, fetchCategoryThreads]);

  useEffect(() => {
    if (selectedThread) fetchThreadDetail(selectedThread);
  }, [selectedThread, fetchThreadDetail]);

  // Compute stats from categories
  useEffect(() => {
    const threadCount = categories.reduce((s, c) => s + c._count.threads, 0);
    setStats({ threadCount, replyCount: 0, wikiCount: wikiArticles.length, reviewCount: vendorReviews.length });
  }, [categories, wikiArticles, vendorReviews]);

  // ─── HANDLERS ──────────────────────────────────

  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/forum/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newThreadForm),
    });
    setNewThreadForm({ categoryId: "", title: "", content: "" });
    setShowNewThread(false);
    fetchLatestThreads();
    if (selectedCategory) fetchCategoryThreads(selectedCategory);
    fetchCategories();
  }

  async function handleAddReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedThread) return;
    await fetch(`/api/forum/threads/${selectedThread}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyContent }),
    });
    setReplyContent("");
    fetchThreadDetail(selectedThread);
  }

  async function handleUpvote(replyId: string) {
    if (!selectedThread) return;
    await fetch(`/api/forum/threads/${selectedThread}/replies/${replyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upvote" }),
    });
    fetchThreadDetail(selectedThread);
  }

  async function handleMarkAnswer(replyId: string) {
    if (!selectedThread) return;
    await fetch(`/api/forum/threads/${selectedThread}/replies/${replyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_answer" }),
    });
    fetchThreadDetail(selectedThread);
  }

  async function handleCreateWiki(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/wiki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newWikiForm,
        tags: newWikiForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setNewWikiForm({ title: "", content: "", summary: "", category: "genel", tags: "" });
    setShowNewWiki(false);
    fetchWiki();
  }

  async function handleCreateReview(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewForm),
    });
    setReviewForm({ vendorName: "", rating: "5", workQuality: "5", timeliness: "5", communication: "5", pricePerformance: "5", comment: "", projectType: "", isAnonymous: true });
    setShowReviewForm(false);
    fetchVendors();
  }

  // ─── RENDER ────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Topluluk & Bilgi Paylaşım</h1>
      <p className="text-gray-600 mb-6">İhale dünyasında bilgi paylaşın, tartışın ve deneyimlerinizi aktarın</p>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.threadCount}</p>
            <p className="text-sm text-gray-500">Tartışma</p>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.wikiCount}</p>
            <p className="text-sm text-gray-500">Wiki Makalesi</p>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.reviewCount}</p>
            <p className="text-sm text-gray-500">Firma Değerlendirme</p>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{categories.length}</p>
            <p className="text-sm text-gray-500">Kategori</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSelectedThread(null); setThreadDetail(null); setSelectedCategory(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.key ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
      ) : (
        <>
          {/* ═══ FORUM TAB ═══ */}
          {activeTab === "forum" && !selectedThread && (
            <div className="space-y-6">
              {/* New Thread Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowNewThread(!showNewThread)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  {showNewThread ? "Kapat" : "Yeni Konu Aç"}
                </button>
              </div>

              {/* New Thread Form */}
              {showNewThread && (
                <form onSubmit={handleCreateThread} className="bg-white rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Yeni Tartışma Konusu</h3>
                  <select
                    required
                    value={newThreadForm.categoryId}
                    onChange={(e) => setNewThreadForm({ ...newThreadForm, categoryId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Kategori seçin</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="text" required placeholder="Konu başlığı"
                    value={newThreadForm.title}
                    onChange={(e) => setNewThreadForm({ ...newThreadForm, title: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                  <textarea
                    required placeholder="İçerik (Markdown desteklenir)"
                    value={newThreadForm.content}
                    onChange={(e) => setNewThreadForm({ ...newThreadForm, content: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" rows={5}
                  />
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                    Konuyu Paylaş
                  </button>
                </form>
              )}

              {/* Categories */}
              {!selectedCategory && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className="bg-white rounded-lg border p-4 text-left hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{CATEGORY_ICONS[cat.slug] || "💬"}</span>
                          <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{cat.description}</p>
                        <p className="text-xs text-blue-600 font-medium">{cat._count.threads} konu</p>
                      </button>
                    ))}
                  </div>

                  {/* Latest Threads */}
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">Son Tartışmalar</h3>
                    </div>
                    <div className="divide-y">
                      {latestThreads.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500">Henüz tartışma konusu yok. İlk konuyu siz açın!</p>
                      ) : (
                        latestThreads.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedThread(t.id)}
                            className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {t.isPinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Sabit</span>}
                              <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{t.category?.name}</span>
                            </div>
                            <h4 className="font-medium text-gray-900">{t.title}</h4>
                            <div className="flex gap-4 mt-1 text-xs text-gray-500">
                              <span>{t.author.name || "Anonim"}</span>
                              <span>{timeAgo(t.createdAt)}</span>
                              <span>{t._count.replies} yanıt</span>
                              <span>{t.viewCount} görüntülenme</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Category Threads */}
              {selectedCategory && (
                <>
                  <button onClick={() => setSelectedCategory(null)} className="text-sm text-blue-600 hover:underline mb-2">
                    Tüm kategorilere dön
                  </button>
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">{categories.find((c) => c.id === selectedCategory)?.name}</h3>
                    </div>
                    <div className="divide-y">
                      {threads.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500">Bu kategoride henüz konu yok.</p>
                      ) : (
                        threads.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedThread(t.id)}
                            className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {t.isPinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Sabit</span>}
                            </div>
                            <h4 className="font-medium text-gray-900">{t.title}</h4>
                            <div className="flex gap-4 mt-1 text-xs text-gray-500">
                              <span>{t.author.name || "Anonim"}</span>
                              <span>{timeAgo(t.createdAt)}</span>
                              <span>{t._count.replies} yanıt</span>
                              <span>{t.viewCount} görüntülenme</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ THREAD DETAIL ═══ */}
          {activeTab === "forum" && selectedThread && threadDetail && (
            <div className="space-y-4">
              <button onClick={() => { setSelectedThread(null); setThreadDetail(null); }} className="text-sm text-blue-600 hover:underline">
                Foruma dön
              </button>

              {/* Thread */}
              <div className="bg-white rounded-lg border p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{threadDetail.category?.name}</span>
                  {threadDetail.isPinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Sabit</span>}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{threadDetail.title}</h2>
                <div className="flex gap-3 text-sm text-gray-500 mb-4">
                  <span className="font-medium text-gray-700">{threadDetail.author.name || "Anonim"}</span>
                  <span>{timeAgo(threadDetail.createdAt)}</span>
                  <span>{threadDetail.viewCount} görüntülenme</span>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{threadDetail.content}</div>
              </div>

              {/* Replies */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">{threadDetail.replies.length} Yanıt</h3>
                {threadDetail.replies.map((r) => (
                  <div key={r.id} className={`bg-white rounded-lg border p-4 ${r.isAnswer ? "border-green-300 bg-green-50" : ""}`}>
                    {r.isAnswer && (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-medium mb-2">
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                        Kabul Edilen Cevap
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap mb-3">{r.content}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span className="font-medium">{r.author.name || "Anonim"}</span>
                        <span>{timeAgo(r.createdAt)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleUpvote(r.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3l-7 7h4v7h6v-7h4z" /></svg>
                          {r.upvotes}
                        </button>
                        {!r.isAnswer && (
                          <button onClick={() => handleMarkAnswer(r.id)} className="text-xs text-green-600 hover:underline">
                            Cevap Olarak İşaretle
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply form */}
              <form onSubmit={handleAddReply} className="bg-white rounded-lg border p-4">
                <h4 className="font-semibold mb-2">Yanıt Yaz</h4>
                <textarea
                  required placeholder="Yanıtınızı yazın..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-2" rows={4}
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Yanıtla
                </button>
              </form>
            </div>
          )}

          {/* ═══ WIKI TAB ═══ */}
          {activeTab === "wiki" && (
            <div className="space-y-6">
              {/* Search & Actions */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Bilgi bankasında ara..."
                    value={wikiSearch}
                    onChange={(e) => { setWikiSearch(e.target.value); }}
                    onKeyDown={(e) => { if (e.key === "Enter") fetchWiki(wikiSearch || undefined); }}
                    className="w-full border rounded-lg px-4 py-2 text-sm pl-10"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                </div>
                <button
                  onClick={() => setShowNewWiki(!showNewWiki)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
                >
                  {showNewWiki ? "Kapat" : "Makale Yaz"}
                </button>
              </div>

              {/* New Wiki Form */}
              {showNewWiki && (
                <form onSubmit={handleCreateWiki} className="bg-white rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Yeni Wiki Makalesi</h3>
                  <input type="text" required placeholder="Makale başlığı" value={newWikiForm.title} onChange={(e) => setNewWikiForm({ ...newWikiForm, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <input type="text" placeholder="Kısa özet" value={newWikiForm.summary} onChange={(e) => setNewWikiForm({ ...newWikiForm, summary: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={newWikiForm.category} onChange={(e) => setNewWikiForm({ ...newWikiForm, category: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                      {Object.entries(WIKI_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input type="text" placeholder="Etiketler (virgülle ayırın)" value={newWikiForm.tags} onChange={(e) => setNewWikiForm({ ...newWikiForm, tags: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <textarea required placeholder="Makale içeriği (Markdown desteklenir)" value={newWikiForm.content} onChange={(e) => setNewWikiForm({ ...newWikiForm, content: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={10} />
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Yayınla</button>
                </form>
              )}

              {/* Articles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wikiArticles.length === 0 ? (
                  <div className="md:col-span-2 text-center py-12 bg-white rounded-lg border">
                    <p className="text-gray-500">Henüz wiki makalesi yok. İlk makaleyi siz yazın!</p>
                  </div>
                ) : (
                  wikiArticles.map((a) => (
                    <Link key={a.id} href={`/topluluk/wiki/${a.slug}`} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow block">
                      <div className="flex items-center gap-2 mb-2">
                        {a.category && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">{WIKI_CATEGORY_LABELS[a.category] || a.category}</span>}
                        <span className="text-xs text-gray-400">v{a.version}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{a.title}</h3>
                      {a.summary && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{a.summary}</p>}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {a.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                      <div className="flex gap-3 text-xs text-gray-400">
                        <span>{a.editor.name || "Anonim"}</span>
                        <span>{formatDate(a.updatedAt)}</span>
                        <span>{a.viewCount} görüntülenme</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ═══ VENDOR REVIEWS TAB ═══ */}
          {activeTab === "vendors" && (
            <div className="space-y-6">
              {/* Search & Actions */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Firma adı ile ara..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") fetchVendors(vendorSearch || undefined); }}
                    className="w-full border rounded-lg px-4 py-2 text-sm pl-10"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                </div>
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
                >
                  {showReviewForm ? "Kapat" : "Firma Değerlendir"}
                </button>
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <form onSubmit={handleCreateReview} className="bg-white rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">Firma Değerlendirmesi</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" required placeholder="Firma Adı" value={reviewForm.vendorName} onChange={(e) => setReviewForm({ ...reviewForm, vendorName: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                    <select value={reviewForm.projectType} onChange={(e) => setReviewForm({ ...reviewForm, projectType: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                      <option value="">Proje Türü (opsiyonel)</option>
                      <option value="Yapım">Yapım</option>
                      <option value="Hizmet">Hizmet</option>
                      <option value="Mal Alımı">Mal Alımı</option>
                      <option value="Danışmanlık">Danışmanlık</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { key: "rating", label: "Genel" },
                      { key: "workQuality", label: "İş Kalitesi" },
                      { key: "timeliness", label: "Zamanında Teslimat" },
                      { key: "communication", label: "İletişim" },
                      { key: "pricePerformance", label: "Fiyat/Performans" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                        <input type="number" min="1" max="5" step="0.5" required value={reviewForm[f.key as keyof typeof reviewForm] as string} onChange={(e) => setReviewForm({ ...reviewForm, [f.key]: e.target.value })} className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                    ))}
                  </div>
                  <textarea placeholder="Deneyiminizi paylaşın..." value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="anon" checked={reviewForm.isAnonymous} onChange={(e) => setReviewForm({ ...reviewForm, isAnonymous: e.target.checked })} />
                    <label htmlFor="anon" className="text-sm text-gray-700">Anonim olarak değerlendir</label>
                  </div>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Gönder</button>
                </form>
              )}

              {/* Vendor Summary Cards */}
              {vendorSummaries.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">En Çok Değerlendirilen Firmalar</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendorSummaries.slice(0, 6).map((v) => (
                      <div key={v.vendorName} className="bg-white rounded-lg border p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{v.vendorName}</h4>
                          <span className="text-lg font-bold text-yellow-500">{(v._avg.rating || 0).toFixed(1)}</span>
                        </div>
                        <Stars score={v._avg.rating || 0} />
                        <p className="text-xs text-gray-500 mt-2">{v._count.id} değerlendirme</p>
                        <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                          {v._avg.workQuality && <span className="text-gray-500">Kalite: {v._avg.workQuality.toFixed(1)}</span>}
                          {v._avg.timeliness && <span className="text-gray-500">Teslimat: {v._avg.timeliness.toFixed(1)}</span>}
                          {v._avg.communication && <span className="text-gray-500">İletişim: {v._avg.communication.toFixed(1)}</span>}
                          {v._avg.pricePerformance && <span className="text-gray-500">F/P: {v._avg.pricePerformance.toFixed(1)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Reviews */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Son Değerlendirmeler</h3>
                <div className="space-y-3">
                  {vendorReviews.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border">
                      <p className="text-gray-500">Henüz firma değerlendirmesi yok. İlk değerlendirmeyi siz yapın!</p>
                    </div>
                  ) : (
                    vendorReviews.map((r) => (
                      <div key={r.id} className="bg-white rounded-lg border p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{r.vendorName}</h4>
                            {r.projectType && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{r.projectType}</span>}
                          </div>
                          <div className="text-right">
                            <Stars score={r.rating} />
                            <p className="text-xs text-gray-400 mt-1">{timeAgo(r.createdAt)}</p>
                          </div>
                        </div>
                        {r.comment && <p className="text-sm text-gray-600 mt-2">{r.comment}</p>}
                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                          <span>{r.reviewer.name || "Anonim Kullanıcı"}</span>
                          {r.workQuality && <span>Kalite: {r.workQuality}</span>}
                          {r.timeliness && <span>Teslimat: {r.timeliness}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
