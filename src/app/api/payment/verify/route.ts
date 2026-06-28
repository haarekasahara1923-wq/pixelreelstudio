import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { payments, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();

    if (!razorpayOrderId || !razorpayPaymentId) {
      return NextResponse.json(
        { error: "Order ID and Payment ID are required." },
        { status: 400 }
      );
    }

    // 1. Fetch the pending transaction
    const paymentResult = await db
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, razorpayOrderId))
      .limit(1);

    const payment = paymentResult[0];

    if (!payment) {
      return NextResponse.json({ error: "Transaction record not found." }, { status: 404 });
    }

    if (payment.status === "success") {
      return NextResponse.json({ message: "Payment already processed." });
    }

    const isMockOrder = razorpayOrderId.startsWith("order_mock_");
    let isSignatureValid = false;

    if (isMockOrder) {
      // Mock order, automatically approve payment
      isSignatureValid = true;
      console.log(`[PAYMENT MOCK] Verifying mock order: ${razorpayOrderId}. Bypassing signature check.`);
    } else {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        return NextResponse.json(
          { error: "Payment verification configuration error." },
          { status: 500 }
        );
      }

      // Standard Razorpay signature verification
      const text = razorpayOrderId + "|" + razorpayPaymentId;
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(text)
        .digest("hex");

      isSignatureValid = generatedSignature === razorpaySignature;
    }

    if (isSignatureValid) {
      // 2. Update payment record to success
      await db
        .update(payments)
        .set({
          status: "success",
          razorpayPaymentId,
          razorpaySignature: razorpaySignature || "mock_sig",
        })
        .where(eq(payments.id, payment.id));

      // 3. Fetch user and update credits balance
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, payment.userId))
        .limit(1);

      const user = userResult[0];
      if (!user) {
        return NextResponse.json({ error: "User associated with payment not found." }, { status: 404 });
      }

      const updatedCredits = user.credits + payment.credits;
      await db
        .update(users)
        .set({ credits: updatedCredits })
        .where(eq(users.id, user.id));

      console.log(
        `[PAYMENT SUCCESS] Credited ${payment.credits} credits to ${user.email}. New total: ${updatedCredits}`
      );

      return NextResponse.json({
        success: true,
        message: "Payment verified and credits added successfully.",
        creditsAdded: payment.credits,
        newBalance: updatedCredits,
      });
    } else {
      // Update payment record to failed
      await db
        .update(payments)
        .set({
          status: "failed",
        })
        .where(eq(payments.id, payment.id));

      return NextResponse.json({ error: "Invalid payment signature verification failed." }, { status: 400 });
    }
  } catch (error) {
    console.error("Verify payment API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
