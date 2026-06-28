import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP code are required." },
        { status: 400 }
      );
    }

    const emailNormalized = email.toLowerCase().trim();

    const userResults = await db
      .select()
      .from(users)
      .where(eq(users.email, emailNormalized))
      .limit(1);

    const user = userResults[0];

    if (!user) {
      return NextResponse.json(
        { error: "No user found with this email." },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: "Email is already verified." },
        { status: 400 }
      );
    }

    if (user.otpCode !== otp.trim()) {
      return NextResponse.json(
        { error: "Invalid OTP code." },
        { status: 400 }
      );
    }

    if (user.otpExpiry && new Date() > user.otpExpiry) {
      return NextResponse.json(
        { error: "OTP code has expired." },
        { status: 400 }
      );
    }

    // Verify user and remove OTP code
    await db
      .update(users)
      .set({
        isVerified: true,
        otpCode: null,
        otpExpiry: null,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
