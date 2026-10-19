
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function parseDueDate(value: unknown): Date | null | undefined {
  // undefined = due date was not supplied
  if (value === undefined) return undefined;

  // null or empty string = remove the due date
  if (value === null || value === "") return null;

  if (typeof value !== "string") {
    throw new Error("Due date must be a valid date.");
  }

  // Accept only YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Due date must use YYYY-MM-DD format.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  // Reject invalid calendar dates such as 2026-02-30
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Please enter a valid calendar date.");
  }

  return date;
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (workspaceId) {
      const membership = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          members: {
            some: { userId: session.user.id },
          },
        },
        select: { id: true },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Workspace not found or access denied." },
          { status: 403 },
        );
      }

      const tasks = await prisma.task.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(tasks);
    }

    // Backward compatibility for requests without workspaceId
    const tasks = await prisma.task.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);

    return NextResponse.json(
      { error: "Failed to fetch tasks." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;

    const title =
      typeof input.title === "string" ? input.title.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "Task title is required." },
        { status: 400 },
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "Task title must be 200 characters or less." },
        { status: 400 },
      );
    }

    const allowedPriorities = ["Low", "Medium", "High"];
    const priority =
      typeof input.priority === "string" &&
      allowedPriorities.includes(input.priority)
        ? input.priority
        : "Medium";

    const allowedStatuses = ["To Do", "In Progress", "Done"];
    const status =
      typeof input.status === "string" &&
      allowedStatuses.includes(input.status)
        ? input.status
        : "To Do";

    const assignee =
      typeof input.assignee === "string" && input.assignee.trim()
        ? input.assignee.trim()
        : "SH";

    if (assignee.length > 50) {
      return NextResponse.json(
        { error: "Assignee must be 50 characters or less." },
        { status: 400 },
      );
    }

    const description =
      typeof input.description === "string"
        ? input.description.trim() || null
        : null;

    if (
      typeof input.description === "string" &&
      input.description.length > 2000
    ) {
      return NextResponse.json(
        { error: "Description must be 2000 characters or less." },
        { status: 400 },
      );
    }

    let dueDate: Date | null | undefined;

    try {
      dueDate = parseDueDate(input.dueDate);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid due date.",
        },
        { status: 400 },
      );
    }

    let workspaceId: string | null = null;

    if (input.workspaceId !== undefined && input.workspaceId !== null) {
      if (
        typeof input.workspaceId !== "string" ||
        !input.workspaceId.trim()
      ) {
        return NextResponse.json(
          { error: "A valid workspace ID is required." },
          { status: 400 },
        );
      }

      workspaceId = input.workspaceId.trim();

      const membership = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          members: {
            some: { userId: session.user.id },
          },
        },
        select: { id: true },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Workspace not found or access denied." },
          { status: 403 },
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        assignee,
        status,
        userId: session.user.id,
        workspaceId,
        ...(dueDate !== undefined ? { dueDate } : {}),
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);

    return NextResponse.json(
      { error: "Failed to create task." },
      { status: 500 },
    );
  }
}
