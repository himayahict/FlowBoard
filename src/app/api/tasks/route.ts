
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
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
    const body = await request.json();

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }

    const allowedPriorities = ["Low", "Medium", "High"];
    const priority = allowedPriorities.includes(body.priority)
      ? body.priority
      : "Medium";

    const allowedStatuses = ["To Do", "In Progress", "Done"];
    const status = allowedStatuses.includes(body.status)
      ? body.status
      : "To Do";

    const assignee =
      typeof body.assignee === "string" && body.assignee.trim()
        ? body.assignee.trim()
        : "SH";

    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;

    const task = await prisma.task.create({
      data: { title, description, priority, assignee, status },
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
