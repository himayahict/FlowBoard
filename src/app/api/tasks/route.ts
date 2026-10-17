
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    // Check the logged-in user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Return only tasks owned by this user
    const tasks = await prisma.task.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);

    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check the logged-in user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

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

    const title =
      typeof input.title === "string" ? input.title.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "Task title must be 200 characters or less" },
        { status: 400 }
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

    const description =
      typeof input.description === "string"
        ? input.description.trim() || null
        : null;

    if (assignee.length > 50) {
      return NextResponse.json(
        { error: "Assignee must be 50 characters or less" },
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

    // Save the task with the authenticated user's ID
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        assignee,
        status,
        userId: session.user.id,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);

    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
