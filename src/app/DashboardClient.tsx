"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type TaskStatus = "To Do" | "In Progress" | "Done";
type TaskPriority = "Low" | "Medium" | "High";

type Subtask = {
  id: string;
  title: string;
  completed: boolean;
  taskId: string;
  createdAt?: string;
  updatedAt?: string;
};

type Task = {
  id: string;
  title: string;
  description?: string | null;
  labels?: string[];
  priority: TaskPriority;
  assignee: string;
  assigneeId?: string | null;
  user?: { id: string; name: string; email: string } | null;
  status: TaskStatus;
  projectId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  dueDate?: string | null;
  subtasks?: Subtask[];
};

type Column = { title: TaskStatus; tasks: Task[] };

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
  user: { id: string; name: string; email: string; image?: string | null };
};

const initialColumns: Column[] = [
  { title: "To Do", tasks: [] },
  { title: "In Progress", tasks: [] },
  { title: "Done", tasks: [] },
];

const statusOptions: TaskStatus[] = ["To Do", "In Progress", "Done"];

const priorityStyles: Record<TaskPriority, string> = {
  High: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/70",
  Medium: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70",
  Low: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70",
};

const columnMeta: Record<TaskStatus, { dot: string; text: string; rail: string; count: string }> = {
  "To Do": { dot: "bg-slate-400", text: "text-slate-700", rail: "bg-slate-300", count: "bg-slate-100 text-slate-600" },
  "In Progress": { dot: "bg-slate-700", text: "text-slate-800", rail: "bg-slate-600", count: "bg-slate-200 text-slate-700" },
  Done: { dot: "bg-emerald-500", text: "text-emerald-700", rail: "bg-emerald-500", count: "bg-emerald-50 text-emerald-700" },
};

function getLocalDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatDueDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

