
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

// GET: List members of a workspace
export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: workspaceId } = await params;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this workspace." },
        { status: 403 },
      );
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("GET workspace members error:", error);

    return NextResponse.json(
      { error: "Failed to load workspace members." },
      { status: 500 },
    );
  }
}

// POST: Add an existing registered user to a workspace
export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: workspaceId } = await params;
    const body = await request.json();

    if (
      typeof body.email !== "string" ||
      !body.email.trim() ||
      body.email.trim().length > 254
    ) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 },
      );
    }

    const requestedRole =
      typeof body.role === "string"
        ? body.role.toUpperCase()
        : "MEMBER";

    if (!["MEMBER", "ADMIN"].includes(requestedRole)) {
      return NextResponse.json(
        { error: "Role must be MEMBER or ADMIN." },
        { status: 400 },
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        ownerId: true,
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 404 },
      );
    }

    const isOwner = workspace.ownerId === user.id;
    const actorRole = workspace.members[0]?.role;

    if (!isOwner && actorRole !== "ADMIN") {
      return NextResponse.json(
        { error: "You do not have permission to add members." },
        { status: 403 },
      );
    }

    if (!isOwner && requestedRole !== "MEMBER") {
      return NextResponse.json(
        { error: "Admins can only add members with the MEMBER role." },
        { status: 403 },
      );
    }

    const email = body.email.trim().toLowerCase();

    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          error:
            "No registered user found with this email address.",
        },
        { status: 404 },
      );
    }

    const existingMembership =
      await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: targetUser.id,
          },
        },
        select: { id: true },
      });

    if (existingMembership) {
      return NextResponse.json(
        { error: "This user is already a workspace member." },
        { status: 409 },
      );
    }

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role: requestedRole,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("POST workspace member error:", error);

    return NextResponse.json(
      { error: "Failed to add workspace member." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: workspaceId } = await params;
    const body = await request.json();

    if (
      typeof body.memberId !== "string" ||
      !body.memberId.trim() ||
      !["MEMBER", "ADMIN"].includes(body.role)
    ) {
      return NextResponse.json(
        { error: "A valid memberId and role are required." },
        { status: 400 },
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        ownerId: true,
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 404 },
      );
    }

    if (workspace.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only the workspace owner can change roles." },
        { status: 403 },
      );
    }

    const target = await prisma.workspaceMember.findUnique({
      where: { id: body.memberId },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        role: true,
      },
    });

    if (!target || target.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Workspace member not found." },
        { status: 404 },
      );
    }

    if (target.userId === workspace.ownerId) {
      return NextResponse.json(
        { error: "The workspace owner's role cannot be changed here." },
        { status: 400 },
      );
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: { id: target.id },
      data: { role: body.role },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("PATCH workspace member error:", error);

    return NextResponse.json(
      { error: "Failed to update member role." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: workspaceId } = await params;
    const body = await request.json();

    if (
      typeof body.memberId !== "string" ||
      !body.memberId.trim()
    ) {
      return NextResponse.json(
        { error: "A valid memberId is required." },
        { status: 400 },
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        ownerId: true,
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 404 },
      );
    }

    const actorRole = workspace.members[0]?.role;
    const isOwner = workspace.ownerId === user.id;

    if (!isOwner && actorRole !== "ADMIN") {
      return NextResponse.json(
        { error: "You do not have permission to remove members." },
        { status: 403 },
      );
    }

    const target = await prisma.workspaceMember.findUnique({
      where: { id: body.memberId },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        role: true,
      },
    });

    if (!target || target.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Workspace member not found." },
        { status: 404 },
      );
    }

    if (target.userId === workspace.ownerId) {
      return NextResponse.json(
        { error: "The workspace owner cannot be removed." },
        { status: 400 },
      );
    }

    if (!isOwner && target.role !== "MEMBER") {
      return NextResponse.json(
        { error: "Admins can only remove MEMBER accounts." },
        { status: 403 },
      );
    }

    await prisma.workspaceMember.delete({
      where: { id: target.id },
    });

    return NextResponse.json({
      message: "Workspace member removed successfully.",
    });
  } catch (error) {
    console.error("DELETE workspace member error:", error);

    return NextResponse.json(
      { error: "Failed to remove workspace member." },
      { status: 500 },
    );
  }
}
