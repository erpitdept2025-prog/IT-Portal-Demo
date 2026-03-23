/**
 * POST /api/auto-login
 *
 * Called by ProtectedPageWrapper when the device-ID check fails but an
 * HTTP-only session cookie may still be present.  Instead of trusting an
 * arbitrary ID from the URL (which would be a security hole), we validate
 * the existing cookie, confirm the user is still active, issue a fresh
 * device-ID, and return it so the client can store it in localStorage.
 *
 * No external id param is required or trusted — the cookie is the source
 * of truth.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/MongoDB";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

export async function POST(_req: NextRequest) {
  try {
    // ── 1. Read the HTTP-only session cookie ──────────────────────────────
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: "No active session." },
        { status: 401 }
      );
    }

    const sessionUserId = sessionCookie.value.trim();

    // ── 2. Validate the session maps to a real, active user ───────────────
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(sessionUserId);
    } catch {
      return NextResponse.json(
        { success: false, error: "Malformed session." },
        { status: 401 }
      );
    }

    const db = await connectToDatabase();
    const users = db.collection("users");
    const user = await users.findOne({ _id: objectId });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 401 }
      );
    }

    // Honour the same status gates as the login endpoint
    if (["Resigned", "Terminated", "Locked"].includes(user.Status)) {
      return NextResponse.json(
        { success: false, error: `Account is ${user.Status}.` },
        { status: 403 }
      );
    }

    // ── 3. Issue a fresh device-ID ────────────────────────────────────────
    const newDeviceId: string =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await users.updateOne(
      { _id: objectId },
      { $set: { DeviceId: newDeviceId } }
    );

    // ── 4. Refresh the session cookie (extend TTL) ────────────────────────
    const response = NextResponse.json({
      success: true,
      userId: sessionUserId,
      deviceId: newDeviceId,
    });

    response.cookies.set("session", sessionUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[auto-login] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}