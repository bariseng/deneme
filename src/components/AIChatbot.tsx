"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Target,
  Brain,
  FileText,
  BarChart3,
  Zap,
  Loader2,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  intent?: string;
}

type AgentMode = "general" | "avci" | "swot" | "teklif";

const modeConfig: Record<AgentMode, { label: string; icon: typeof Bot; color: string; placeholder: string }> = {
  general: { label: "Genel", icon: Bot, color: "from-primary to-primary-dark", placeholder: "Bir soru sorun veya doğal dilde ihale arayın..." },
  avci: { label: "İhale Avcısı", icon: Target, color: "from-emerald-600 to-emerald-700", placeholder: "\"İstanbul'da 5M üstü yapım ihalesi bul\"" },
  swot: { label: "SWOT Analizi", icon: Brain, color: "from-purple-600 to-purple-700", placeholder: "\"Bu ihaleye girmeli miyim?\"" },
  teklif: { label: "Teklif Taslağı", icon: FileText, color: "from-orange-500 to-orange-600", placeholder: "Teklif hazırlamak istediğiniz ihaleyi belirtin..." },
};

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Merhaba! Ben İhalePro **Agentic AI** Asistanı.\n\nYeni özelliklerim:\n• **İhale Avcısı** — Profilinize uygun ihaleleri otomatik tarar\n• **Doğal Dil Arama** — \"Ankara'da 10M üstü hizmet ihalesi\" gibi arayın\n• **SWOT Analizi** — İhale katılım kararı stratejisi\n• **Otonom Teklif** — Optimal fiyat aralığı ve birim fiyat tablosu\n\nNasıl yardımcı olabilirim?",
  timestamp: new Date().toISOString(),
};

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState<AgentMode>("general");
  const [streamingText, setStreamingText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, streamingText, scrollToBottom]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    setStreamingText("");

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
        }),
        signal: abortRef.current.signal,
      });

      const newConvoId = res.headers.get("X-Conversation-Id");
      if (newConvoId) setConversationId(newConvoId);

      const intent = res.headers.get("X-Intent");

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Separate metadata from display text
        const metaIdx = fullText.indexOf("__META__");
        const displayText = metaIdx >= 0 ? fullText.slice(0, metaIdx) : fullText;
        setStreamingText(displayText);
      }

      // Extract clean text (without metadata)
      const metaIdx = fullText.indexOf("__META__");
      const cleanText = metaIdx >= 0 ? fullText.slice(0, metaIdx).trim() : fullText.trim();

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: cleanText,
        timestamp: new Date().toISOString(),
        intent: intent || undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // User cancelled
      } else {
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}-err`,
          role: "assistant",
          content: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      abortRef.current = null;
    }
  }, [input, isStreaming, conversationId]);

  const quickActions = [
    { label: "Bana uygun ihaleler", icon: Target, query: "Bana uygun ihaleleri göster" },
    { label: "SWOT Analizi", icon: Brain, query: "Bu ihaleye girmeli miyim? SWOT analizi yap" },
    { label: "Teklif Taslağı", icon: FileText, query: "Teklif taslağı hazırla" },
    { label: "Haftalık Brifing", icon: BarChart3, query: "Haftalık brifing oluştur" },
  ];

  const currentMode = modeConfig[mode];

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-6 lg:bottom-6 z-50 w-14 h-14 bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
          aria-label="AI Asistan"
        >
          <MessageCircle size={24} />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
            <Zap size={11} className="text-white" />
          </span>
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${currentMode.color} px-4 py-3 shrink-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <currentMode.icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Agentic AI — {currentMode.label}
                  </p>
                  <p className="text-[10px] text-white/70">
                    Otonom ihale istihbaratı
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>
            {/* Mode tabs */}
            <div className="flex gap-1 mt-2">
              {(Object.entries(modeConfig) as [AgentMode, typeof currentMode][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    mode === key
                      ? "bg-white/25 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <cfg.icon size={10} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-1">
                    {msg.intent === "search" ? (
                      <Target size={14} className="text-emerald-600" />
                    ) : msg.intent === "swot" ? (
                      <Brain size={14} className="text-purple-600" />
                    ) : (
                      <Sparkles size={14} className="text-primary" />
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-gray-100 text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.content.split("\n").map((line, i) => (
                    <span key={i}>
                      {line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
                        if (part.startsWith("**") && part.endsWith("**")) {
                          return (
                            <strong key={j} className="font-semibold">
                              {part.slice(2, -2)}
                            </strong>
                          );
                        }
                        return <span key={j}>{part}</span>;
                      })}
                      {i < msg.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center shrink-0 mt-1">
                    <User size={14} className="text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <Sparkles size={14} className="text-primary animate-pulse" />
                </div>
                <div className="max-w-[80%] bg-gray-100 px-3 py-2 rounded-xl rounded-bl-sm text-sm leading-relaxed">
                  {streamingText ? (
                    streamingText.split("\n").map((line, i) => (
                      <span key={i}>
                        {line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
                          if (part.startsWith("**") && part.endsWith("**")) {
                            return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
                          }
                          return <span key={j}>{part}</span>;
                        })}
                        {i < streamingText.split("\n").length - 1 && <br />}
                      </span>
                    ))
                  ) : (
                    <div className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-primary" />
                      <span className="text-foreground-light text-xs">Analiz ediliyor...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions - show only initially */}
          {messages.length <= 2 && !isStreaming && (
            <div className="px-3 pb-2 shrink-0">
              <div className="grid grid-cols-2 gap-1.5">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setInput(action.query);
                      setTimeout(() => {
                        const form = document.getElementById("agent-chat-form") as HTMLFormElement;
                        form?.requestSubmit();
                      }, 50);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-2 bg-blue-50 text-primary rounded-lg hover:bg-blue-100 transition-colors text-left"
                  >
                    <action.icon size={14} className="shrink-0" />
                    <span className="text-[11px] font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-border shrink-0">
            <form
              id="agent-chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentMode.placeholder}
                className="flex-1 h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isStreaming}
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="w-10 h-10 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isStreaming ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
            <p className="text-[10px] text-foreground-light text-center mt-1.5">
              İhalePro Agentic AI — Otonom İhale İstihbaratı
            </p>
          </div>
        </div>
      )}
    </>
  );
}
