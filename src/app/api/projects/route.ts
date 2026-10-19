
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

    if (!workspaceId?.trim()) {
      return NextResponse.json(
        { error: "Workspace ID is required." },
        { status: 400 },
      );
    }

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

    const projects = await prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projects error:", error);

    return NextResponse.json(
      { error: "Failed to load projects." },
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
    const name =
      typeof input.name === "string" ? input.name.trim() : "";

    const workspaceId =
      typeof input.workspaceId === "string"
        ? input.workspaceId.trim()
        : "";

    const description =
      typeof input.description === "string"
        ? input.description.trim() || null
        : null;

    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: "Project name is required (maximum 100 characters)." },
        { status: 400 },
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required." },
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

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: { userId: session.user.id },
        },
      },
      select: {
        id: true,
        members: {
          where: { userId: session.user.id },
          select: { role: true },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found or access denied." },
        { status: 403 },
      );
    }

    const role = workspace.members[0]?.role;

    if (role !== "OWNER" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only workspace owners and admins can create projects." },
        { status: 403 },
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        workspaceId,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);

    return NextResponse.json(
      { error: "Failed to create project." },
      { status: 500 },
    );
  }
}