function getInitials(name?: string | null, fallback = "U"): string {
  const initials = (name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return initials || fallback;
}

function avatarColor(seed: string): string {
  const palettes = [
    "from-slate-500 to-slate-700", "from-zinc-500 to-zinc-700", "from-stone-500 to-stone-700",
    "from-neutral-500 to-neutral-700", "from-gray-500 to-gray-700", "from-slate-600 to-slate-800", "from-zinc-600 to-zinc-800",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) { hash = (hash << 5) - hash + seed.charCodeAt(i); hash |= 0; }
  return palettes[Math.abs(hash) % palettes.length];
}

export default function Home() {
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;
  const [loggingOut, setLoggingOut] = useState(false);
  const [boardColumns, setBoardColumns] = useState<Column[]>(initialColumns);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("Medium");
  const [taskLabels, setTaskLabels] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [dueDateFilter, setDueDateFilter] = useState("All");
  const [creatorFilter, setCreatorFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLabels, setEditLabels] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("Medium");
  const [editAssignee, setEditAssignee] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");
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
  const [projects, setProjects] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [projectsMessage, setProjectsMessage] = useState("");
  const [editingProjectId, setEditingProjectId] = useState("");
  const [editingProjectName, setEditingProjectName] = useState("");
  const [editingProjectDescription, setEditingProjectDescription] = useState("");
  const [projectUpdating, setProjectUpdating] = useState(false);
  const [projectDeletingId, setProjectDeletingId] = useState("");
  const [subtaskTitles, setSubtaskTitles] = useState<Record<string, string>>({});
  const [subtaskSaving, setSubtaskSaving] = useState<string | null>(null);
  const [subtaskError, setSubtaskError] = useState("");
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!selectedWorkspaceId) {
      setBoardColumns(statusOptions.map((status) => ({ title: status, tasks: [] })));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMessage("");
      const taskUrl = new URLSearchParams({ workspaceId: selectedWorkspaceId });
      if (selectedProjectId) taskUrl.set("projectId", selectedProjectId);
      const response = await fetch(`/api/tasks?${taskUrl.toString()}`, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load tasks (${response.status})`);
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("The tasks API did not return a list.");
      const tasks = data as Task[];
      setBoardColumns(statusOptions.map((status) => ({ title: status, tasks: tasks.filter((t) => t.status === status) })));
    } catch (error) {
      console.error("Load tasks error:", error);
      setErrorMessage("Failed to load tasks. Please check the server and API.");
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspaceId, selectedProjectId]);

  const loadMembers = useCallback(async () => {
    if (!selectedWorkspaceId) { setMembers([]); return; }
    try {
      setMembersLoading(true); setMembersError(""); setMembersMessage("");
      const response = await fetch(`/api/workspaces/${encodeURIComponent(selectedWorkspaceId)}/members`, { method: "GET", cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed to load workspace members.");
      if (!Array.isArray(data)) throw new Error("Members API did not return a list.");
      setMembers(data as WorkspaceMember[]);
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Failed to load workspace members.");
    } finally { setMembersLoading(false); }
  }, [selectedWorkspaceId]);

  const loadProjects = useCallback(async () => {
    if (!selectedWorkspaceId) { setProjects([]); setProjectsLoaded(false); return; }
    setProjectsLoading(true); setProjectsLoaded(false); setProjectsError("");
    try {
      const response = await fetch(`/api/projects?workspaceId=${encodeURIComponent(selectedWorkspaceId)}`, { method: "GET", cache: "no-store" });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "Failed to load projects.";
        throw new Error(message);
      }
      if (!Array.isArray(data)) throw new Error("Invalid projects response.");
      setProjects(data as { id: string; name: string; description: string | null }[]);
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : "Failed to load projects.");
    } finally { setProjectsLoading(false); setProjectsLoaded(true); }
  }, [selectedWorkspaceId]);

  const createProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedWorkspaceId || !projectName.trim()) { setProjectsError("Enter a project name first."); return; }
    if (projectSaving) return;
    setProjectSaving(true); setProjectsError(""); setProjectsMessage("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim(), description: projectDescription.trim() || null, workspaceId: selectedWorkspaceId }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "Failed to create project.";
        throw new Error(message);
      }
      setProjectName(""); setProjectDescription(""); setProjectsMessage("Project created successfully.");
      await loadProjects();
    } catch (error) {
      setProjectsError(error instanceof Error ? error.message : "Failed to create project.");
    } finally { setProjectSaving(false); }
  };

  const updateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingProjectId || !editingProjectName.trim()) {
      setProjectsError("Enter a project name first.");
      return;
    }

    if (projectUpdating) return;

    setProjectUpdating(true);
    setProjectsError("");
    setProjectsMessage("");

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(editingProjectId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editingProjectName.trim(),
            description: editingProjectDescription.trim() || null,
          }),
        }
      );

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to update project.";

        throw new Error(message);
      }

      await loadProjects();

      setEditingProjectId("");
      setEditingProjectName("");
      setEditingProjectDescription("");
      setProjectsMessage("Project updated successfully.");
    } catch (error) {
      setProjectsError(
        error instanceof Error ? error.message : "Failed to update project."
      );
    } finally {
      setProjectUpdating(false);
    }
  };

  const deleteProject = async (project: {
    id: string;
    name: string;
    description: string | null;
  }) => {
    if (projectDeletingId) return;

    const confirmed = window.confirm(
      `Delete project "${project.name}"? Tasks in this project will remain in the workspace.`
    );

    if (!confirmed) return;

    setProjectDeletingId(project.id);
    setProjectsError("");
    setProjectsMessage("");

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(project.id)}`,
        { method: "DELETE" }
      );

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to delete project.";

        throw new Error(message);
      }

      if (editingProjectId === project.id) {
        setEditingProjectId("");
        setEditingProjectName("");
        setEditingProjectDescription("");
      }

      if (selectedProjectId === project.id) {
        setSelectedProjectId("");
        localStorage.removeItem("flowboard:selectedProjectId");
      }

      await loadProjects();
      setProjectsMessage(
        "Project deleted. Its tasks should remain in the workspace."
      );
    } catch (error) {
      setProjectsError(
        error instanceof Error ? error.message : "Failed to delete project."
      );
    } finally {
      setProjectDeletingId("");
    }
  };
  async function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWorkspaceId || !memberEmail.trim() || memberSaving) return;
    try {
      setMemberSaving(true); setMembersError(""); setMembersMessage("");
      const response = await fetch(`/api/workspaces/${encodeURIComponent(selectedWorkspaceId)}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail.trim(), role: memberRole }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed to add workspace member.");
      setMemberEmail(""); setMemberRole("MEMBER"); setMembersMessage("Member added successfully.");
      await loadMembers();
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Failed to add workspace member.");
    } finally { setMemberSaving(false); }
  }

  async function changeMemberRole(member: WorkspaceMember, role: "MEMBER" | "ADMIN") {
    if (!selectedWorkspaceId || memberSaving) return;
    try {
      setMemberSaving(true); setMembersError(""); setMembersMessage("");
      const response = await fetch(`/api/workspaces/${encodeURIComponent(selectedWorkspaceId)}/members`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, role }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed to update member role.");
      setMembersMessage("Member role updated successfully.");
      await loadMembers();
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Failed to update member role.");
    } finally { setMemberSaving(false); }
  }

  async function removeMember(member: WorkspaceMember) {
    if (!selectedWorkspaceId || memberSaving) return;
    if (!window.confirm(`Are you sure you want to remove ${member.user.email} from this workspace?`)) return;
    try {
      setMemberSaving(true); setMembersError(""); setMembersMessage("");
      const response = await fetch(`/api/workspaces/${encodeURIComponent(selectedWorkspaceId)}/members`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed to remove workspace member.");
      setMembersMessage("Member removed successfully.");
      await loadMembers();
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : "Failed to remove workspace member.");
    } finally { setMemberSaving(false); }
  }

  const loadWorkspaces = useCallback(async () => {
    try {
      setWorkspaceError("");
      const response = await fetch("/api/workspaces", { method: "GET", cache: "no-store" });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(`Failed to load workspaces (${response.status})`);
      if (!Array.isArray(data)) throw new Error("Workspace API did not return a list.");
      const workspaceList = (data as Array<Workspace & { members?: { role: string }[] }>).map((w) => ({ ...w, role: w.members?.[0]?.role ?? "MEMBER" }));
      setWorkspaces(workspaceList);
      const savedWorkspaceId = localStorage.getItem("flowboard:selectedWorkspaceId");
      setSelectedWorkspaceId((currentId) => {
        if (workspaceList.some((w) => w.id === currentId)) return currentId;
        if (savedWorkspaceId && workspaceList.some((w) => w.id === savedWorkspaceId)) return savedWorkspaceId;
        return workspaceList[0]?.id ?? "";
      });
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to load workspaces.");
    } finally { setWorkspaceLoading(false); }
  }, []);

  async function createWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name || workspaceSaving) return;
    try {
      setWorkspaceSaving(true); setWorkspaceError("");
      const response = await fetch("/api/workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : `Failed to create workspace (${response.status})`;
        throw new Error(message);
      }
      await loadWorkspaces();
      setWorkspaceName("");
      if (typeof data === "object" && data !== null && "id" in data && typeof data.id === "string") setSelectedWorkspaceId(data.id);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Failed to create workspace.");
    } finally { setWorkspaceSaving(false); }
  }

  useEffect(() => { void Promise.resolve().then(() => loadTasks()); }, [loadTasks]);
  useEffect(() => { void Promise.resolve().then(() => loadWorkspaces()); }, [loadWorkspaces]);
  useEffect(() => { void Promise.resolve().then(() => loadMembers()); }, [loadMembers]);
  useEffect(() => { void loadProjects(); }, [loadProjects]);

  useEffect(() => {
    if (!projectsLoaded || projectsLoading || !selectedWorkspaceId) return;
    const savedProjectId = localStorage.getItem("flowboard:selectedProjectId");
    if (savedProjectId && projects.some((p) => p.id === savedProjectId)) setSelectedProjectId(savedProjectId);
    else { setSelectedProjectId(""); localStorage.removeItem("flowboard:selectedProjectId"); }
  }, [projects, projectsLoaded, projectsLoading, selectedWorkspaceId]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true); setErrorMessage("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message || "Logout failed.");
      window.location.replace("/login");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Logout failed. Please try again.");
      setLoggingOut(false);
    }
  }

  async function addTask(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const title = taskTitle.trim();
    if (!selectedWorkspaceId) { setErrorMessage("Please select a workspace before adding a task."); return; }
    if (!title || saving) return;
    try {
      setSaving(true); setErrorMessage("");
      const response = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description: taskDescription.trim() || null,
          labels: [...new Set(taskLabels.split(",").map((l) => l.trim()).filter(Boolean))],
          priority: taskPriority, assignee: taskAssignee, assigneeId: taskAssigneeId || null,
          status: "To Do", dueDate: taskDueDate || null, workspaceId: selectedWorkspaceId, projectId: selectedProjectId || null,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? `Failed to create task (${response.status})`);
      await loadTasks();
      setTaskTitle(""); setTaskDescription(""); setTaskPriority("Medium"); setTaskDueDate(""); setTaskLabels(""); setTaskAssigneeId(""); setShowAddForm(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the task to the database.");
    } finally { setSaving(false); }
  }

  function startEditingTask(task: Task) {
    setEditingTask(task); setEditTitle(task.title); setEditDescription(task.description ?? "");
    setEditLabels((task.labels ?? []).join(", ")); setEditPriority(task.priority);
    setEditAssignee(task.assignee); setEditAssigneeId(task.assigneeId ?? "");
    setEditStatus(task.status); setEditDueDate(task.dueDate?.slice(0, 10) ?? ""); setErrorMessage("");
  }

  async function saveEditedTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTask || editSaving) return;
    const title = editTitle.trim(); const assignee = editAssignee.trim();
    if (!title) { setErrorMessage("Task title is required."); return; }
    if (!assignee) { setErrorMessage("Assignee is required."); return; }
    try {
      setEditSaving(true); setErrorMessage("");
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description: editDescription.trim() || null,
          labels: [...new Set(editLabels.split(",").map((l) => l.trim()).filter(Boolean))],
          priority: editPriority, assignee, ...(editAssigneeId !== (editingTask.assigneeId ?? "") ? { assigneeId: editAssigneeId || null } : {}),
          status: editStatus, dueDate: editDueDate || null,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "Failed to update task.");
      setEditingTask(null);
      await loadTasks();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Task update failed.");
    } finally { setEditSaving(false); }
  }

  async function moveTask(taskId: string, newStatus: TaskStatus) {
    const currentTask = boardColumns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (!currentTask || currentTask.status === newStatus) return;
    setBoardColumns((cols) => cols.map((col) => ({
      ...col,
      tasks: col.title === newStatus ? [...col.tasks.filter((t) => t.id !== taskId), { ...currentTask, status: newStatus }] : col.tasks.filter((t) => t.id !== taskId),
    })));
    try {
      setErrorMessage("");
      const response = await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (!response.ok) throw new Error(`Failed to update task (${response.status})`);
      await loadTasks();
    } catch (error) {
      setErrorMessage("Failed to save the task status.");
      await loadTasks();
    }
  }

  async function addSubtask(taskId: string) {
    const title = (subtaskTitles[taskId] ?? "").trim();
    if (!title) { setSubtaskError("Please enter a subtask title."); return; }
    if (title.length > 200) { setSubtaskError("Subtask title must be 200 characters or less."); return; }
    try {
      setSubtaskSaving(taskId); setSubtaskError("");
      const response = await fetch(`/api/tasks/${taskId}/subtasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "Failed to create subtask.";
        throw new Error(message);
      }
      if (typeof data !== "object" || data === null || !("subtask" in data)) throw new Error("Invalid subtask response.");
      const newSubtask = data.subtask as Subtask;
      setBoardColumns((cols) => cols.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => t.id === taskId ? { ...t, subtasks: [...(t.subtasks ?? []), newSubtask] } : t),
      })));
      setSubtaskTitles((c) => ({ ...c, [taskId]: "" }));
    } catch (error) {
      setSubtaskError(error instanceof Error ? error.message : "Failed to create subtask.");
    } finally { setSubtaskSaving(null); }
  }

  async function toggleSubtask(taskId: string, subtask: Subtask) {
    try {
      setSubtaskSaving(subtask.id); setSubtaskError("");
      const response = await fetch(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: !subtask.completed }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "Failed to update subtask.";
        throw new Error(message);
      }
      if (typeof data !== "object" || data === null || !("subtask" in data)) throw new Error("Invalid subtask response.");
      const updatedSubtask = data.subtask as Subtask;
      setBoardColumns((cols) => cols.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => t.id === taskId ? { ...t, subtasks: (t.subtasks ?? []).map((s) => s.id === updatedSubtask.id ? updatedSubtask : s) } : t),
      })));
    } catch (error) {
      setSubtaskError(error instanceof Error ? error.message : "Failed to update subtask.");
    } finally { setSubtaskSaving(null); }
  }

  async function deleteTask(taskId: string) {
    const selectedTask = boardColumns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (!selectedTask || !window.confirm(`Delete "${selectedTask.title}"?`)) return;
    setBoardColumns((cols) => cols.map((col) => ({ ...col, tasks: col.tasks.filter((t) => t.id !== taskId) })));
    try {
      setErrorMessage("");
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Failed to delete task (${response.status})`);
      await loadTasks();
    } catch (error) {
      setErrorMessage("Failed to delete task.");
      await loadTasks();
    }
  }

  const totalTasks = boardColumns.reduce((t, c) => t + c.tasks.length, 0);
  const inProgressTasks = boardColumns.find((c) => c.title === "In Progress")?.tasks.length ?? 0;
  const completedTasks = boardColumns.find((c) => c.title === "Done")?.tasks.length ?? 0;
  const todoTasks = boardColumns.find((c) => c.title === "To Do")?.tasks.length ?? 0;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const creatorOptions = [...new Map(
    boardColumns.flatMap((c) => c.tasks).filter((t) => t.user?.id)
      .map((t) => [t.user!.id, { id: t.user!.id, name: t.user!.name?.trim() || t.user!.email || "Unknown user", email: t.user!.email }])
  ).values()].sort((a, b) => a.name.localeCompare(b.name));
  const activeProject = projects.find((p) => p.id === selectedProjectId);
  const activeWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);
  const activeFiltersCount = [statusFilter !== "All", priorityFilter !== "All", creatorFilter !== "All", assigneeFilter !== "All", dueDateFilter !== "All", searchTerm.trim() !== ""].filter(Boolean).length;

  const stats = [
    { label: "Total Tasks", value: totalTasks, sub: `${todoTasks} to do Â· ${inProgressTasks} active`, iconColor: "text-slate-600", iconBg: "bg-slate-100 ring-slate-200", percent: 100, bar: "bg-slate-700", icon: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /> },
    { label: "In Progress", value: inProgressTasks, sub: "Currently active", iconColor: "text-amber-600", iconBg: "bg-amber-50 ring-amber-200/70", percent: totalTasks ? Math.round((inProgressTasks / totalTasks) * 100) : 0, bar: "bg-amber-500", icon: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></> },
    { label: "Completed", value: completedTasks, sub: `${completionRate}% completion rate`, iconColor: "text-emerald-600", iconBg: "bg-emerald-50 ring-emerald-200/70", percent: completionRate, bar: "bg-emerald-500", icon: <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></> },
    { label: "Team Members", value: members.length, sub: "In workspace", iconColor: "text-slate-600", iconBg: "bg-slate-100 ring-slate-200", percent: 100, bar: "bg-slate-700", icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></> },
  ];

  const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
  const labelClass = "mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500";

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-800 antialiased">
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out both; }
        .animate-slide-down { animation: slideDown 0.2s ease-out both; }
        .animate-slide-in { animation: slideIn 0.25s ease-out both; }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.35); border-radius: 999px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.55); }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
          <form onSubmit={saveEditedTask} role="dialog" aria-modal="true" className="my-auto w-full max-w-lg animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-900">Edit task</h2>
                <p className="mt-0.5 text-xs text-slate-500">Update task details and save changes.</p>
              </div>
              <button type="button" onClick={() => !editSaving && setEditingTask(null)} disabled={editSaving} aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
              <div><label className={labelClass}>Title</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={200} required className={inputClass} /></div>
              <div><label className={labelClass}>Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} maxLength={2000} rows={3}
                  className={`${inputClass} resize-none`} placeholder="Optional description" /></div>
              <div><label className={labelClass}>Labels</label>
                <input type="text" value={editLabels} onChange={(e) => setEditLabels(e.target.value)}
                  placeholder="e.g. bug, frontend, urgent" className={inputClass} />
                <p className="mt-1 text-[11px] text-slate-500">Separate labels with commas.</p></div>
              <div><label className={labelClass}>Due date</label>
                <div className="flex gap-2">
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className={`${inputClass} flex-1`} />
                  <button type="button" onClick={() => setEditDueDate("")}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Clear</button>
                </div></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className={labelClass}>Priority</label>
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as TaskPriority)} className={inputClass}>
                    <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                  </select></div>
                <div><label className={labelClass}>Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as TaskStatus)} className={inputClass}>
                    <option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="Done">Done</option>
                  </select></div>
              </div>
              <div><label className={labelClass}>Assignee</label>
                <select value={editAssigneeId} onChange={(e) => {
                  const id = e.target.value; setEditAssigneeId(id);
                  const m = members.find((m) => m.user.id === id);
                  if (m) setEditAssignee(m.user.name || m.user.email);
                }} className={inputClass}>
                  <option value="">Keep existing assignee</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.user.id}>{m.user.name || m.user.email}</option>
                  ))}
                </select></div>
              {errorMessage && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">{errorMessage}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => !editSaving && setEditingTask(null)} disabled={editSaving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={editSaving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50">
                {editSaving ? "Saving..." : "Save changes"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex h-screen overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`scrollbar-thin fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 transition-transform md:static md:translate-x-0 ${sidebarOpen ? "translate-x-0 animate-slide-in" : "-translate-x-full"}`}>
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-slate-900">FlowBoard</h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Workspace</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="mt-6 space-y-0.5">
            <a href="#dashboard" className="flex items-center gap-2.5 rounded-lg bg-slate-100 px-2.5 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200/70">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-slate-700">
                <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
              Dashboard
            </a>
            <div className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-400" title="Coming soon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              Members
              <span className="ml-auto rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">Soon</span>
            </div>
          </nav>

          <div className="my-4 h-px bg-slate-100" />

          {/* Workspace selector */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Workspace</label>
            {workspaceLoading ? <p className="text-xs text-slate-400">Loading...</p> : (
              <select value={selectedWorkspaceId} onChange={(e) => {
                const id = e.target.value; setSelectedWorkspaceId(id); setSelectedProjectId("");
                localStorage.setItem("flowboard:selectedWorkspaceId", id); localStorage.removeItem("flowboard:selectedProjectId");
              }} className="w-full truncate rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                {workspaces.length === 0 && <option value="">No workspaces</option>}
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            )}
            {workspaceError && <p role="alert" className="mt-1.5 text-[11px] text-rose-600">{workspaceError}</p>}
            <form onSubmit={createWorkspace} className="mt-2 space-y-1.5">
              <input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="New workspace name" maxLength={100} required className={inputClass} />
              <button type="submit" disabled={workspaceSaving || !workspaceName.trim()}
                className="w-full rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                {workspaceSaving ? "Creating..." : "Create workspace"}
              </button>
            </form>
          </div>

          {/* Projects */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-slate-500">
                  <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 8h8M8 12h8M8 16h4" />
                </svg>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Projects</h3>
              </div>
              <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">{projects.length}</span>
            </div>

            {["OWNER", "ADMIN"].includes(workspaces.find((w) => w.id === selectedWorkspaceId)?.role ?? "") &&
              <form onSubmit={createProject} className="mb-3 rounded-lg border border-slate-200 bg-white p-2.5">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3.5 shrink-0 text-slate-400"><path d="M12 5v14M5 12h14" /></svg>
                  <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="New project name..." maxLength={100} required
                    disabled={!selectedWorkspaceId || projectSaving}
                    className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50" />
                  <button type="submit" disabled={!selectedWorkspaceId || !projectName.trim() || projectSaving}
                    className="rounded-md bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {projectSaving ? "..." : "Add"}
                  </button>
                </div>
                {(projectSaving || projectName.trim() !== "") && (
                  <textarea value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Optional description..." maxLength={1000} rows={2} disabled={projectSaving}
                    className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:opacity-50" />
                )}
              </form>
            }

            {projectsError && <p className="mb-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700 ring-1 ring-inset ring-rose-200">{projectsError}</p>}
            {projectsMessage && <p className="mb-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-700 ring-1 ring-inset ring-emerald-200">{projectsMessage}</p>}

            {projectsLoading ? (
              <div className="space-y-1.5">{[0, 1].map((i) => (
                <div key={i} className="animate-pulse rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center gap-2"><div className="size-6 rounded-md bg-slate-200" /><div className="flex-1 space-y-1"><div className="h-2 w-2/3 rounded bg-slate-200" /><div className="h-2 w-1/2 rounded bg-slate-100" /></div></div>
                </div>))}
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-3 py-5 text-center">
                <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 8h8M8 12h8M8 16h4" /></svg>
                </div>
                <p className="text-[11px] font-medium text-slate-600">No projects yet</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Create one to get started</p>
              </div>
            ) : (
              <div className="scrollbar-thin max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {projects.map((project) => {
                  const isActive = project.id === selectedProjectId;
                  const palette = avatarColor(project.id);
                  const canManageProjects = ["OWNER", "ADMIN"].includes(
                    workspaces.find((w) => w.id === selectedWorkspaceId)?.role ?? ""
                  );
                  const isEditing = editingProjectId === project.id;
                  const isDeleting = projectDeletingId === project.id;

                  return (
                    <div
                      key={project.id}
                      className={`group rounded-lg border p-2.5 transition ${
                        isActive
                          ? "border-slate-300 bg-slate-100 ring-1 ring-inset ring-slate-300"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          aria-label={`Select project ${project.name}`}
                          onClick={() => {
                            if (isEditing) return;

                            const newProjectId = isActive ? "" : project.id;
                            setSelectedProjectId(newProjectId);

                            if (newProjectId) {
                              localStorage.setItem("flowboard:selectedProjectId", newProjectId);
                            } else {
                              localStorage.removeItem("flowboard:selectedProjectId");
                            }
                          }}
                          className="flex min-w-0 flex-1 items-start gap-2 text-left"
                        >
                          <div className={`flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${palette} text-white shadow-sm`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                              <rect x="3" y="3" width="18" height="18" rx="3" />
                              <path d="M8 8h8M8 12h8M8 16h4" />
                            </svg>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <h4 className="truncate text-xs font-semibold text-slate-800">
                                {project.name}
                              </h4>
                              {isActive && (
                                <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-2">
                                    <path d="M20 6L9 17l-5-5" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                              {project.description || "No description"}
                            </p>
                          </div>
                        </button>

                        {canManageProjects && !isEditing && (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProjectId(project.id);
                                setEditingProjectName(project.name);
                                setEditingProjectDescription(project.description ?? "");
                                setProjectsError("");
                                setProjectsMessage("");
                              }}
                              disabled={Boolean(projectDeletingId)}
                              className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteProject(project)}
                              disabled={Boolean(projectDeletingId) || projectUpdating}
                              className="rounded border border-rose-200 bg-white px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing && (
                        <form onSubmit={updateProject} className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                          <label className="block text-[10px] font-medium text-slate-600">
                            Project name
                            <input
                              value={editingProjectName}
                              onChange={(e) => setEditingProjectName(e.target.value)}
                              required
                              maxLength={100}
                              disabled={projectUpdating}
                              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400 disabled:opacity-50"
                            />
                          </label>

                          <label className="block text-[10px] font-medium text-slate-600">
                            Description
                            <textarea
                              value={editingProjectDescription}
                              onChange={(e) => setEditingProjectDescription(e.target.value)}
                              maxLength={1000}
                              rows={3}
                              disabled={projectUpdating}
                              placeholder="Optional project description"
                              className="mt-1 w-full resize-y rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400 disabled:opacity-50"
                            />
                          </label>

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={projectUpdating}
                              onClick={() => {
                                setEditingProjectId("");
                                setEditingProjectName("");
                                setEditingProjectDescription("");
                                setProjectsError("");
                              }}
                              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={projectUpdating || !editingProjectName.trim()}
                              className="rounded-md bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {projectUpdating ? "Saving..." : "Save changes"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Members */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Members</h3>
              <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">{members.length}</span>
            </div>
            {membersLoading ? <p className="text-xs text-slate-400">Loading...</p> : membersError ? <p className="text-xs text-rose-600">{membersError}</p> : members.length === 0 ? <p className="text-xs text-slate-400">No members yet</p> : (
              <div className="scrollbar-thin max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {members.map((member) => {
                  const currentRole = workspaces.find((w) => w.id === selectedWorkspaceId)?.role;
                  const isOwner = currentRole === "OWNER"; const isAdmin = currentRole === "ADMIN";
                  const isTargetOwner = member.role === "OWNER";
                  const canChangeRole = isOwner && !isTargetOwner;
                  const canRemoveMember = !isTargetOwner && (isOwner || (isAdmin && member.role === "MEMBER"));
                  const displayName = member.user.name || member.user.email || "User";
                  const palette = avatarColor(member.user.id);
                  return (
                    <div key={member.id} className="group rounded-lg border border-slate-200 bg-white p-2 transition hover:border-slate-300">
                      <div className="flex items-center gap-2">
                        <div className={`flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${palette} text-[10px] font-semibold text-white ring-2 ring-white`}>{getInitials(displayName)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-slate-800">{displayName}</p>
                          <p className="truncate text-[10px] text-slate-400">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-1.5">
                        <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">{member.role}</span>
                        {(canChangeRole || canRemoveMember) && (
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {canChangeRole && <select aria-label={`Change role for ${member.user.email}`} value={member.role} disabled={memberSaving}
                              onChange={(e) => changeMemberRole(member, e.target.value as "MEMBER" | "ADMIN")}
                              className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-600 outline-none focus:border-slate-400 disabled:opacity-50">
                              <option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select>}
                            {canRemoveMember && <button type="button" disabled={memberSaving} onClick={() => removeMember(member)}
                              className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50">Remove</button>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {membersMessage && <p className="mt-2 text-[11px] text-emerald-600">{membersMessage}</p>}
            <form onSubmit={addMember} className="mt-2.5 space-y-1.5">
              <input id="member-email" type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="member@example.com" required className={inputClass} />
              <select value={memberRole} onChange={(e) => setMemberRole(e.target.value as "MEMBER" | "ADMIN")} className={inputClass}>
                <option value="MEMBER">Member</option><option value="ADMIN">Admin</option>
              </select>
              <button type="submit" disabled={memberSaving || !selectedWorkspaceId}
                className="w-full rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                {memberSaving ? "Adding..." : "+ Add member"}</button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4">
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
              <div className="flex items-center gap-1.5">
                <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" /></span>
                <p className="text-xs font-semibold text-slate-800">Free workspace</p>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">Upgrade for more features.</p>
            </div>
            <button type="button" onClick={() => void handleLogout()} disabled={loggingOut}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:hidden">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
              </button>
              <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
                <span className="font-medium">{activeWorkspace?.name ?? "Workspace"}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3 shrink-0 text-slate-300"><path d="M9 18l6-6-6-6" /></svg>
                <span className="truncate font-semibold text-slate-800">{activeProject?.name ?? "Dashboard"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                <input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search tasks..."
                  className="w-56 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200" />
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 pr-3 transition hover:border-slate-300 hover:shadow-sm">
                <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[10px] font-semibold text-white ring-2 ring-white">{getInitials(currentUser?.name)}</div>
                <span className="hidden text-xs font-medium text-slate-700 sm:inline">Account</span>
              </button>
            </div>
          </header>

          {/* Scrollable content */}
          <div className="scrollbar-thin flex-1 overflow-y-auto bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
              {/* Page header */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                    {activeProject ? "Project board" : "Live workspace"}
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{activeProject?.name ?? "Project Dashboard"}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-500">{activeProject?.description || "Plan your work. Track your progress. Ship faster."}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="relative flex size-11 items-center justify-center">
                      <svg viewBox="0 0 36 36" className="size-11 -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#0f172a" strokeWidth="3" strokeDasharray={`${(completionRate / 100) * 94.2} 94.2`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute text-[11px] font-bold text-slate-700">{completionRate}%</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">Completion</p>
                      <p className="text-sm font-semibold text-slate-900">{completedTasks} of {totalTasks}</p>
                    </div>
                  </div>

                  <button type="button" onClick={() => setShowAddForm((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="size-4"><path d="M12 5v14M5 12h14" /></svg>
                    New task
                  </button>
                </div>
              </div>

              {/* Add task form */}
              {showAddForm && (
                <div className="mt-6 animate-slide-down rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight text-slate-900">Add new task</h3>
                      <p className="text-[11px] text-slate-500">Fill in the details below to create a task.</p>
                    </div>
                    <button type="button" onClick={() => setShowAddForm(false)} className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <form onSubmit={addTask} className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">Task title *</label>
                        <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="e.g. Design the new pricing page" required className={inputClass} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">Description</label>
                        <textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="Optional description..." maxLength={2000} rows={2} className={`${inputClass} resize-none`} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">Assignee</label>
                        <select value={taskAssigneeId} onChange={(e) => {
                          const id = e.target.value; setTaskAssigneeId(id);
                          const m = members.find((m) => m.user.id === id); if (m) setTaskAssignee(m.user.name || m.user.email);
                        }} disabled={membersLoading || members.length === 0} className={`${inputClass} disabled:opacity-50`}>
                          <option value="">{membersLoading ? "Loading members..." : "Select assignee"}</option>
                          {members.map((m) => <option key={m.id} value={m.user.id}>{m.user.name || m.user.email}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">Priority</label>
                        <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as TaskPriority)} className={inputClass}>
                          <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">Due date</label>
                        <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">Project</label>
                        <select value={selectedProjectId} onChange={(e) => {
                          const id = e.target.value; setSelectedProjectId(id);
                          if (id) localStorage.setItem("flowboard:selectedProjectId", id); else localStorage.removeItem("flowboard:selectedProjectId");
                        }} disabled={!selectedWorkspaceId || projectsLoading} className={`${inputClass} disabled:opacity-50`}>
                          <option value="">{projectsLoading ? "Loading projects..." : "No project"}</option>
                          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-[11px] font-medium text-slate-600">Labels</label>
                        <input type="text" value={taskLabels} onChange={(e) => setTaskLabels(e.target.value)} placeholder="bug, frontend, urgent" className={inputClass} />
                        <p className="mt-1 text-[10px] text-slate-500">Separate labels with commas.</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                      <button type="button" onClick={() => setShowAddForm(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                      <button type="submit" disabled={saving || !taskTitle.trim() || !selectedWorkspaceId || workspaceLoading}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                        {saving ? "Creating..." : "Create task"}</button>
                    </div>
                  </form>
                </div>
              )}

              {errorMessage && (
                <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <span>{errorMessage}</span>
                  <button type="button" onClick={() => void loadTasks()} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-rose-50">Retry</button>
                </div>
              )}

              {/* Stats */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="animate-fade-in group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div className={`flex size-9 items-center justify-center rounded-lg ${stat.iconBg} ${stat.iconColor} ring-1 ring-inset`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">{stat.icon}</svg>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-400"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                    <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                    <p className="text-[11px] font-medium text-slate-500">{stat.label}</p>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${stat.bar} transition-all`} style={{ width: `${stat.percent}%` }} /></div>
                    <p className="mt-1.5 text-[10px] text-slate-500">{stat.sub}</p>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 pr-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-slate-500"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Filter</span>
                  </div>
                  {[
                    { value: statusFilter, set: setStatusFilter, options: [["All", "All statuses"], ["To Do", "To Do"], ["In Progress", "In Progress"], ["Done", "Done"]] },
                    { value: priorityFilter, set: setPriorityFilter, options: [["All", "All priorities"], ["Low", "Low"], ["Medium", "Medium"], ["High", "High"]] },
                  ].map((f, i) => (
                    <select key={i} value={f.value} onChange={(e) => f.set(e.target.value)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium outline-none transition ${f.value !== "All" ? "border-slate-400 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                      {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  ))}
                  <select value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium outline-none transition ${creatorFilter !== "All" ? "border-slate-400 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                    <option value="All">All creators</option>
                    {creatorOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium outline-none transition ${assigneeFilter !== "All" ? "border-slate-400 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                    <option value="All">All assignees</option>
                    {members.map((m) => <option key={m.id} value={m.user.id}>{m.user.name || m.user.email}</option>)}
                  </select>
                  <select value={dueDateFilter} onChange={(e) => setDueDateFilter(e.target.value)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium outline-none transition ${dueDateFilter !== "All" ? "border-slate-400 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                    <option value="All">All due dates</option><option value="Today">Due today</option><option value="Overdue">Overdue</option><option value="Has due date">Has due date</option><option value="No due date">No due date</option>
                  </select>
                  {activeFiltersCount > 0 && (
                    <button type="button" onClick={() => { setAssigneeFilter("All"); setCreatorFilter("All"); setStatusFilter("All"); setPriorityFilter("All"); setDueDateFilter("All"); setSearchTerm(""); }}
                      className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-200">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="size-3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      Clear ({activeFiltersCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Board */}
              <div className="mt-8">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-slate-900">{activeProject?.name ?? "Website Development"}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{totalTasks} task{totalTasks === 1 ? "" : "s"} Â· {completedTasks} completed</p>
                  </div>
                </div>

                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                    <div className="mx-auto size-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
                    <p className="mt-3 text-sm text-slate-500">Loading tasks...</p>
                  </div>
                ) : (
                  <div className="grid items-start gap-4 lg:grid-cols-3">
                    {boardColumns.map((column) => {
                      const visibleTasks = column.tasks.filter((task) => {
                        const q = searchTerm.trim().toLowerCase();
                        const matchesSearch = task.title.toLowerCase().includes(q) || (task.description ?? "").toLowerCase().includes(q) || (task.labels ?? []).some((l) => l.toLowerCase().includes(q)) || (task.assignee ?? "").toLowerCase().includes(q);
                        const dueDate = task.dueDate?.slice(0, 10) ?? ""; const today = getLocalDateString();
                        const matchesDueDate = dueDateFilter === "All" || (dueDateFilter === "Today" && dueDate === today) || (dueDateFilter === "Overdue" && !!dueDate && dueDate < today && task.status !== "Done") || (dueDateFilter === "Has due date" && !!dueDate) || (dueDateFilter === "No due date" && !dueDate);
                        return matchesSearch && (statusFilter === "All" || task.status === statusFilter) && (priorityFilter === "All" || task.priority === priorityFilter) && (creatorFilter === "All" || task.user?.id === creatorFilter) && (assigneeFilter === "All" || task.assigneeId === assigneeFilter) && matchesDueDate;
                      });
                      const meta = columnMeta[column.title];
                      return (
                        <div key={column.title} className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between px-3.5 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`size-2 rounded-full ${meta.dot}`} />
                              <h4 className={`text-sm font-semibold ${meta.text}`}>{column.title}</h4>
                              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${meta.count}`}>{visibleTasks.length}</span>
                            </div>
                            <button type="button" onClick={() => { setTaskTitle(""); setTaskPriority("Medium"); setTaskDueDate(""); setShowAddForm(true); setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="Task name"]')?.focus(), 100); }}
                              className="flex size-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Add task">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3.5"><path d="M12 5v14M5 12h14" /></svg>
                            </button>
                          </div>
                          <div className={`h-0.5 ${meta.rail}`} />
                          <div className="space-y-2 p-2.5">
                            {visibleTasks.map((task) => {
                              const isOverdue = task.dueDate && task.status !== "Done" && task.dueDate.slice(0, 10) < getLocalDateString();
                              const isDueToday = task.dueDate && task.status !== "Done" && task.dueDate.slice(0, 10) === getLocalDateString();
                              const subtasks = task.subtasks ?? [];
                              const completedCount = subtasks.filter((s) => s.completed).length;
                              const progress = subtasks.length === 0 ? 0 : Math.round((completedCount / subtasks.length) * 100);
                              const isExpanded = expandedSubtasks[task.id] ?? false;
                              return (
                                <article key={task.id} className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 flex-1 break-words text-sm font-medium leading-5 text-slate-800">{task.title}</p>
                                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                      <button type="button" onClick={() => startEditingTask(task)} title="Edit task" aria-label={`Edit ${task.title}`}
                                        className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
                                      </button>
                                      <button type="button" onClick={() => void deleteTask(task.id)} title="Delete task" aria-label={`Delete ${task.title}`}
                                        className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                      </button>
                                    </div>
                                  </div>
                                  {task.labels && task.labels.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {task.labels.map((label) => <span key={label} className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{label}</span>)}
                                    </div>
                                  )}
                                  {task.description && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{task.description}</p>}

                                  {/* Subtasks */}
                                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                                    <button type="button" onClick={() => setExpandedSubtasks((p) => ({ ...p, [task.id]: !p[task.id] }))} className="flex w-full items-center justify-between gap-2 text-left">
                                      <div className="flex items-center gap-1.5">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`size-3 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}><path d="M9 18l6-6-6-6" /></svg>
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Subtasks</span>
                                        {subtasks.length > 0 && <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">{completedCount}/{subtasks.length}</span>}
                                      </div>
                                      {subtasks.length > 0 && (
                                        <div className="flex items-center gap-1.5">
                                          <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-700 transition-all" style={{ width: `${progress}%` }} /></div>
                                          <span className="text-[10px] font-medium text-slate-500">{progress}%</span>
                                        </div>
                                      )}
                                    </button>
                                    {isExpanded && (
                                      <div className="mt-2.5 space-y-1.5 border-t border-slate-200/70 pt-2.5">
                                        {subtasks.length > 0 && (
                                          <div className="mb-2 space-y-1.5">
                                            {subtasks.map((subtask) => (
                                              <label key={subtask.id} className="flex cursor-pointer items-start gap-2 text-xs">
                                                <input type="checkbox" checked={subtask.completed} disabled={subtaskSaving === subtask.id}
                                                  onChange={() => void toggleSubtask(task.id, subtask)} className="mt-0.5 size-3.5 shrink-0 accent-slate-800" />
                                                <span className={subtask.completed ? "text-slate-400 line-through" : "text-slate-700"}>{subtask.title}</span>
                                              </label>
                                            ))}
                                          </div>
                                        )}
                                        <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); void addSubtask(task.id); }}>
                                          <input type="text" value={subtaskTitles[task.id] ?? ""} onChange={(e) => setSubtaskTitles((c) => ({ ...c, [task.id]: e.target.value }))} maxLength={200}
                                            placeholder="Add a subtask..." aria-label={`Add subtask to ${task.title}`}
                                            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
                                          <button type="submit" disabled={subtaskSaving === task.id || !(subtaskTitles[task.id] ?? "").trim()}
                                            className="rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                                            {subtaskSaving === task.id ? "..." : "Add"}</button>
                                        </form>
                                      </div>
                                    )}
                                  </div>
                                  {subtaskError && <p role="alert" className="mt-1 text-[11px] text-rose-600">{subtaskError}</p>}

                                  {task.dueDate && (
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${isOverdue ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200" : isDueToday ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200" : "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200"}`}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                                        {formatDueDate(task.dueDate)}
                                      </span>
                                      {isOverdue && <span className="text-[10px] font-semibold text-rose-600">Overdue</span>}
                                      {isDueToday && <span className="text-[10px] font-semibold text-amber-600">Due today</span>}
                                    </div>
                                  )}

                                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityStyles[task.priority] ?? priorityStyles.Medium}`}>{task.priority}</span>
                                    <div className="flex items-center gap-1.5">
                                      <select value={column.title} onChange={(e) => void moveTask(task.id, e.target.value as TaskStatus)} aria-label={`Change status of ${task.title}`}
                                        className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                      <span title={`Created by: ${task.user?.name || task.user?.email || "Unknown user"}`}
                                        className={`flex size-6 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(task.user?.name || task.user?.email || "U")} text-[9px] font-semibold text-white shadow-sm ring-2 ring-white`}>
                                        {getInitials(task.user?.name || task.user?.email, "U")}
                                      </span>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                            {visibleTasks.length === 0 && (
                              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 py-8 text-center">
                                <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-inset ring-slate-200">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4"><path d="M12 5v14M5 12h14" /></svg>
                                </div>
                                <p className="text-[11px] font-medium text-slate-600">{searchTerm || activeFiltersCount > 0 ? "No matching tasks" : "No tasks yet"}</p>
                                <p className="mt-0.5 text-[10px] text-slate-400">{searchTerm || activeFiltersCount > 0 ? "Try adjusting your filters" : "Click + to add the first task"}</p>
                              </div>
                            )}
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


