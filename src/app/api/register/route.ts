import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_mock_key");

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const emailNormalized = email.toLowerCase().trim();

    // Check if user exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, emailNormalized))
      .limit(1);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.isVerified) {
        return NextResponse.json(
          { error: "User already exists with this email." },
          { status: 400 }
        );
      } else {
        // User exists but not verified, let's update their OTP and re-send
        const hashedPassword = await bcrypt.hash(password, 10);
        await db
          .update(users)
          .set({
            name: name || existing.name,
            password: hashedPassword,
            otpCode,
            otpExpiry,
          })
          .where(eq(users.id, existing.id));

        console.log(`[OTP LOG] New OTP for ${emailNormalized}: ${otpCode}`);

        // Try sending via Resend
        try {
          if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_mock_key") {
            await resend.emails.send({
              from: "PixelReel Studio <onboarding@resend.dev>",
              to: emailNormalized,
              subject: "Verify your email - PixelReel Studio",
              html: `<p>Your verification code is <strong>${otpCode}</strong>. It expires in 15 minutes.</p>`,
            });
          }
        } catch (e) {
          console.error("Resend API failed, falling back to console log:", e);
        }

        return NextResponse.json({ message: "OTP sent successfully." });
      }
    }

    // New user registration
    const hashedPassword = await bcrypt.hash(password, 10);
    const role =
      emailNormalized === (process.env.ADMIN_EMAIL || "admin@pixelreel.studio").toLowerCase().trim()
        ? "admin"
        : "user";

    await db.insert(users).values({
      name: name || emailNormalized.split("@")[0],
      email: emailNormalized,
      password: hashedPassword,
      role,
      isVerified: false,
      otpCode,
      otpExpiry,
    });

    console.log(`[OTP LOG] OTP for ${emailNormalized}: ${otpCode}`);

    // Try sending via Resend
    try {
      if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_mock_key") {
        await resend.emails.send({
          from: "PixelReel Studio <onboarding@resend.dev>",
          to: emailNormalized,
          subject: "Verify your email - PixelReel Studio",
          html: `<p>Your verification code is <strong>${otpCode}</strong>. It expires in 15 minutes.</p>`,
        });
      }
    } catch (e) {
      console.error("Resend API failed, falling back to console log:", e);
    }

    return NextResponse.json({
      message: "User registered. Verification OTP sent.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
