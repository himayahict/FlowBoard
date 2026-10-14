"use client";

import { useState } from "react";

type Task = {
  id: number;
  title: string;
  priority: "Low" | "Medium" | "High";
  assignee: string;
};

type TaskStatus = "To Do" | "In Progress" | "Done";

type Column = {
  title: string;
  tasks: Task[];
};

const columns: Column[] = [
  {
    title: "To Do",
    tasks: [
      { id: 1, title: "Design login page", priority: "High", assignee: "SH" },
      {
        id: 2,
        title: "Plan database schema",
        priority: "Medium",
        assignee: "AK",
      },
    ],
  },
  {
    title: "In Progress",
    tasks: [
      { id: 3, title: "Build dashboard UI", priority: "High", assignee: "SH" },
    ],
  },
  {
    title: "Done",
    tasks: [
      {
        id: 4,
        title: "Create project repository",
        priority: "Low",
        assignee: "JM",
      },
    ],
  },
];

const priorityStyles: Record<Task["priority"], string> = {
  High: "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
  Medium: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  Low: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
};

const columnAccents: Record<string, string> = {
  "To Do": "bg-slate-400",
  "In Progress": "bg-[#4fc3d9]",
  Done: "bg-emerald-500",
};

export default function Home() {
  const [boardColumns, setBoardColumns] = useState<Column[]>(columns);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("Medium");
  const [searchTerm, setSearchTerm] = useState("");

  function addTask() {
    const title = taskTitle.trim();
    if (!title) return;

    const newTask: Task = {
      id: Date.now(),
      title,
      priority: taskPriority,
      assignee: "SH",
    };

    setBoardColumns((currentColumns) =>
      currentColumns.map((column, index) =>
        index === 0 ? { ...column, tasks: [...column.tasks, newTask] } : column,
      ),
    );

    setTaskTitle("");
    setTaskPriority("Medium");
  }

  function moveTask(taskId: number, newStatus: TaskStatus) {
    setBoardColumns((currentColumns) => {
      const selectedTask = currentColumns
        .flatMap((column) => column.tasks)
        .find((task) => task.id === taskId);
      if (!selectedTask) return currentColumns;

      return currentColumns.map((column) => {
        const remainingTasks = column.tasks.filter(
          (task) => task.id !== taskId,
        );
        if (column.title === newStatus) {
          return { ...column, tasks: [...remainingTasks, selectedTask] };
        }
        return { ...column, tasks: remainingTasks };
      });
    });
  }

  function deleteTask(taskId: number) {
    setBoardColumns((currentColumns) =>
      currentColumns.map((column) => ({
        ...column,
        tasks: column.tasks.filter((task) => task.id !== taskId),
      })),
    );
  }

  const totalTasks = boardColumns.reduce((t, c) => t + c.tasks.length, 0);
  const inProgressTasks =
    boardColumns.find((c) => c.title === "In Progress")?.tasks.length ?? 0;
  const completedTasks =
    boardColumns.find((c) => c.title === "Done")?.tasks.length ?? 0;

  return (
    <main className="min-h-screen bg-[#eef4f8] text-slate-800 antialiased">
      {/* Global animations */}
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
            opacity: 0.6;
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
      `}</style>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 bg-gradient-to-b from-[#1a2d47] to-[#15293f] p-6 text-white shadow-2xl shadow-[#1a2d47]/20 md:block">
          <div className="flex items-center gap-3 animate-slide-in-left">
            <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-[#4fc3d9] to-[#3a9fb5] text-white shadow-lg shadow-[#4fc3d9]/40 ring-4 ring-white/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
              >
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Flow<span className="text-[#4fc3d9]">Board</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-white/40">
                Workspace
              </p>
            </div>
          </div>

          <nav className="mt-10 space-y-1.5">
            <a className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#4fc3d9] to-[#3a9fb5] px-3.5 py-3 text-sm font-medium text-white shadow-lg shadow-[#4fc3d9]/30 transition-all hover:shadow-xl hover:shadow-[#4fc3d9]/40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
              Dashboard
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
                className="group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-white/60 transition-all duration-200 hover:bg-white/5 hover:text-white hover:translate-x-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
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

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/10">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#4fc3d9] opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-[#4fc3d9]"></span>
              </span>
              <p className="text-sm font-semibold text-white">Free workspace</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/50">
              Your team workspace starts here.
            </p>
          </div>

          <button className="mt-6 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Logout
          </button>
        </aside>

        {/* Main content */}
        <section className="min-w-0 flex-1 p-5 md:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4 animate-fade-in-up">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Workspace / Overview
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1a2d47]">
                Project Dashboard
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Plan your work. Track your progress.
              </p>
            </div>

            <form
              className="flex flex-wrap gap-2 rounded-2xl border border-white bg-white/90 p-2 shadow-lg shadow-[#1a2d47]/5 backdrop-blur-sm transition-shadow hover:shadow-xl hover:shadow-[#1a2d47]/10"
              onSubmit={(event) => {
                event.preventDefault();
                addTask();
              }}
            >
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Enter task name..."
                className="min-w-0 flex-1 rounded-xl border border-transparent bg-[#eef4f8] px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#4fc3d9] focus:bg-white focus:ring-2 focus:ring-[#4fc3d9]/20"
              />

              <select
                value={taskPriority}
                onChange={(event) =>
                  setTaskPriority(event.target.value as Task["priority"])
                }
                className="rounded-xl border border-transparent bg-[#eef4f8] px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#4fc3d9] focus:bg-white focus:ring-2 focus:ring-[#4fc3d9]/20"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>

              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-[#1a2d47] to-[#2a4a6f] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#1a2d47]/30 transition-all hover:from-[#15293f] hover:to-[#1a2d47] hover:shadow-lg hover:shadow-[#1a2d47]/40 active:scale-[0.97]"
              >
                + Add Task
              </button>
            </form>
          </header>

          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Tasks",
                value: totalTasks,
                accent: "from-[#4fc3d9] to-[#3a9fb5]",
                ring: "ring-[#4fc3d9]/10",
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
                accent: "from-violet-500 to-purple-500",
                ring: "ring-violet-500/10",
                icon: (
                  <>
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </>
                ),
                delay: "0.15s",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{ animationDelay: stat.delay }}
                className="animate-fade-in-up group relative overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-lg shadow-[#1a2d47]/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1a2d47]/10"
              >
                <div
                  className={`absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br ${stat.accent} opacity-[0.07] transition-transform duration-500 group-hover:scale-150`}
                />
                <div className="relative flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>
                  <div
                    className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${stat.accent} text-white shadow-md ring-4 ${stat.ring} transition-transform group-hover:scale-110 group-hover:rotate-3`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
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
                <p className="relative mt-3 text-3xl font-bold tracking-tight text-[#1a2d47]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Board */}
          <div
            className="mt-10 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[#1a2d47]">
                  Website Development
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Sample project board
                </p>
              </div>

              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search tasks..."
                aria-label="Search tasks"
                className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-[#4fc3d9] focus:ring-2 focus:ring-[#4fc3d9]/20"
              />
            </div>

            <div className="grid items-start gap-5 lg:grid-cols-3">
              {boardColumns.map((column, colIndex) => (
                <div
                  key={column.title}
                  style={{ animationDelay: `${0.1 * colIndex}s` }}
                  className="animate-fade-in-up min-w-0 rounded-2xl border border-white bg-white/70 p-4 shadow-lg shadow-[#1a2d47]/5 backdrop-blur-sm transition-shadow hover:shadow-xl hover:shadow-[#1a2d47]/10"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2.5 rounded-full ${columnAccents[column.title]} ${column.title === "In Progress" ? "animate-pulse-soft" : ""}`}
                      />
                      <h4 className="font-semibold text-[#1a2d47]">
                        {column.title}
                      </h4>
                    </div>
                    <span className="rounded-lg bg-[#eef4f8] px-2.5 py-1 text-xs font-semibold text-[#1a2d47]">
                      {column.tasks.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {column.tasks
                      .filter((task) =>
                        task.title
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()),
                      )
                      .map((task, taskIndex) => (
                        <article
                          key={task.id}
                          style={{
                            animationDelay: `${0.1 * colIndex + 0.05 * taskIndex}s`,
                          }}
                          className="animate-fade-in-up group rounded-xl border border-slate-100 bg-white p-4 shadow-sm shadow-[#1a2d47]/5 transition-all duration-300 hover:-translate-y-1 hover:border-[#4fc3d9]/30 hover:shadow-lg hover:shadow-[#4fc3d9]/10"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium leading-6 text-slate-800">
                              {task.title}
                            </p>
                            <button
                              type="button"
                              onClick={() => deleteTask(task.id)}
                              className="flex size-6 shrink-0 items-center justify-center rounded-lg text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                              aria-label={`Delete ${task.title}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
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
                              moveTask(
                                task.id,
                                event.target.value as TaskStatus,
                              )
                            }
                            className="mt-3 w-full rounded-lg border border-slate-100 bg-[#eef4f8] px-2.5 py-2 text-sm text-slate-700 outline-none transition focus:border-[#4fc3d9] focus:bg-white focus:ring-2 focus:ring-[#4fc3d9]/20"
                            aria-label={`Change status of ${task.title}`}
                          >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                          </select>

                          <div className="mt-4 flex items-center justify-between gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}
                            >
                              {task.priority}
                            </span>

                            <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1a2d47] to-[#2a4a6f] text-xs font-semibold text-white shadow-md shadow-[#1a2d47]/20 ring-2 ring-white transition-transform group-hover:scale-110">
                              {task.assignee}
                            </span>
                          </div>
                        </article>
                      ))}

                    {column.tasks.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-[#eef4f8]/50 py-8 text-center">
                        <p className="text-sm text-slate-400">No tasks yet</p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="mt-4 w-full rounded-xl border border-dashed border-slate-300 bg-[#eef4f8]/50 px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:border-[#4fc3d9] hover:bg-[#4fc3d9]/5 hover:text-[#3a9fb5]"
                  >
                    + Add task
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
