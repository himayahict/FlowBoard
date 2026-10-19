"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type TaskStatus = "To Do" | "In Progress" | "Done";

function getLocalDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDueDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

type TaskPriority = "Low" | "Medium" | "High";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  assignee: string;
  status: TaskStatus;
  projectId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  dueDate?: string | null;
};

type Column = {
  title: TaskStatus;
  tasks: Task[];
};

type Workspace = {
  id: string;
  name: string;
  slug: string;
  role?: string;
  projects?: { id: string; name: string }[];
};

type WorkspaceMember = {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
};

const initialColumns: Column[] = [
  { title: "To Do", tasks: [] },
  { title: "In Progress", tasks: [] },
  { title: "Done", tasks: [] },
];

const priorityStyles: Record<TaskPriority, string> = {
  High: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100",
  Medium: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
  Low: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
};

const columnMeta: Record<
  TaskStatus,
  { dot: string; header: string; count: string; bar: string }
> = {
  "To Do": {
    dot: "bg-slate-400",
    header: "text-slate-700",
    count: "bg-slate-100 text-slate-600",
    bar: "bg-slate-300",
  },
  "In Progress": {
    dot: "bg-indigo-500",
    header: "text-slate-700",
    count: "bg-indigo-50 text-indigo-700",
    bar: "bg-indigo-500",
  },
  Done: {
    dot: "bg-emerald-500",
    header: "text-slate-700",
    count: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
  },
};

const statusOptions: TaskStatus[] = ["To Do", "In Progress", "Done"];

