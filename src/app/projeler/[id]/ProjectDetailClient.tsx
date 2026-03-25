"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Check,
  Clock,
  Circle,
  CalendarDays,
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  User,
  Building2,
  MapPin,
  ChevronDown,
  GanttChart,
  ListTodo,
  CheckCircle2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────

type ProjectStatus =
  | "TAKIPTE"
  | "HAZIRLANIYOR"
  | "TEKLIF_VERILDI"
  | "SONUC_BEKLENIYOR"
  | "KAZANDI"
  | "KAYBETTI";

type TaskStatus = "BEKLIYOR" | "DEVAM_EDIYOR" | "TAMAMLANDI";

interface TaskAssignee {
  id: string;
  name: string | null;
  image: string | null;
}

interface TaskAttachment {
  id: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

interface ProjectTask {
  id: string;
  projectId: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  sortOrder: number;
  category: string | null;
  assignee: TaskAssignee | null;
  attachments: TaskAttachment[];
}

interface ProjectComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
}

interface ProjectData {
  id: string;
  tenderId: string;
  status: ProjectStatus;
  title: string | null;
  notes: string | null;
  createdAt: string;
  tender: {
    id: string;
    title: string;
    institution: string;
    city: string;
    deadline: string;
    estimatedCost: string | null;
    tenderType: string;
    status: string;
  };
  tasks: ProjectTask[];
  comments: ProjectComment[];
}

type DetailTab = "tasks" | "gantt" | "comments";

// ─── Constants ──────────────────────────────────────────

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "TAKIPTE", label: "Takipte" },
  { value: "HAZIRLANIYOR", label: "Hazırlanıyor" },
  { value: "TEKLIF_VERILDI", label: "Teklif Verildi" },
  { value: "SONUC_BEKLENIYOR", label: "Sonuç Bekleniyor" },
  { value: "KAZANDI", label: "Kazandı" },
  { value: "KAYBETTI", label: "Kaybetti" },
];

const TASK_STATUS_MAP: Record<TaskStatus, { label: string; icon: React.ElementType; color: string }> = {
  BEKLIYOR: { label: "Bekliyor", icon: Circle, color: "text-gray-400" },
  DEVAM_EDIYOR: { label: "Devam Ediyor", icon: Clock, color: "text-amber-500" },
  TAMAMLANDI: { label: "Tamamlandı", icon: CheckCircle2, color: "text-emerald-500" },
};

const CATEGORY_LABELS: Record<string, string> = {
  dokuman: "Doküman",
  teknik: "Teknik",
  maliyet: "Maliyet",
  teklif: "Teklif",
  onay: "Onay",
  gonderim: "Gönderim",
};

const CATEGORY_COLORS: Record<string, string> = {
  dokuman: "bg-blue-100 text-blue-700",
  teknik: "bg-purple-100 text-purple-700",
  maliyet: "bg-emerald-100 text-emerald-700",
  teklif: "bg-amber-100 text-amber-700",
  onay: "bg-pink-100 text-pink-700",
  gonderim: "bg-red-100 text-red-700",
};

// ─── Main Component ─────────────────────────────────────

