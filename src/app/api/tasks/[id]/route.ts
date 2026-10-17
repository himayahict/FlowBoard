import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedStatuses = ["To Do", "In Progress", "Done"] as const;
const allowedPriorities = ["Low", "Medium", "High"] as const;

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Check whether the user is logged in
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { id } = await context.params;
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;

    const data: {
      title?: string;
      description?: string | null;
      priority?: string;
      assignee?: string;
      status?: string;
    } = {};

    if ("title" in input) {
      if (
        typeof input.title !== "string" ||
        !input.title.trim()
      ) {
        return NextResponse.json(
          { error: "Task title is required" },
          { status: 400 }
        );
      }

      if (input.title.trim().length > 200) {
        return NextResponse.json(
          { error: "Task title must be 200 characters or less" },
          { status: 400 }
        );
      }

      data.title = input.title.trim();
    }

    if ("description" in input) {
      if (
        input.description !== null &&
        typeof input.description !== "string"
      ) {
        return NextResponse.json(
          { error: "Invalid task description" },
          { status: 400 }
        );
      }

      if (
        typeof input.description === "string" &&
        input.description.length > 2000
      ) {
        return NextResponse.json(
          { error: "Description must be 2000 characters or less" },
          { status: 400 }
        );
      }

      data.description =
        typeof input.description === "string"
          ? input.description.trim() || null
          : null;
    }

    if ("priority" in input) {
      if (
        typeof input.priority !== "string" ||
        !allowedPriorities.includes(
          input.priority as (typeof allowedPriorities)[number]
        )
      ) {
        return NextResponse.json(
          { error: "Invalid task priority" },
          { status: 400 }
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
          { error: "Invalid task assignee" },
          { status: 400 }
        );
      }

      data.assignee = input.assignee.trim();
    }

    if ("status" in input) {
      if (
        typeof input.status !== "string" ||
        !allowedStatuses.includes(
          input.status as (typeof allowedStatuses)[number]
        )
      ) {
        return NextResponse.json(
          { error: "Invalid task status" },
          { status: 400 }
        );
      }

      data.status = input.status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    // 2. Update only a task owned by the logged-in user
    const result = await prisma.task.updateMany({
      where: {
        id,
        userId,
      },
      data,
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    const updatedTask = await prisma.task.findFirst({
      where: {
        id,
        userId,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Failed to update task:", error);

    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    // 1. Check whether the user is logged in
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { id } = await context.params;

    // 2. Delete only a task owned by the logged-in user
    const result = await prisma.task.deleteMany({
      where: {
        id,
        userId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Task not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);

    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
