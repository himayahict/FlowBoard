import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
    subtaskId: string;
  }>;
};

export async function PATCH(
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

    const { id, subtaskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        workspace: {
          select: {
            members: {
              where: { userId: session.user.id },
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 },
      );
    }

    const hasAccess = task.workspaceId
      ? Boolean(task.workspace?.members.length)
      : task.userId === session.user.id;

    if (!hasAccess) {
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
      !("completed" in body) ||
      typeof body.completed !== "boolean"
    ) {
      return NextResponse.json(
        { error: "A boolean completed value is required" },
        { status: 400 },
      );
    }

    const existingSubtask = await prisma.subtask.findFirst({
      where: {
        id: subtaskId,
        taskId: task.id,
      },
      select: { id: true },
    });

    if (!existingSubtask) {
      return NextResponse.json(
        { error: "Subtask not found" },
        { status: 404 },
      );
    }

    const subtask = await prisma.subtask.update({
      where: { id: existingSubtask.id },
      data: { completed: body.completed },
    });

    return NextResponse.json({ subtask });
  } catch (error) {
    console.error("PATCH subtask error:", error);

    return NextResponse.json(
      { error: "Failed to update subtask" },
      { status: 500 },
    );
  }
}