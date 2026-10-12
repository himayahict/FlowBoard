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
      {
        id: 1,
        title: "Design login page",
        priority: "High",
        assignee: "SH",
      },
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
      {
        id: 3,
        title: "Build dashboard UI",
        priority: "High",
        assignee: "SH",
      },
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

export default function Home() {
  const [boardColumns, setBoardColumns] = useState<Column[]>(columns);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("Medium");

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

      if (!selectedTask) {
        return currentColumns;
      }

      return currentColumns.map((column) => {
        const remainingTasks = column.tasks.filter(
          (task) => task.id !== taskId,
        );

        if (column.title === newStatus) {
          return {
            ...column,
            tasks: [...remainingTasks, selectedTask],
          };
        }

        return {
          ...column,
          tasks: remainingTasks,
        };
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

  const totalTasks = boardColumns.reduce(
    (total, column) => total + column.tasks.length,
    0,
  );

  const inProgressTasks =
    boardColumns.find((column) => column.title === "In Progress")?.tasks
      .length ?? 0;

  const completedTasks =
    boardColumns.find((column) => column.title === "Done")?.tasks.length ?? 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 p-6 md:block">
          <h1 className="text-2xl font-bold tracking-tight">
            Flow<span className="text-blue-400">Board</span>
          </h1>

          <p className="mt-2 text-sm text-slate-400">Project workspace</p>

          <nav className="mt-10 space-y-2">
            <div className="rounded-lg bg-blue-500/15 px-4 py-3 text-blue-300">
              Overview
            </div>
            <div className="rounded-lg px-4 py-3 text-slate-400">My Tasks</div>
            <div className="rounded-lg px-4 py-3 text-slate-400">Projects</div>
            <div className="rounded-lg px-4 py-3 text-slate-400">
              Team Members
            </div>
            <div className="rounded-lg px-4 py-3 text-slate-400">Settings</div>
          </nav>

          <div className="mt-12 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm font-medium">Free workspace</p>
            <p className="mt-2 text-xs text-slate-400">
              Your team workspace starts here.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-5 md:p-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Workspace / Overview</p>
              <h2 className="mt-2 text-3xl font-bold">Project Dashboard</h2>
              <p className="mt-2 text-slate-400">
                Plan your work. Track your progress.
              </p>
            </div>

            <form
              className="flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                addTask();
              }}
            >
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Enter task name..."
                className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              <select
                value={taskPriority}
                onChange={(event) =>
                  setTaskPriority(event.target.value as Task["priority"])
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
              >
                + Add Task
              </button>
            </form>
          </header>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Tasks", value: totalTasks },
              { label: "In Progress", value: inProgressTasks },
              { label: "Completed", value: completedTasks },
              { label: "Team Members", value: 3 },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className="mt-3 text-3xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">Website Development</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Sample project board
                </p>
              </div>

              <span className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">
                All tasks
              </span>
            </div>

            <div className="grid items-start gap-5 lg:grid-cols-3">
              {boardColumns.map((column) => (
                <div
                  key={column.title}
                  className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-semibold">{column.title}</h4>
                    <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">
                      {column.tasks.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {column.tasks.map((task) => (
                      <article
                        key={task.id}
                        className="rounded-lg border border-slate-800 bg-slate-950 p-4 transition hover:border-slate-600"
                      >
                        <p className="font-medium leading-6">{task.title}</p>

                        <select
                          value={column.title}
                          onChange={(event) =>
                            moveTask(task.id, event.target.value as TaskStatus)
                          }
                          className="mt-3 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
                          aria-label={`Change status of ${task.title}`}
                        >
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Done">Done</option>
                        </select>

                        <div className="mt-4 flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs ${
                              task.priority === "High"
                                ? "bg-red-500/15 text-red-300"
                                : task.priority === "Medium"
                                  ? "bg-amber-500/15 text-amber-300"
                                  : "bg-emerald-500/15 text-emerald-300"
                            }`}
                          >
                            {task.priority}
                          </span>

                          <span className="flex size-8 items-center justify-center rounded-full bg-blue-500/20 text-xs font-semibold text-blue-300">
                            {task.assignee}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="mt-3 text-sm text-red-400 hover:text-red-300"
                        >
                          Delete task
                        </button>
                      </article>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="mt-4 w-full rounded-lg border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:border-blue-500 hover:text-blue-300"
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
