"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type TaskStatus = "To Do" | "In Progress" | "Done";
type TaskPriority = "Low" | "Medium" | "High";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  assignee: string;
  status: TaskStatus;
  createdAt?: string;
  updatedAt?: string;
};

type Column = {
  title: TaskStatus;
  tasks: Task[];
};

const initialColumns: Column[] = [
  { title: "To Do", tasks: [] },
  { title: "In Progress", tasks: [] },
  { title: "Done", tasks: [] },
];

const priorityStyles: Record<TaskPriority, string> = {
  High: "bg-gradient-to-r from-rose-500/10 to-pink-500/10 text-rose-600 ring-1 ring-rose-500/20",
  Medium:
    "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 ring-1 ring-amber-500/20",
  Low: "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 ring-1 ring-emerald-500/20",
};

const columnAccents: Record<
  TaskStatus,
  { dot: string; glow: string; bg: string }
> = {
  "To Do": {
    dot: "bg-slate-400",
    glow: "shadow-slate-400/40",
    bg: "from-slate-50 to-white",
  },
  "In Progress": {
    dot: "bg-gradient-to-br from-indigo-500 to-violet-500",
    glow: "shadow-indigo-500/40",
    bg: "from-indigo-50/50 to-white",
  },
  Done: {
    dot: "bg-gradient-to-br from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/40",
    bg: "from-emerald-50/50 to-white",
  },
};

const statusOptions: TaskStatus[] = ["To Do", "In Progress", "Done"];

