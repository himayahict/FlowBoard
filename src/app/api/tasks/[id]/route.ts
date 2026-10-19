import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedStatuses = ["To Do", "In Progress", "Done"] as const;
const allowedPriorities = ["Low", "Medium", "High"] as const;

function parseDueDate(value: unknown): Date | null {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Due date must use YYYY-MM-DD format.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Please enter a valid calendar date.");
  }

  return date;
}

async function getAccessibleTask(id: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      workspaceId: true,
    },
  });

  if (!task) {
    return null;
  }

  if (task.workspaceId) {
    const membership = await prisma.workspace.findFirst({
      where: {
        id: task.workspaceId,
        members: {
          some: { userId },
        },
      },
      select: { id: true },
    });

    return membership ? task : null;
  }

  if (task.userId === userId) {
    return task;
  }

  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const { id } = await context.params;

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;

    const data: {
      title?: string;
      description?: string | null;
      labels?: string[];
      priority?: string;
      assignee?: string;
      status?: string;
      dueDate?: Date | null;
    } = {};

    if ("title" in input) {
      if (typeof input.title !== "string" || !input.title.trim()) {
        return NextResponse.json(
          { error: "Task title is required." },
          { status: 400 },
        );
      }

      if (input.title.trim().length > 200) {
        return NextResponse.json(
          { error: "Task title must be 200 characters or less." },
          { status: 400 },
        );
      }

      data.title = input.title.trim();
    }

    if ("description" in input) {
      if (input.description !== null && typeof input.description !== "string") {
        return NextResponse.json(
          { error: "Invalid task description." },
          { status: 400 },
        );
      }

      if (
        typeof input.description === "string" &&
        input.description.length > 2000
      ) {
        return NextResponse.json(
          { error: "Description must be 2000 characters or less." },
          { status: 400 },
        );
      }

      data.description =
        typeof input.description === "string"
          ? input.description.trim() || null
          : null;
    }

    if ("labels" in input) {
      if (
        !Array.isArray(input.labels) ||
        input.labels.length > 10 ||
        input.labels.some(
          (label) => typeof label !== "string" || label.trim().length > 30,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Labels must be a list of up to 10 labels, each 30 characters or less.",
          },
          { status: 400 },
        );
      }

      data.labels = [
        ...new Set(input.labels.map((label) => label.trim()).filter(Boolean)),
      ];
    }

    if ("priority" in input) {
      if (
        typeof input.priority !== "string" ||
        !allowedPriorities.includes(
          input.priority as (typeof allowedPriorities)[number],
        )
      ) {
        return NextResponse.json(
          { error: "Invalid task priority." },
          { status: 400 },
        );
      }

      data.priority = input.priority;
    }

    if ("assignee" in input) {
      if (
        typeof input.assignee !== "string" ||
        !input.assignee.trim() ||
        input.assignee.trim().length > 50
      ) {
        return NextResponse.json(
          { error: "Invalid task assignee." },
          { status: 400 },
        );
      }

      data.assignee = input.assignee.trim();
    }

    if ("status" in input) {
      if (
        typeof input.status !== "string" ||
        !allowedStatuses.includes(
          input.status as (typeof allowedStatuses)[number],
        )
      ) {
        return NextResponse.json(
          { error: "Invalid task status." },
          { status: 400 },
        );
      }

      data.status = input.status;
    }

    if ("dueDate" in input) {
      try {
        data.dueDate = parseDueDate(input.dueDate);
      } catch (error) {
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : "Invalid due date.",
          },
          { status: 400 },
        );
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided to update." },
        { status: 400 },
      );
    }

    const task = await getAccessibleTask(id, userId);

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or access denied." },
        { status: 404 },
      );
    }

    const result = await prisma.task.updateMany({
      where: {
        id: task.id,
        userId: task.userId,
        workspaceId: task.workspaceId,
      },
      data,
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Task not found or access denied." },
        { status: 404 },
      );
    }

    const updatedTask = await prisma.task.findUnique({
      where: { id },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Failed to update task:", error);

    return NextResponse.json(
      { error: "Failed to update task." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const { id } = await context.params;

    const task = await getAccessibleTask(id, userId);

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or access denied." },
        { status: 404 },
      );
    }

    const result = await prisma.task.deleteMany({
      where: {
        id: task.id,
        userId: task.userId,
        workspaceId: task.workspaceId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Task not found or access denied." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);

    return NextResponse.json(
      { error: "Failed to delete task." },
      { status: 500 },
    );
  }
}