export default function ProjectDetailClient() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>("tasks");
  const [statusDropdown, setStatusDropdown] = useState(false);

  // Task add form
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("dokuman");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  // Comment form
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.success) setProject(data.data);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const updateStatus = async (newStatus: ProjectStatus) => {
    if (!project) return;
    setProject({ ...project, status: newStatus });
    setStatusDropdown(false);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const toggleTaskStatus = async (task: ProjectTask) => {
    if (!project) return;
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      BEKLIYOR: "DEVAM_EDIYOR",
      DEVAM_EDIYOR: "TAMAMLANDI",
      TAMAMLANDI: "BEKLIYOR",
    };
    const newStatus = nextStatus[task.status];

    // Optimistic
    setProject({
      ...project,
      tasks: project.tasks.map((t) =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ),
    });

    await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const addTask = async () => {
    if (!newTaskTitle.trim() || !project) return;
    setAddingTask(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          category: newTaskCategory,
          dueDate: newTaskDue || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProject({ ...project, tasks: [...project.tasks, data.data] });
        setNewTaskTitle("");
        setNewTaskDue("");
        setShowAddTask(false);
      }
    } catch {
      // handle
    } finally {
      setAddingTask(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!project) return;
    setProject({
      ...project,
      tasks: project.tasks.filter((t) => t.id !== taskId),
    });
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "DELETE",
    });
  };

  const addComment = async () => {
    if (!commentText.trim() || !project) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setProject({ ...project, comments: [...project.comments, data.data] });
        setCommentText("");
      }
    } catch {
      // handle
    } finally {
      setSendingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-alt flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background-alt flex flex-col items-center justify-center">
        <p className="text-foreground-light mb-4">Proje bulunamadı</p>
        <Link href="/projeler" className="text-primary text-sm font-medium">
          Projelere Dön
        </Link>
      </div>
    );
  }

  const completedTasks = project.tasks.filter((t) => t.status === "TAMAMLANDI").length;
  const progress = project.tasks.length > 0 ? Math.round((completedTasks / project.tasks.length) * 100) : 0;
  const currentStatusLabel = STATUS_OPTIONS.find((s) => s.value === project.status)?.label || project.status;

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-6 md:py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/projeler"
            className="inline-flex items-center gap-1.5 text-blue-200 hover:text-white text-sm mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            Projelere Dön
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
            {project.title || project.tender.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-blue-200">
            <span className="flex items-center gap-1">
              <Building2 size={14} />
              {project.tender.institution}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              {project.tender.city}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays size={14} />
              Son: {new Date(project.tender.deadline).toLocaleDateString("tr-TR")}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        {/* Status + progress bar */}
        <div className="bg-white rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Status dropdown */}
            <div className="relative">
              <button
                onClick={() => setStatusDropdown(!statusDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-gray-50"
              >
                {currentStatusLabel}
                <ChevronDown size={14} />
              </button>
              {statusDropdown && (
                <div className="absolute top-full mt-1 left-0 bg-white border border-border rounded-lg shadow-lg z-10 min-w-[180px]">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateStatus(opt.value)}
                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        project.status === opt.value ? "text-primary font-medium" : "text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-foreground">
                {completedTasks}/{project.tasks.length} görev
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          {[
            { key: "tasks" as DetailTab, label: "Görevler", icon: ListTodo, count: project.tasks.length },
            { key: "gantt" as DetailTab, label: "Zaman Çizelgesi", icon: GanttChart },
            { key: "comments" as DetailTab, label: "Yorumlar", icon: MessageSquare, count: project.comments.length },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "bg-primary text-white"
                    : "bg-white text-foreground-light hover:bg-gray-50 border border-border"
                }`}
              >
                <Icon size={16} />
                {t.label}
                {t.count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tab === t.key ? "bg-white/20" : "bg-gray-100"
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === "tasks" && (
          <TasksTab
            tasks={project.tasks}
            onToggle={toggleTaskStatus}
            onDelete={deleteTask}
            showAdd={showAddTask}
            onShowAdd={() => setShowAddTask(true)}
            newTitle={newTaskTitle}
            onNewTitleChange={setNewTaskTitle}
            newCategory={newTaskCategory}
            onNewCategoryChange={setNewTaskCategory}
            newDue={newTaskDue}
            onNewDueChange={setNewTaskDue}
            onAddTask={addTask}
            adding={addingTask}
            onCancelAdd={() => setShowAddTask(false)}
          />
        )}

        {tab === "gantt" && <TaskGantt tasks={project.tasks} deadline={project.tender.deadline} />}

        {tab === "comments" && (
          <CommentsTab
            comments={project.comments}
            text={commentText}
            onTextChange={setCommentText}
            onSend={addComment}
            sending={sendingComment}
          />
        )}
      </div>
    </div>
  );
}

// ─── Tasks Tab ──────────────────────────────────────────

function TasksTab({
  tasks,
  onToggle,
  onDelete,
  showAdd,
  onShowAdd,
  newTitle,
  onNewTitleChange,
  newCategory,
  onNewCategoryChange,
  newDue,
  onNewDueChange,
  onAddTask,
  adding,
  onCancelAdd,
}: {
  tasks: ProjectTask[];
  onToggle: (task: ProjectTask) => void;
  onDelete: (taskId: string) => void;
  showAdd: boolean;
  onShowAdd: () => void;
  newTitle: string;
  onNewTitleChange: (v: string) => void;
  newCategory: string;
  onNewCategoryChange: (v: string) => void;
  newDue: string;
  onNewDueChange: (v: string) => void;
  onAddTask: () => void;
  adding: boolean;
  onCancelAdd: () => void;
}) {
  return (
    <div className="space-y-3 mb-8">
      {tasks.map((task) => {
        const statusMeta = TASK_STATUS_MAP[task.status];
        const StatusIcon = statusMeta.icon;
        const daysLeft = task.dueDate
          ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000)
          : null;

        return (
          <div
            key={task.id}
            className={`bg-white border border-border rounded-xl p-4 flex items-start gap-3 ${
              task.status === "TAMAMLANDI" ? "opacity-60" : ""
            }`}
          >
            {/* Status toggle */}
            <button
              onClick={() => onToggle(task)}
              className={`mt-0.5 shrink-0 ${statusMeta.color} hover:opacity-70`}
              title={`Durum: ${statusMeta.label}`}
            >
              <StatusIcon size={20} />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-sm font-medium ${
                    task.status === "TAMAMLANDI"
                      ? "line-through text-foreground-light"
                      : "text-foreground"
                  }`}
                >
                  {task.title}
                </p>
                <button
                  onClick={() => onDelete(task.id)}
                  className="text-foreground-light hover:text-red-500 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {task.category && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      CATEGORY_COLORS[task.category] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {CATEGORY_LABELS[task.category] || task.category}
                  </span>
                )}
                {task.assignee && (
                  <span className="text-[10px] text-foreground-light flex items-center gap-1">
                    <User size={10} />
                    {task.assignee.name}
                  </span>
                )}
                {daysLeft !== null && (
                  <span
                    className={`text-[10px] flex items-center gap-1 ${
                      task.status === "TAMAMLANDI"
                        ? "text-foreground-light"
                        : daysLeft <= 0
                          ? "text-red-600 font-medium"
                          : daysLeft <= 3
                            ? "text-amber-600"
                            : "text-foreground-light"
                    }`}
                  >
                    <CalendarDays size={10} />
                    {daysLeft > 0 ? `${daysLeft} gün kaldı` : daysLeft === 0 ? "Bugün" : "Gecikti"}
                  </span>
                )}
                {task.attachments.length > 0 && (
                  <span className="text-[10px] text-foreground-light flex items-center gap-1">
                    <Paperclip size={10} />
                    {task.attachments.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Add task form */}
      {showAdd ? (
        <div className="bg-white border border-primary/30 rounded-xl p-4 space-y-3">
          <input
            value={newTitle}
            onChange={(e) => onNewTitleChange(e.target.value)}
            placeholder="Görev başlığı..."
            className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && onAddTask()}
          />
          <div className="flex gap-2">
            <select
              value={newCategory}
              onChange={(e) => onNewCategoryChange(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newDue}
              onChange={(e) => onNewDueChange(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onAddTask}
              disabled={adding || !newTitle.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Ekle
            </button>
            <button
              onClick={onCancelAdd}
              className="px-4 py-1.5 text-sm text-foreground-light hover:bg-gray-50 rounded-lg"
            >
              İptal
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onShowAdd}
          className="w-full flex items-center justify-center gap-1.5 py-3 border-2 border-dashed border-border rounded-xl text-sm text-foreground-light hover:border-primary/30 hover:text-primary transition-colors"
        >
          <Plus size={16} />
          Görev Ekle
        </button>
      )}
    </div>
  );
}

// ─── Task Gantt ─────────────────────────────────────────

function TaskGantt({ tasks, deadline }: { tasks: ProjectTask[]; deadline: string }) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const tasksWithDue = tasks.filter((t) => t.dueDate);

  if (tasksWithDue.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border p-8 text-center mb-8">
        <GanttChart size={32} className="mx-auto text-foreground-light/40 mb-2" />
        <p className="text-sm text-foreground-light">Tarihi olan görevler burada görünür</p>
      </div>
    );
  }

  const allDates = tasksWithDue.map((t) => new Date(t.dueDate!).getTime());
  const minDate = new Date(Math.min(now.getTime(), ...allDates));
  const maxDate = new Date(Math.max(deadlineDate.getTime(), ...allDates));
  const totalDays = Math.max(7, Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000) + 2);
  const dayWidth = 28;

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden mb-8">
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${260 + totalDays * dayWidth}px` }}>
          {/* Header dates */}
          <div className="flex border-b border-border bg-gray-50">
            <div className="w-[260px] shrink-0 px-4 py-2 border-r border-border text-xs font-medium text-foreground-light">
              Görev
            </div>
            <div className="flex">
              {Array.from({ length: totalDays }).map((_, i) => {
                const d = new Date(minDate);
                d.setDate(d.getDate() + i);
                const isToday = d.toDateString() === now.toDateString();
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`text-center border-r border-border/30 ${
                      isToday ? "bg-primary/10" : isWeekend ? "bg-gray-100" : ""
                    }`}
                    style={{ width: `${dayWidth}px` }}
                  >
                    <span className={`text-[9px] ${isToday ? "text-primary font-bold" : "text-foreground-light"}`}>
                      {d.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task rows */}
          {tasksWithDue.map((task) => {
            const dueDate = new Date(task.dueDate!);
            const dayOffset = Math.floor((dueDate.getTime() - minDate.getTime()) / 86400000);
            const barStart = Math.max(0, dayOffset - 3);
            const barEnd = dayOffset;
            const statusMeta = TASK_STATUS_MAP[task.status];

            return (
              <div key={task.id} className="flex border-b border-border/50 hover:bg-gray-50/50">
                <div className="w-[260px] shrink-0 px-4 py-2.5 border-r border-border flex items-center gap-2">
                  {task.category && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      task.status === "TAMAMLANDI" ? "bg-emerald-400" : "bg-amber-400"
                    }`} />
                  )}
                  <span className={`text-xs truncate ${
                    task.status === "TAMAMLANDI" ? "line-through text-foreground-light" : "text-foreground"
                  }`}>
                    {task.title}
                  </span>
                </div>
                <div className="flex relative" style={{ width: `${totalDays * dayWidth}px` }}>
                  <div
                    className={`absolute h-5 rounded-md ${
                      task.status === "TAMAMLANDI" ? "bg-emerald-200" : "bg-primary/20"
                    }`}
                    style={{
                      left: `${barStart * dayWidth}px`,
                      width: `${(barEnd - barStart + 1) * dayWidth}px`,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  >
                    {task.status === "TAMAMLANDI" && (
                      <div className="absolute inset-0 bg-emerald-400 rounded-md" />
                    )}
                    {task.status === "DEVAM_EDIYOR" && (
                      <div className="absolute left-0 top-0 bottom-0 bg-primary rounded-md" style={{ width: "50%" }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Comments Tab ───────────────────────────────────────

function CommentsTab({
  comments,
  text,
  onTextChange,
  onSend,
  sending,
}: {
  comments: ProjectComment[];
  text: string;
  onTextChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
}) {
  return (
    <div className="mb-8">
      {/* Comment list */}
      <div className="space-y-4 mb-4">
        {comments.length === 0 && (
          <div className="bg-white rounded-xl border border-border p-6 text-center">
            <MessageSquare size={28} className="mx-auto text-foreground-light/40 mb-2" />
            <p className="text-sm text-foreground-light">Henüz yorum yok. İlk yorumu siz yazın!</p>
          </div>
        )}
        {comments.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={14} className="text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {c.user.name || "Kullanıcı"}
              </span>
              <span className="text-xs text-foreground-light">
                {new Date(c.createdAt).toLocaleString("tr-TR")}
              </span>
            </div>
            <p className="text-sm text-foreground-light whitespace-pre-wrap pl-9">
              {c.content}
            </p>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div className="bg-white rounded-xl border border-border p-4">
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Yorum yazın..."
          className="w-full text-sm border border-border rounded-lg px-3 py-2 min-h-[80px] resize-none focus:outline-none focus:border-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend();
          }}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={onSend}
            disabled={sending || !text.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary-dark transition-colors"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
