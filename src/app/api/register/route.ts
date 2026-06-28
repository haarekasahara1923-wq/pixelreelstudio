import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const emailNormalized = email.toLowerCase().trim();

    // Check if user already exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, emailNormalized))
      .limit(1);

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const role =
      emailNormalized ===
      (process.env.ADMIN_EMAIL || "admin@pixelreel.studio").toLowerCase().trim()
        ? "admin"
        : "user";

    await db.insert(users).values({
      name: name || emailNormalized.split("@")[0],
      email: emailNormalized,
      password: hashedPassword,
      role,
      isVerified: true, // No OTP — verified immediately on registration
    });

    return NextResponse.json({ message: "Account created successfully." });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
