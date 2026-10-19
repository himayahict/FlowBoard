import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getAccessibleTask(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      userId: true,
      workspaceId: true,
      workspace: {
        select: {
          members: {
            where: { userId },
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!task) {
    return null;
  }

  if (task.workspaceId) {
    return task.workspace?.members.length ? task : null;
  }

  return task.userId === userId ? task : null;
}

// GET: Get all subtasks belonging to a task
export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const task = await getAccessibleTask(id, session.user.id);

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 },
      );
    }

    const subtasks = await prisma.subtask.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ subtasks });
  } catch (error) {
    console.error("GET subtasks error:", error);

    return NextResponse.json(
      { error: "Failed to load subtasks" },
      { status: 500 },
    );
  }
}

// POST: Create a new subtask
export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const task = await getAccessibleTask(id, session.user.id);

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("title" in body) ||
      typeof body.title !== "string"
    ) {
      return NextResponse.json(
        { error: "A valid subtask title is required" },
        { status: 400 },
      );
    }

    const title = body.title.trim();

    if (!title || title.length > 200) {
      return NextResponse.json(
        { error: "Subtask title must be between 1 and 200 characters" },
        { status: 400 },
      );
    }

    const subtask = await prisma.subtask.create({
      data: {
        title,
        taskId: task.id,
      },
    });

    return NextResponse.json({ subtask }, { status: 201 });
  } catch (error) {
    console.error("POST subtask error:", error);

    return NextResponse.json(
      { error: "Failed to create subtask" },
      { status: 500 },
    );
  }
}