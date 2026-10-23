import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getAuthorizedProject(id: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id },
    select: {
      id: true,
      workspaceId: true,
      workspace: {
        select: {
          members: {
            where: { userId },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!project) {
    return { project: null, error: "Project not found or access denied." };
  }

  const role = project.workspace.members[0]?.role;

  if (role !== "OWNER" && role !== "ADMIN") {
    return { project: null, error: "Only workspace owners and admins can manage projects." };
  }

  return { project, error: null };
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
    const data: { name?: string; description?: string | null } = {};

    if ("name" in input) {
      if (
        typeof input.name !== "string" ||
        !input.name.trim() ||
        input.name.trim().length > 100
      ) {
        return NextResponse.json(
          { error: "Project name is required (maximum 100 characters)." },
          { status: 400 },
        );
      }

      data.name = input.name.trim();
    }

    if ("description" in input) {
      if (
        input.description !== null &&
        typeof input.description !== "string"
      ) {
        return NextResponse.json(
          { error: "Invalid project description." },
          { status: 400 },
        );
      }

      if (
        typeof input.description === "string" &&
        input.description.length > 1000
      ) {
        return NextResponse.json(
          { error: "Description must be 1000 characters or less." },
          { status: 400 },
        );
      }

      data.description =
        typeof input.description === "string"
          ? input.description.trim() || null
          : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Provide a project name or description to update." },
        { status: 400 },
      );
    }

    const access = await getAuthorizedProject(id, session.user.id);

    if (!access.project) {
      return NextResponse.json(
        { error: access.error },
        { status: 404 },
      );
    }

    const result = await prisma.project.updateMany({
      where: {
        id: access.project.id,
        workspaceId: access.project.workspaceId,
      },
      data,
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Project not found or access denied." },
        { status: 404 },
      );
    }

    const updatedProject = await prisma.project.findUnique({
      where: { id },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("PATCH /api/projects/[id] error:", error);

    return NextResponse.json(
      { error: "Failed to update project." },
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

    const { id } = await context.params;
    const access = await getAuthorizedProject(id, session.user.id);

    if (!access.project) {
      return NextResponse.json(
        { error: access.error },
        { status: 404 },
      );
    }

    const result = await prisma.project.deleteMany({
      where: {
        id: access.project.id,
        workspaceId: access.project.workspaceId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Project not found or access denied." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);

    return NextResponse.json(
      { error: "Failed to delete project." },
      { status: 500 },
    );
  }
}