export default function Home() {
  const [loggingOut, setLoggingOut] = useState(false);
  const [boardColumns, setBoardColumns] = useState<Column[]>(initialColumns);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("Medium");
  const [taskDueDate, setTaskDueDate] = useState("");
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
  const [editDueDate, setEditDueDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [membersMessage, setMembersMessage] = useState("");
  const [projects, setProjects] = useState<
    { id: string; name: string; description: string | null }[]
  >([]);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [projectsMessage, setProjectsMessage] = useState("");

  const loadTasks = useCallback(async () => {
    if (!selectedWorkspaceId) {
      setBoardColumns(
        statusOptions.map((status) => ({ title: status, tasks: [] })),
      );
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMessage("");
      const taskUrl = new URLSearchParams({
        workspaceId: selectedWorkspaceId,
      });

      if (selectedProjectId) {
        taskUrl.set("projectId", selectedProjectId);
      }

      const response = await fetch(`/api/tasks?${taskUrl.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Failed to load tasks (${response.status})`);
      }
      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("The tasks API did not return a list.");
      }
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
  }, [selectedWorkspaceId, selectedProjectId]);

  const loadMembers = useCallback(async () => {
    if (!selectedWorkspaceId) {
      setMembers([]);
      return;
    }
    try {
      setMembersLoading(true);
      setMembersError("");
      setMembersMessage("");
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(selectedWorkspaceId)}/members`,
        { method: "GET", cache: "no-store" },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Failed to load workspace members.",
        );
      }
      if (!Array.isArray(data)) {
        throw new Error("Members API did not return a list.");
      }
      setMembers(data as WorkspaceMember[]);
    } catch (error) {
      console.error("Load workspace members error:", error);
      setMembersError(
        error instanceof Error
          ? error.message
          : "Failed to load workspace members.",
      );
    } finally {
      setMembersLoading(false);
    }
  }, [selectedWorkspaceId]);

  const loadProjects = useCallback(async () => {
    if (!selectedWorkspaceId) {
  setProjects([]);
  setProjectsLoaded(false);
  return;
}

setProjectsLoading(true);
setProjectsLoaded(false);
setProjectsError("");

    try {
      const response = await fetch(
        `/api/projects?workspaceId=${encodeURIComponent(selectedWorkspaceId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to load projects.";

        throw new Error(message);
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid projects response.");
      }

      setProjects(
        data as {
          id: string;
          name: string;
          description: string | null;
        }[],
      );
    } catch (error) {
      console.error("Failed to load projects:", error);
      setProjectsError(
        error instanceof Error ? error.message : "Failed to load projects.",
      );
    } finally {
      setProjectsLoading(false);
      setProjectsLoaded(true);
    }
  }, [selectedWorkspaceId]);

  const createProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedWorkspaceId || !projectName.trim()) {
      setProjectsError("Enter a project name first.");
      return;
    }

    if (projectSaving) return;

    setProjectSaving(true);
    setProjectsError("");
    setProjectsMessage("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          workspaceId: selectedWorkspaceId,
        }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to create project.";

        throw new Error(message);
      }

      setProjectName("");
      setProjectDescription("");
      setProjectsMessage("Project created successfully.");

      await loadProjects();
    } catch (error) {
      console.error("Failed to create project:", error);
      setProjectsError(
        error instanceof Error ? error.message : "Failed to create project.",
      );
    } finally {
      setProjectSaving(false);
    }
  };

  async function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWorkspaceId || !memberEmail.trim() || memberSaving) return;
    try {
      setMemberSaving(true);
      setMembersError("");
      setMembersMessage("");
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(selectedWorkspaceId)}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: memberEmail.trim(), role: memberRole }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Failed to add workspace member.",
        );
      }
      setMemberEmail("");
      setMemberRole("MEMBER");
      setMembersMessage("Member added successfully.");
      await loadMembers();
    } catch (error) {
      console.error("Add workspace member error:", error);
      setMembersError(
        error instanceof Error
          ? error.message
          : "Failed to add workspace member.",
      );
    } finally {
      setMemberSaving(false);
    }
  }

  async function changeMemberRole(
    member: WorkspaceMember,
    role: "MEMBER" | "ADMIN",
  ) {
    if (!selectedWorkspaceId || memberSaving) return;
    try {
      setMemberSaving(true);
      setMembersError("");
      setMembersMessage("");
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(selectedWorkspaceId)}/members`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: member.id, role }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Failed to update member role.",
        );
      }
      setMembersMessage("Member role updated successfully.");
      await loadMembers();
    } catch (error) {
      console.error("Change member role error:", error);
      setMembersError(
        error instanceof Error
          ? error.message
          : "Failed to update member role.",
      );
    } finally {
      setMemberSaving(false);
    }
  }

  async function removeMember(member: WorkspaceMember) {
    if (!selectedWorkspaceId || memberSaving) return;
    const confirmed = window.confirm(
      `Are you sure you want to remove ${member.user.email} from this workspace?`,
    );
    if (!confirmed) return;
    try {
      setMemberSaving(true);
      setMembersError("");
      setMembersMessage("");
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(selectedWorkspaceId)}/members`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: member.id }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Failed to remove workspace member.",
        );
      }
      setMembersMessage("Member removed successfully.");
      await loadMembers();
    } catch (error) {
      console.error("Remove workspace member error:", error);
      setMembersError(
        error instanceof Error
          ? error.message
          : "Failed to remove workspace member.",
      );
    } finally {
      setMemberSaving(false);
    }
  }

  const loadWorkspaces = useCallback(async () => {
    try {
      setWorkspaceError("");
      const response = await fetch("/api/workspaces", {
        method: "GET",
        cache: "no-store",
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(`Failed to load workspaces (${response.status})`);
      }
      if (!Array.isArray(data)) {
        throw new Error("Workspace API did not return a list.");
      }
      const workspaceList = (
        data as Array<Workspace & { members?: { role: string }[] }>
      ).map((workspace) => ({
        ...workspace,
        role: workspace.members?.[0]?.role ?? "MEMBER",
      }));
      setWorkspaces(workspaceList);

      const savedWorkspaceId = localStorage.getItem(
        "flowboard:selectedWorkspaceId",
      );

      setSelectedWorkspaceId((currentId) => {
        if (workspaceList.some((workspace) => workspace.id === currentId)) {
          return currentId;
        }

        if (
          savedWorkspaceId &&
          workspaceList.some((workspace) => workspace.id === savedWorkspaceId)
        ) {
          return savedWorkspaceId;
        }

        return workspaceList[0]?.id ?? "";
      });
    } catch (error) {
      console.error("Load workspaces error:", error);
      setWorkspaceError(
        error instanceof Error ? error.message : "Failed to load workspaces.",
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  async function createWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name || workspaceSaving) return;
    try {
      setWorkspaceSaving(true);
      setWorkspaceError("");
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : `Failed to create workspace (${response.status})`;
        throw new Error(message);
      }
      await loadWorkspaces();
      setWorkspaceName("");
      if (
        typeof data === "object" &&
        data !== null &&
        "id" in data &&
        typeof data.id === "string"
      ) {
        setSelectedWorkspaceId(data.id);
      }
    } catch (error) {
      console.error("Create workspace error:", error);
      setWorkspaceError(
        error instanceof Error ? error.message : "Failed to create workspace.",
      );
    } finally {
      setWorkspaceSaving(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadTasks());
  }, [loadTasks]);

  useEffect(() => {
    void Promise.resolve().then(() => loadWorkspaces());
  }, [loadWorkspaces]);

  useEffect(() => {
    void Promise.resolve().then(() => loadMembers());
  }, [loadMembers]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
   if (!projectsLoaded || projectsLoading || !selectedWorkspaceId) {
  return;
}
    const savedProjectId = localStorage.getItem("flowboard:selectedProjectId");

    if (
      savedProjectId &&
      projects.some((project) => project.id === savedProjectId)
    ) {
      setSelectedProjectId(savedProjectId);
    } else {
      setSelectedProjectId("");
      localStorage.removeItem("flowboard:selectedProjectId");
    }
  }, [projects, projectsLoaded, projectsLoading, selectedWorkspaceId]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setErrorMessage("");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        throw new Error(result.error.message || "Logout failed.");
      }
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
    if (!selectedWorkspaceId) {
      setErrorMessage("Please select a workspace before adding a task.");
      return;
    }
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
          dueDate: taskDueDate || null,
          workspaceId: selectedWorkspaceId,
          projectId: selectedProjectId || null,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          result?.error ?? `Failed to create task (${response.status})`,
        );
      }
      await loadTasks();
      setTaskTitle("");
      setTaskPriority("Medium");
      setTaskDueDate("");
    } catch (error) {
      console.error("Add task error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save the task to the database.",
      );
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
    setEditDueDate(task.dueDate?.slice(0, 10) ?? "");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: editDescription.trim() || null,
          priority: editPriority,
          assignee,
          status: editStatus,
          dueDate: editDueDate || null,
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
  const completionRate =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const stats = [
    {
      label: "Total Tasks",
      value: totalTasks,
      tone: "text-indigo-600",
      bg: "bg-indigo-50",
      ring: "ring-indigo-100",
      icon: (
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      ),
    },
    {
      label: "In Progress",
      value: inProgressTasks,
      tone: "text-amber-600",
      bg: "bg-amber-50",
      ring: "ring-amber-100",
      icon: (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </>
      ),
    },
    {
      label: "Completed",
      value: completedTasks,
      tone: "text-emerald-600",
      bg: "bg-emerald-50",
      ring: "ring-emerald-100",
      icon: (
        <>
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <path d="M22 4L12 14.01l-3-3" />
        </>
      ),
    },
    {
      label: "Team Members",
      value: members.length,
      tone: "text-fuchsia-600",
      bg: "bg-fuchsia-50",
      ring: "ring-fuchsia-100",
      icon: (
        <>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </>
      ),
    },
  ];

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-800 antialiased">
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out both;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 999px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={saveEditedTask}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-task-title"
            className="my-auto w-full max-w-lg animate-fade-in overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2
                  id="edit-task-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Edit task
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Update task details and save changes.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEditingTask}
                disabled={editSaving}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="size-4"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <label
                  htmlFor="edit-title"
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                >
                  Title
                </label>
                <input
                  id="edit-title"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  maxLength={200}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-description"
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-due-date"
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                >
                  Due date
                </label>
                <div className="flex gap-2">
                  <input
                    id="edit-due-date"
                    type="date"
                    value={editDueDate}
                    onChange={(event) => setEditDueDate(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                  <button
                    type="button"
                    onClick={() => setEditDueDate("")}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-priority"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    Priority
                  </label>
                  <select
                    id="edit-priority"
                    value={editPriority}
                    onChange={(event) =>
                      setEditPriority(event.target.value as TaskPriority)
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-status"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    Status
                  </label>
                  <select
                    id="edit-status"
                    value={editStatus}
                    onChange={(event) =>
                      setEditStatus(event.target.value as TaskStatus)
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
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
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                >
                  Assignee
                </label>
                <input
                  id="edit-assignee"
                  value={editAssignee}
                  onChange={(event) => setEditAssignee(event.target.value)}
                  maxLength={50}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-100"
                >
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                onClick={cancelEditingTask}
                disabled={editSaving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {editSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex h-screen overflow-hidden">
        {/* SIDEBAR — LIGHT THEME */}
        <aside className="scrollbar-thin hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200/80 bg-white px-3 py-4 md:flex">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-slate-900">
                FlowBoard
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
                Workspace
              </p>
            </div>
          </div>

          {/* Primary nav */}
          <nav className="mt-6 space-y-0.5">
            <a
              href="#dashboard"
              aria-current="page"
              className="flex items-center gap-2.5 rounded-lg bg-indigo-50 px-2.5 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100/70"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 text-indigo-500"
              >
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
              Dashboard
            </a>
            <div
              className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-400"
              title="Coming soon"
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
                <path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="10" cy="7" r="4" />
                <path d="M20 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              Members
              <span className="ml-auto rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                Soon
              </span>
            </div>
          </nav>

          {/* Divider */}
          <div className="my-4 h-px bg-slate-100" />

          {/* Workspace selector */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <label
              htmlFor="workspace-selector"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500"
            >
              Workspace
            </label>
            {workspaceLoading ? (
              <p className="text-xs text-slate-400">Loading...</p>
            ) : (
              <select
                id="workspace-selector"
                value={selectedWorkspaceId}
                onChange={(event) => {
                  const workspaceId = event.target.value;

                  setSelectedWorkspaceId(workspaceId);
                  setSelectedProjectId("");

                  localStorage.setItem(
                    "flowboard:selectedWorkspaceId",
                    workspaceId,
                  );
                  localStorage.removeItem("flowboard:selectedProjectId");
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              >
                {workspaces.length === 0 && (
                  <option value="">No workspaces</option>
                )}
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            )}
            {workspaceError && (
              <p role="alert" className="mt-1.5 text-[11px] text-rose-600">
                {workspaceError}
              </p>
            )}
            <form onSubmit={createWorkspace} className="mt-2 space-y-1.5">
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="New workspace name"
                aria-label="New workspace name"
                maxLength={100}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none placeholder:text-slate-400 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
              <button
                type="submit"
                disabled={workspaceSaving || !workspaceName.trim()}
                className="w-full rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {workspaceSaving ? "Creating..." : "Create workspace"}
              </button>
            </form>
          </div>

          {/* Projects */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5 text-indigo-500"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M8 8h8M8 12h8M8 16h4" />
                </svg>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Projects
                </h3>
              </div>
              <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                {projects.length}
              </span>
            </div>

            {/* Create toggle — only for OWNER/ADMIN */}
            {["OWNER", "ADMIN"].includes(
              workspaces.find(
                (workspace) => workspace.id === selectedWorkspaceId,
              )?.role ?? "",
            ) &&
              (() => {
                const isCreating = projectSaving || projectName.trim() !== "";
                return (
                  <form
                    onSubmit={createProject}
                    className="mb-3 rounded-lg border border-slate-200 bg-white p-2.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="size-3.5 shrink-0 text-slate-400"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <input
                        id="projectName"
                        type="text"
                        value={projectName}
                        onChange={(event) => setProjectName(event.target.value)}
                        placeholder="New project name..."
                        maxLength={100}
                        required
                        disabled={!selectedWorkspaceId || projectSaving}
                        className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={
                          !selectedWorkspaceId ||
                          !projectName.trim() ||
                          projectSaving
                        }
                        className="rounded-md bg-indigo-600 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {projectSaving ? "Creating..." : "Add"}
                      </button>
                    </div>

                    {isCreating && (
                      <textarea
                        id="projectDescription"
                        value={projectDescription}
                        onChange={(event) =>
                          setProjectDescription(event.target.value)
                        }
                        placeholder="Optional description..."
                        maxLength={1000}
                        rows={2}
                        disabled={projectSaving}
                        className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 disabled:opacity-50"
                      />
                    )}
                  </form>
                );
              })()}

            {/* Messages */}
            {projectsError && (
              <p className="mb-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700 ring-1 ring-inset ring-rose-100">
                {projectsError}
              </p>
            )}

            {projectsMessage && (
              <p className="mb-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-700 ring-1 ring-inset ring-emerald-100">
                {projectsMessage}
              </p>
            )}

            {/* List */}
            {projectsLoading ? (
              <div className="space-y-1.5">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-lg border border-slate-200 bg-white p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-md bg-slate-200" />
                      <div className="flex-1 space-y-1">
                        <div className="h-2 w-2/3 rounded bg-slate-200" />
                        <div className="h-2 w-1/2 rounded bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white/50 px-3 py-5 text-center">
                <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 ring-1 ring-inset ring-indigo-100">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <path d="M8 8h8M8 12h8M8 16h4" />
                  </svg>
                </div>
                <p className="text-[11px] font-medium text-slate-600">
                  No projects yet
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Create one to get started
                </p>
              </div>
            ) : (
              <div className="scrollbar-thin max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {projects.map((project, index) => {
                  const palettes = [
                    "from-indigo-500 to-violet-600",
                    "from-emerald-500 to-teal-600",
                    "from-amber-500 to-orange-600",
                    "from-rose-500 to-pink-600",
                    "from-cyan-500 to-blue-600",
                  ];
                  const palette = palettes[index % palettes.length];

                  return (
                    <article
                      key={project.id}
                      className="group rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-indigo-200 hover:shadow-sm"
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${palette} text-white shadow-sm`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-3.5"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="3" />
                            <path d="M8 8h8M8 12h8M8 16h4" />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-xs font-semibold text-slate-800">
                            {project.name}
                          </h4>
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                            {project.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Members */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Members
              </h3>
              <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                {members.length}
              </span>
            </div>

            {membersLoading ? (
              <p className="text-xs text-slate-400">Loading...</p>
            ) : membersError ? (
              <p className="text-xs text-rose-600">{membersError}</p>
            ) : members.length === 0 ? (
              <p className="text-xs text-slate-400">No members yet</p>
            ) : (
              <div className="scrollbar-thin max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {members.map((member) => {
                  const currentRole = workspaces.find(
                    (w) => w.id === selectedWorkspaceId,
                  )?.role;
                  const isOwner = currentRole === "OWNER";
                  const isAdmin = currentRole === "ADMIN";
                  const isTargetOwner = member.role === "OWNER";
                  const canChangeRole = isOwner && !isTargetOwner;
                  const canRemoveMember =
                    !isTargetOwner &&
                    (isOwner || (isAdmin && member.role === "MEMBER"));

                  return (
                    <div
                      key={member.id}
                      className="rounded-lg border border-slate-200 bg-white p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-semibold text-white">
                          {member.user.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-slate-800">
                            {member.user.name}
                          </p>
                          <p className="truncate text-[10px] text-slate-400">
                            {member.user.email}
                          </p>
                        </div>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-1.5">
                        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                          {member.role}
                        </span>

                        {(canChangeRole || canRemoveMember) && (
                          <div className="flex items-center gap-1">
                            {canChangeRole && (
                              <select
                                aria-label={`Change role for ${member.user.email}`}
                                value={member.role}
                                disabled={memberSaving}
                                onChange={(event) =>
                                  changeMemberRole(
                                    member,
                                    event.target.value as "MEMBER" | "ADMIN",
                                  )
                                }
                                className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-600 outline-none focus:border-indigo-500 disabled:opacity-50"
                              >
                                <option value="MEMBER">Member</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                            )}
                            {canRemoveMember && (
                              <button
                                type="button"
                                disabled={memberSaving}
                                onClick={() => removeMember(member)}
                                className="rounded border border-rose-100 bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {membersMessage && (
              <p className="mt-2 text-[11px] text-emerald-600">
                {membersMessage}
              </p>
            )}

            <form onSubmit={addMember} className="mt-2.5 space-y-1.5">
              <input
                id="member-email"
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="member@example.com"
                aria-label="Member email"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none placeholder:text-slate-400 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
              <select
                aria-label="Member role"
                value={memberRole}
                onChange={(event) =>
                  setMemberRole(event.target.value as "MEMBER" | "ADMIN")
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button
                type="submit"
                disabled={memberSaving || !selectedWorkspaceId}
                className="w-full rounded-lg bg-indigo-600 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {memberSaving ? "Adding..." : "+ Add member"}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4">
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-3">
              <div className="flex items-center gap-1.5">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                <p className="text-xs font-semibold text-slate-800">
                  Free workspace
                </p>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                Upgrade for more features.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
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
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur-xl md:px-8">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium">Workspace</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-3 text-slate-300"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              <span className="font-semibold text-slate-800">Dashboard</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
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
                  className="w-56 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white shadow-sm ring-2 ring-white">
                SH
              </div>
            </div>
          </header>

          {/* Scrollable content */}
          <div className="scrollbar-thin flex-1 overflow-y-auto bg-slate-50/50">
            <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
              {/* Page header */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                    <span className="size-1.5 animate-pulse rounded-full bg-indigo-500" />
                    Live workspace
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                    Project Dashboard
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Plan your work. Track your progress. Ship faster.
                  </p>
                </div>

                {/* Completion chip */}
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="relative flex size-10 items-center justify-center">
                    <svg viewBox="0 0 36 36" className="size-10 -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="3"
                        strokeDasharray={`${(completionRate / 100) * 94.2} 94.2`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-slate-700">
                      {completionRate}%
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      Completion
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {completedTasks} of {totalTasks}
                    </p>
                  </div>
                </div>
              </div>

              {/* Add task form */}
              <form
                onSubmit={addTask}
                className="mt-6 flex flex-wrap items-stretch gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
              >
                <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-transparent bg-slate-50 px-3 py-2 transition focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/15">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="size-4 shrink-0 text-slate-400"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <input
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder="Add a new task..."
                    aria-label="Task name"
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(event) => setTaskDueDate(event.target.value)}
                  aria-label="Task due date"
                  title="Optional task due date"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                />

                <select
                  value={selectedProjectId}
                  onChange={(event) => {
                    const projectId = event.target.value;

                    setSelectedProjectId(projectId);

                    if (projectId) {
                      localStorage.setItem(
                        "flowboard:selectedProjectId",
                        projectId,
                      );
                    } else {
                      localStorage.removeItem("flowboard:selectedProjectId");
                    }
                  }}
                  aria-label="Task project"
                  title="Optional task project"
                  disabled={!selectedWorkspaceId || projectsLoading}
                  className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {projectsLoading
                      ? "Loading projects..."
                      : "No project (optional)"}
                  </option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <select
                  value={taskPriority}
                  onChange={(event) =>
                    setTaskPriority(event.target.value as TaskPriority)
                  }
                  aria-label="Task priority"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !taskTitle.trim() ||
                    !selectedWorkspaceId ||
                    workspaceLoading
                  }
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add task"}
                </button>
              </form>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  <span>{errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => void loadTasks()}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-rose-50"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="animate-fade-in flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                  >
                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.tone} ring-1 ring-inset ${stat.ring}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-5"
                      >
                        {stat.icon}
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        {stat.label}
                      </p>
                      <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Board */}
              <div className="mt-8">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Website Development
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {totalTasks} task{totalTasks === 1 ? "" : "s"} ·{" "}
                      {completedTasks} completed
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                    <div className="mx-auto size-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
                    <p className="mt-3 text-sm text-slate-500">
                      Loading tasks...
                    </p>
                  </div>
                ) : (
                  <div className="grid items-start gap-4 lg:grid-cols-3">
                    {boardColumns.map((column) => {
                      const visibleTasks = column.tasks.filter((task) =>
                        task.title
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()),
                      );
                      const meta = columnMeta[column.title];

                      return (
                        <div
                          key={column.title}
                          className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                        >
                          {/* Colored top bar */}
                          <div className={`h-1 ${meta.bar}`} />

                          {/* Column header */}
                          <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`size-2 rounded-full ${meta.dot}`}
                              />
                              <h4
                                className={`text-sm font-semibold ${meta.header}`}
                              >
                                {column.title}
                              </h4>
                            </div>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.count}`}
                            >
                              {visibleTasks.length}
                            </span>
                          </div>

                          {/* Tasks */}
                          <div className="space-y-2 p-2.5">
                            {visibleTasks.map((task) => {
                              const isOverdue =
                                task.dueDate &&
                                task.status !== "Done" &&
                                task.dueDate.slice(0, 10) <
                                  getLocalDateString();
                              const isDueToday =
                                task.dueDate &&
                                task.status !== "Done" &&
                                task.dueDate.slice(0, 10) ===
                                  getLocalDateString();

                              return (
                                <article
                                  key={task.id}
                                  className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium leading-5 text-slate-800">
                                      {task.title}
                                    </p>
                                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                      <button
                                        type="button"
                                        onClick={() => startEditingTask(task)}
                                        title="Edit task"
                                        aria-label={`Edit ${task.title}`}
                                        className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                                      >
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="size-3.5"
                                        >
                                          <path d="M12 20h9" />
                                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void deleteTask(task.id)}
                                        title="Delete task"
                                        aria-label={`Delete ${task.title}`}
                                        className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                      >
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="size-3.5"
                                        >
                                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>

                                  {task.description && (
                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                      {task.description}
                                    </p>
                                  )}

                                  {task.dueDate && (
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                                          isOverdue
                                            ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100"
                                            : isDueToday
                                              ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100"
                                              : "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-100"
                                        }`}
                                      >
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          className="size-3"
                                        >
                                          <rect
                                            x="3"
                                            y="4"
                                            width="18"
                                            height="18"
                                            rx="2"
                                          />
                                          <path d="M16 2v4M8 2v4M3 10h18" />
                                        </svg>
                                        {formatDueDate(task.dueDate)}
                                      </span>
                                      {isOverdue && (
                                        <span className="text-[11px] font-medium text-rose-600">
                                          Overdue
                                        </span>
                                      )}
                                      {isDueToday && (
                                        <span className="text-[11px] font-medium text-amber-600">
                                          Due today
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-3 flex items-center justify-between gap-2">
                                    <span
                                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityStyles[task.priority] ?? priorityStyles.Medium}`}
                                    >
                                      {task.priority}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={column.title}
                                        onChange={(event) =>
                                          void moveTask(
                                            task.id,
                                            event.target.value as TaskStatus,
                                          )
                                        }
                                        aria-label={`Change status of ${task.title}`}
                                        className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                                      >
                                        {statusOptions.map((status) => (
                                          <option key={status} value={status}>
                                            {status}
                                          </option>
                                        ))}
                                      </select>
                                      <span
                                        title={`Assignee: ${task.assignee}`}
                                        className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-semibold text-white shadow-sm ring-2 ring-white"
                                      >
                                        {task.assignee}
                                      </span>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}

                            {visibleTasks.length === 0 && (
                              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center">
                                <p className="text-xs text-slate-400">
                                  {searchTerm
                                    ? "No matching tasks"
                                    : "No tasks yet"}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="border-t border-slate-100 p-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setTaskTitle("");
                                setTaskPriority("Medium");
                                setTaskDueDate("");
                                document
                                  .querySelector<HTMLInputElement>(
                                    'input[aria-label="Task name"]',
                                  )
                                  ?.focus();
                              }}
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                className="size-3.5"
                              >
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                              Add task
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
