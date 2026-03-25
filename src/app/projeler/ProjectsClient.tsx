"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  KanbanSquare,
  GanttChart,
  Plus,
  Loader2,
  ArrowRight,
  Building2,
  MapPin,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Trophy,
  XCircle,
  ChevronRight,
  ListTodo,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────

type ProjectStatus =
  | "TAKIPTE"
  | "HAZIRLANIYOR"
  | "TEKLIF_VERILDI"
  | "SONUC_BEKLENIYOR"
  | "KAZANDI"
  | "KAYBETTI";

interface ProjectTender {
  id: string;
  title: string;
  institution: string;
  city: string;
  deadline: string;
  estimatedCost: string | null;
  tenderType: string;
}

interface Project {
  id: string;
  tenderId: string;
  ownerId: string;
  status: ProjectStatus;
  title: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  tender: ProjectTender;
  taskSummary: { total: number; completed: number; inProgress: number; pending: number };
  _count: { comments: number };
}

type ViewMode = "kanban" | "gantt";

// ─── Constants ──────────────────────────────────────────

const KANBAN_COLUMNS: { status: ProjectStatus; label: string; icon: React.ElementType; color: string }[] = [
  { status: "TAKIPTE", label: "Takipte", icon: Circle, color: "border-t-blue-400" },
  { status: "HAZIRLANIYOR", label: "Hazırlanıyor", icon: Clock, color: "border-t-amber-400" },
  { status: "TEKLIF_VERILDI", label: "Teklif Verildi", icon: CheckCircle2, color: "border-t-purple-400" },
  { status: "SONUC_BEKLENIYOR", label: "Sonuç Bekleniyor", icon: ListTodo, color: "border-t-orange-400" },
  { status: "KAZANDI", label: "Kazandı", icon: Trophy, color: "border-t-emerald-500" },
  { status: "KAYBETTI", label: "Kaybetti", icon: XCircle, color: "border-t-red-400" },
];

const STATUS_COLORS: Record<ProjectStatus, string> = {
  TAKIPTE: "bg-blue-100 text-blue-700",
  HAZIRLANIYOR: "bg-amber-100 text-amber-700",
  TEKLIF_VERILDI: "bg-purple-100 text-purple-700",
  SONUC_BEKLENIYOR: "bg-orange-100 text-orange-700",
  KAZANDI: "bg-emerald-100 text-emerald-700",
  KAYBETTI: "bg-red-100 text-red-700",
};

// ─── Main Component ─────────────────────────────────────

export default function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("kanban");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) setProjects(data.data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const updateProjectStatus = useCallback(
    async (projectId: string, newStatus: ProjectStatus) => {
      // Optimistic update
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
      );

      try {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch {
        // Revert on error
        fetchProjects();
      }
    },
    [fetchProjects]
  );

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData("text/plain", projectId);
    setDraggingId(projectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("text/plain");
    if (projectId) {
      updateProjectStatus(projectId, status);
    }
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                Proje Yönetimi
              </h1>
              <p className="text-blue-200 text-sm">
                İhalelerinizi proje olarak takip edin ve yönetin
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex bg-white/10 p-1 rounded-lg">
                <button
                  onClick={() => setView("kanban")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === "kanban"
                      ? "bg-white text-primary shadow"
                      : "text-blue-200 hover:text-white"
                  }`}
                >
                  <KanbanSquare size={16} />
                  Kanban
                </button>
                <button
                  onClick={() => setView("gantt")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === "gantt"
                      ? "bg-white text-primary shadow"
                      : "text-blue-200 hover:text-white"
                  }`}
                >
                  <GanttChart size={16} />
                  Gantt
                </button>
              </div>
              <Link
                href="/ihaleler"
                className="flex items-center gap-1.5 bg-white text-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                <Plus size={16} />
                Yeni Proje
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-foreground-light gap-2">
            <Loader2 size={20} className="animate-spin" />
            Projeler yükleniyor...
          </div>
        ) : projects.length === 0 ? (
          <EmptyProjects />
        ) : view === "kanban" ? (
          <KanbanBoard
            projects={projects}
            draggingId={draggingId}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ) : (
          <GanttView projects={projects} />
        )}
      </div>
    </div>
  );
}

// ─── Kanban Board ───────────────────────────────────────