export default function Home() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [boardColumns, setBoardColumns] = useState<Column[]>(initialColumns);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("Medium");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("Medium");
  const [editAssignee, setEditAssignee] = useState("SH");
  const [editStatus, setEditStatus] = useState<TaskStatus>("To Do");
  const [editSaving, setEditSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setErrorMessage("");
      const response = await fetch("/api/tasks", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(`Failed to load tasks (${response.status})`);
      const data: unknown = await response.json();
      if (!Array.isArray(data))
        throw new Error("The tasks API did not return a list.");
      const tasks = data as Task[];
      setBoardColumns(
        statusOptions.map((status) => ({
          title: status,
          tasks: tasks.filter((task) => task.status === status),
        })),
      );
    } catch (error) {
      console.error("Load tasks error:", error);
      setErrorMessage("Failed to load tasks. Please check the server and API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setErrorMessage("");

    try {
      const result = await authClient.signOut();

      if (result.error) {
        throw new Error(result.error.message || "Logout failed.");
      }

      // Reload the app after the session is cleared.
      window.location.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Logout failed. Please try again.",
      );

      setLoggingOut(false);
    }
  }

  async function addTask(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const title = taskTitle.trim();
    if (!title || saving) return;

    try {
      setSaving(true);
      setErrorMessage("");
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          priority: taskPriority,
          assignee: "SH",
          status: "To Do",
        }),
      });
      if (!response.ok)
        throw new Error(`Failed to create task (${response.status})`);
      await loadTasks();
      setTaskTitle("");
      setTaskPriority("Medium");
    } catch (error) {
      console.error("Add task error:", error);
      setErrorMessage("Failed to save the task to the database.");
    } finally {
      setSaving(false);
    }
  }

  function startEditingTask(task: Task) {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditPriority(task.priority);
    setEditAssignee(task.assignee);
    setEditStatus(task.status);
    setErrorMessage("");
  }

  function cancelEditingTask() {
    if (!editSaving) {
      setEditingTask(null);
      setErrorMessage("");
    }
  }

  async function saveEditedTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTask || editSaving) return;

    const title = editTitle.trim();
    const assignee = editAssignee.trim();

    if (!title) {
      setErrorMessage("Task title is required.");
      return;
    }

    if (!assignee) {
      setErrorMessage("Assignee is required.");
      return;
    }

    try {
      setEditSaving(true);
      setErrorMessage("");

      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description: editDescription.trim() || null,
          priority: editPriority,
          assignee,
          status: editStatus,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to update task.");
      }

      setEditingTask(null);
      await loadTasks();
    } catch (error) {
      console.error("Edit task error:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Task update failed.",
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function moveTask(taskId: string, newStatus: TaskStatus) {
    const currentTask = boardColumns
      .flatMap((column) => column.tasks)
      .find((task) => task.id === taskId);
    if (!currentTask || currentTask.status === newStatus) return;

    setBoardColumns((currentColumns) =>
      currentColumns.map((column) => ({
        ...column,
        tasks:
          column.title === newStatus
            ? [
                ...column.tasks.filter((t) => t.id !== taskId),
                { ...currentTask, status: newStatus },
              ]
            : column.tasks.filter((t) => t.id !== taskId),
      })),
    );

    try {
      setErrorMessage("");
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok)
        throw new Error(`Failed to update task (${response.status})`);
      await loadTasks();
    } catch (error) {
      console.error("Move task error:", error);
      setErrorMessage("Failed to save the task status.");
      await loadTasks();
    }
  }

  async function deleteTask(taskId: string) {
    const selectedTask = boardColumns
      .flatMap((column) => column.tasks)
      .find((task) => task.id === taskId);
    if (!selectedTask) return;

    const confirmed = window.confirm(`Delete "${selectedTask.title}"?`);
    if (!confirmed) return;

    setBoardColumns((currentColumns) =>
      currentColumns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => task.id !== taskId),
      })),
    );

    try {
      setErrorMessage("");
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!response.ok)
        throw new Error(`Failed to delete task (${response.status})`);
      await loadTasks();
    } catch (error) {
      console.error("Delete task error:", error);
      setErrorMessage("We will add the Login feature later");
      await loadTasks();
    }
  }

  const totalTasks = boardColumns.reduce((t, c) => t + c.tasks.length, 0);
  const inProgressTasks =
    boardColumns.find((c) => c.title === "In Progress")?.tasks.length ?? 0;
  const completedTasks =
    boardColumns.find((c) => c.title === "Done")?.tasks.length ?? 0;

  const stats = [
    {
      label: "Total Tasks",
      value: totalTasks,
      accent: "from-indigo-500 to-violet-500",
      ring: "ring-indigo-500/10",
      icon: (
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      ),
      delay: "0s",
    },
    {
      label: "In Progress",
      value: inProgressTasks,
      accent: "from-amber-400 to-orange-500",
      ring: "ring-amber-500/10",
      icon: (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </>
      ),
      delay: "0.05s",
    },
    {
      label: "Completed",
      value: completedTasks,
      accent: "from-emerald-400 to-teal-500",
      ring: "ring-emerald-500/10",
      icon: (
        <>
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <path d="M22 4L12 14.01l-3-3" />
        </>
      ),
      delay: "0.1s",
    },
    {
      label: "Team Members",
      value: 3,
      accent: "from-fuchsia-500 to-pink-500",
      ring: "ring-fuchsia-500/10",
      icon: (
        <>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </>
      ),
      delay: "0.15s",
    },
  ];

  return (
    <main className="relative min-h-screen bg-[#f6f7fb] text-slate-800 antialiased">
      {/* Ambient background mesh */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 size-[500px] rounded-full bg-indigo-400/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 size-[500px] rounded-full bg-fuchsia-400/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 size-[400px] rounded-full bg-cyan-400/15 blur-[120px]" />
      </div>

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={saveEditedTask}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-task-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2
              id="edit-task-title"
              className="text-xl font-bold text-slate-900"
            >
              Edit Task
            </h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              Update your task details.
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="edit-title"
                  className="mb-1 block text-sm font-medium"
                >
                  Task title
                </label>
                <input
                  id="edit-title"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  maxLength={200}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-description"
                  className="mb-1 block text-sm font-medium"
                >
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-priority"
                    className="mb-1 block text-sm font-medium"
                  >
                    Priority
                  </label>
                  <select
                    id="edit-priority"
                    value={editPriority}
                    onChange={(event) =>
                      setEditPriority(event.target.value as TaskPriority)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-status"
                    className="mb-1 block text-sm font-medium"
                  >
                    Status
                  </label>
                  <select
                    id="edit-status"
                    value={editStatus}
                    onChange={(event) =>
                      setEditStatus(event.target.value as TaskStatus)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-assignee"
                  className="mb-1 block text-sm font-medium"
                >
                  Assignee
                </label>
                <input
                  id="edit-assignee"
                  value={editAssignee}
                  onChange={(event) => setEditAssignee(event.target.value)}
                  maxLength={50}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {errorMessage && (
              <p role="alert" className="mt-4 text-sm text-rose-600">
                {errorMessage}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelEditingTask}
                disabled={editSaving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={editSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-16px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulseSoft {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out both;
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.4s ease-out both;
        }
        .animate-pulse-soft {
          animation: pulseSoft 2s ease-in-out infinite;
        }
        .glass {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
        }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            #6366f1,
            #a855f7,
            #ec4899,
            #6366f1
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-gradient-to-b from-[#0f172a] via-[#111c3a] to-[#0f172a] p-6 text-white shadow-2xl shadow-indigo-900/20 md:block">
          <div className="flex items-center gap-3 animate-slide-in-left">
            <div className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/40">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="relative size-5"
              >
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Flow<span className="shimmer-text">Board</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-white/40">
                Workspace
              </p>
            </div>
          </div>

          <nav className="mt-10 space-y-1.5">
            <a
              href="#dashboard"
              className="group relative flex items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-3.5 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/50"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="relative size-4"
              >
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
              <span className="relative">Dashboard</span>
            </a>

            {[
              {
                label: "Inventory",
                icon: (
                  <>
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </>
                ),
              },
              {
                label: "Orders",
                icon: (
                  <>
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                  </>
                ),
              },
              {
                label: "Purchase",
                icon: (
                  <>
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 01-8 0" />
                  </>
                ),
              },
              {
                label: "Reporting",
                icon: (
                  <>
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </>
                ),
              },
              {
                label: "Support",
                icon: (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
                  </>
                ),
              },
              {
                label: "Settings",
                icon: (
                  <>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </>
                ),
              },
            ].map((item) => (
              <a
                key={item.label}
                href="#dashboard"
                className="group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-white/60 transition-all duration-200 hover:bg-white/5 hover:text-white hover:translate-x-1"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 transition-transform group-hover:scale-110"
                >
                  {item.icon}
                </svg>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4 backdrop-blur-sm transition hover:from-white/15 hover:to-white/10">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              <p className="text-sm font-semibold text-white">Free workspace</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/50">
              Your team workspace starts here.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="mt-6 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-4"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>

            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </aside>

        {/* Main content */}
        <section id="dashboard" className="relative min-w-0 flex-1 p-5 md:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4 animate-fade-in-up">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-indigo-600 ring-1 ring-indigo-500/10 backdrop-blur">
                  <span className="size-1.5 rounded-full bg-indigo-500 animate-pulse-soft" />
                  Live workspace
                </span>
              </div>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
                Project <span className="shimmer-text">Dashboard</span>
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Plan your work. Track your progress. Ship faster.
              </p>
            </div>

            <form
              className="glass flex flex-wrap gap-2 rounded-2xl border border-white/60 p-2 shadow-xl shadow-indigo-500/5 transition-shadow hover:shadow-2xl hover:shadow-indigo-500/10"
              onSubmit={addTask}
            >
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Enter task name..."
                aria-label="Task name"
                className="min-w-0 flex-1 rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
              <select
                value={taskPriority}
                onChange={(event) =>
                  setTaskPriority(event.target.value as TaskPriority)
                }
                aria-label="Task priority"
                className="rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <button
                type="submit"
                disabled={saving || !taskTitle.trim()}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/40 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">
                  {saving ? "Saving..." : "+ Add Task"}
                </span>
              </button>
            </form>
          </header>

          {errorMessage && (
            <div
              role="alert"
              className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-700 backdrop-blur"
            >
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => void loadTasks()}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-medium hover:bg-rose-50"
              >
                Retry
              </button>
            </div>
          )}

          {/* Statistics */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                style={{ animationDelay: stat.delay }}
                className="animate-fade-in-up group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-5 shadow-lg shadow-indigo-500/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10"
              >
                <div
                  className={`absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br ${stat.accent} opacity-[0.08] blur-xl transition-transform duration-500 group-hover:scale-150`}
                />
                <div className="relative flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>
                  <div
                    className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${stat.accent} text-white shadow-lg ring-4 ${stat.ring} transition-transform group-hover:scale-110 group-hover:rotate-3`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4"
                    >
                      {stat.icon}
                    </svg>
                  </div>
                </div>
                <p className="relative mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Kanban board */}
          <div
            className="mt-10 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Website Development
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Sample project board
                </p>
              </div>
              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search tasks..."
                  aria-label="Search tasks"
                  className="w-full max-w-xs rounded-xl border border-white/60 bg-white/70 py-2 pl-9 pr-4 text-sm outline-none backdrop-blur transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/60 bg-white/70 p-10 text-center shadow-sm backdrop-blur-xl">
                <div className="mx-auto size-8 animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-500" />
                <p className="mt-3 text-sm font-medium text-slate-500">
                  Loading your tasks...
                </p>
              </div>
            ) : (
              <div className="grid items-start gap-5 lg:grid-cols-3">
                {boardColumns.map((column, colIndex) => {
                  const visibleTasks = column.tasks.filter((task) =>
                    task.title.toLowerCase().includes(searchTerm.toLowerCase()),
                  );
                  const accent = columnAccents[column.title];

                  return (
                    <div
                      key={column.title}
                      style={{ animationDelay: `${0.1 * colIndex}s` }}
                      className={`animate-fade-in-up min-w-0 rounded-2xl border border-white/60 bg-gradient-to-b ${accent.bg} p-4 shadow-lg shadow-indigo-500/5 backdrop-blur-xl transition-shadow hover:shadow-xl hover:shadow-indigo-500/10`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2.5 rounded-full ${accent.dot} shadow-md ${accent.glow} ${column.title === "In Progress" ? "animate-pulse-soft" : ""}`}
                          />
                          <h4 className="font-semibold text-slate-900">
                            {column.title}
                          </h4>
                        </div>
                        <span className="rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/60">
                          {column.tasks.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {visibleTasks.map((task, taskIndex) => (
                          <article
                            key={task.id}
                            style={{
                              animationDelay: `${0.1 * colIndex + 0.05 * taskIndex}s`,
                            }}
                            className="animate-fade-in-up group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10"
                          >
                            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 opacity-0 transition-opacity group-hover:opacity-100" />
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium leading-6 text-slate-800">
                                {task.title}
                              </p>

                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEditingTask(task)}
                                  title="Edit task"
                                  aria-label={`Edit ${task.title}`}
                                  className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="size-4"
                                  >
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                                  </svg>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => void deleteTask(task.id)}
                                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100"
                                aria-label={`Delete ${task.title}`}
                                title="Delete task"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="size-4"
                                >
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                              </button>
                            </div>

                            <select
                              value={column.title}
                              onChange={(event) =>
                                void moveTask(
                                  task.id,
                                  event.target.value as TaskStatus,
                                )
                              }
                              className="mt-3 w-full rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                              aria-label={`Change status of ${task.title}`}
                            >
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>

                            <div className="mt-4 flex items-center justify-between gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyles[task.priority] ?? priorityStyles.Medium}`}
                              >
                                {task.priority}
                              </span>
                              <span
                                title={`Assignee: ${task.assignee}`}
                                className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 ring-2 ring-white transition-transform group-hover:scale-110"
                              >
                                {task.assignee}
                              </span>
                            </div>
                          </article>
                        ))}

                        {visibleTasks.length === 0 && (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 py-8 text-center">
                            <p className="text-sm text-slate-400">
                              {searchTerm
                                ? "No matching tasks"
                                : "No tasks yet"}
                            </p>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setTaskTitle("");
                          setTaskPriority("Medium");
                          document
                            .querySelector<HTMLInputElement>(
                              'input[aria-label="Task name"]',
                            )
                            ?.focus();
                        }}
                        className="mt-4 w-full rounded-xl border border-dashed border-slate-300 bg-white/50 px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600"
                      >
                        + Add task
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