function KanbanBoard({
  projects,
  draggingId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  projects: Project[];
  draggingId: string | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: ProjectStatus) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      {KANBAN_COLUMNS.map((col) => {
        const Icon = col.icon;
        const columnProjects = projects.filter((p) => p.status === col.status);

        return (
          <div
            key={col.status}
            className={`flex-shrink-0 w-72 bg-white rounded-xl border border-border ${col.color} border-t-4`}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, col.status)}
          >
            {/* Column header */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-foreground-light" />
                  <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                </div>
                <span className="text-xs font-medium text-foreground-light bg-gray-100 px-2 py-0.5 rounded-full">
                  {columnProjects.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="p-3 space-y-3 min-h-[200px]">
              {columnProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isDragging={draggingId === project.id}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectCard({
  project,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  project: Project;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}) {
  const daysLeft = Math.ceil(
    (new Date(project.tender.deadline).getTime() - Date.now()) / 86400000
  );
  const progress =
    project.taskSummary.total > 0
      ? Math.round((project.taskSummary.completed / project.taskSummary.total) * 100)
      : 0;

  return (
    <Link
      href={`/projeler/${project.id}`}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(e, project.id);
      }}
      onDragEnd={onDragEnd}
      className={`block bg-white border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-sm transition-all ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
        {project.title || project.tender.title}
      </p>

      <div className="flex items-center gap-2 text-xs text-foreground-light mb-2">
        <Building2 size={12} />
        <span className="truncate">{project.tender.institution}</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-foreground-light mb-3">
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {project.tender.city}
        </span>
        <span
          className={`flex items-center gap-1 ${
            daysLeft <= 3 ? "text-red-600 font-medium" : daysLeft <= 7 ? "text-amber-600" : ""
          }`}
        >
          <Calendar size={12} />
          {daysLeft > 0 ? `${daysLeft} gün` : "Süresi doldu"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] text-foreground-light font-medium">
          {project.taskSummary.completed}/{project.taskSummary.total}
        </span>
      </div>
    </Link>
  );
}

// ─── Gantt View ─────────────────────────────────────────

function GanttView({ projects }: { projects: Project[] }) {
  const activeProjects = projects.filter(
    (p) => p.status !== "KAZANDI" && p.status !== "KAYBETTI"
  );

  if (activeProjects.length === 0) {
    return (
      <div className="text-center py-16 text-foreground-light">
        <GanttChart size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Aktif proje bulunmuyor</p>
      </div>
    );
  }

  // Calculate timeline range
  const now = new Date();
  const allDeadlines = activeProjects.map((p) => new Date(p.tender.deadline).getTime());
  const maxDeadline = Math.max(...allDeadlines);
  const timelineStart = now;
  const timelineEnd = new Date(Math.max(maxDeadline, now.getTime() + 30 * 86400000));
  const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / 86400000);

  // Generate week markers
  const weeks: Date[] = [];
  const weekStart = new Date(timelineStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  while (weekStart <= timelineEnd) {
    weeks.push(new Date(weekStart));
    weekStart.setDate(weekStart.getDate() + 7);
  }

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Timeline header */}
      <div className="flex border-b border-border">
        <div className="w-64 shrink-0 px-4 py-3 bg-gray-50 border-r border-border">
          <span className="text-xs font-medium text-foreground-light">Proje</span>
        </div>
        <div className="flex-1 overflow-x-auto">
          <div className="flex" style={{ minWidth: `${totalDays * 8}px` }}>
            {weeks.map((w, i) => {
              const dayOffset = Math.max(
                0,
                Math.floor((w.getTime() - timelineStart.getTime()) / 86400000)
              );
              return (
                <div
                  key={i}
                  className="text-[10px] text-foreground-light py-3 border-r border-border/50"
                  style={{ position: "absolute", left: `${dayOffset * 8 + 256}px` }}
                >
                  {w.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gantt rows */}
      {activeProjects.map((project) => {
        const deadline = new Date(project.tender.deadline);
        const created = new Date(project.createdAt);
        const startOffset = Math.max(
          0,
          Math.floor((created.getTime() - timelineStart.getTime()) / 86400000)
        );
        const endOffset = Math.floor(
          (deadline.getTime() - timelineStart.getTime()) / 86400000
        );
        const barWidth = Math.max(20, (endOffset - startOffset) * 8);
        const progress =
          project.taskSummary.total > 0
            ? Math.round((project.taskSummary.completed / project.taskSummary.total) * 100)
            : 0;

        return (
          <div key={project.id} className="flex border-b border-border/50 hover:bg-gray-50/50">
            <div className="w-64 shrink-0 px-4 py-3 border-r border-border">
              <Link
                href={`/projeler/${project.id}`}
                className="text-sm font-medium text-foreground hover:text-primary truncate block"
              >
                {project.title || project.tender.title}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>
                  {KANBAN_COLUMNS.find((c) => c.status === project.status)?.label}
                </span>
                <span className="text-[10px] text-foreground-light">
                  {new Date(project.tender.deadline).toLocaleDateString("tr-TR")}
                </span>
              </div>
            </div>
            <div className="flex-1 py-3 relative overflow-x-auto">
              <div
                className="absolute h-6 rounded-md bg-primary/20 flex items-center"
                style={{
                  left: `${startOffset * 8}px`,
                  width: `${barWidth}px`,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                <div
                  className="h-full bg-primary rounded-md transition-all"
                  style={{ width: `${progress}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-primary">
                  {progress}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────

function EmptyProjects() {
  return (
    <div className="text-center py-20">
      <KanbanSquare size={48} className="mx-auto text-foreground-light/30 mb-4" />
      <h2 className="text-lg font-semibold text-foreground mb-2">Henüz proje yok</h2>
      <p className="text-sm text-foreground-light mb-6 max-w-md mx-auto">
        İhaleleri proje olarak ekleyerek hazırlık süreçlerinizi Kanban tahtası ve Gantt
        grafiği ile yönetebilirsiniz.
      </p>
      <Link
        href="/ihaleler"
        className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors"
      >
        İhaleleri Görüntüle
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
