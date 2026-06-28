import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { creditPacks, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import Razorpay from "razorpay";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = session.user.id;
    const { packId } = await req.json();

    if (!packId) {
      return NextResponse.json({ error: "Pack ID is required." }, { status: 400 });
    }

    // 1. Fetch the credit pack details
    const packResult = await db.select().from(creditPacks).where(eq(creditPacks.id, packId)).limit(1);
    const pack = packResult[0];

    if (!pack) {
      return NextResponse.json({ error: "Credit pack not found." }, { status: 404 });
    }

    const isMock =
      !process.env.RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID === "rzp_test_mock_id" ||
      !process.env.RAZORPAY_KEY_SECRET ||
      process.env.RAZORPAY_KEY_SECRET === "mock_rzp_secret";

    let orderId = "";
    const amountInPaise = pack.price * 100; // Razorpay uses paise

    if (isMock) {
      // Generate a mock order ID
      orderId = "order_mock_" + Math.random().toString(36).substring(2, 11);
      console.log(`[PAYMENT MOCK] Created mock Razorpay order: ${orderId} for ₹${pack.price}`);
    } else {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });

      const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${userId.substring(0, 8)}_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      orderId = order.id;
    }

    // 2. Register pending payment in the database
    await db.insert(payments).values({
      userId,
      creditPackId: pack.id,
      amount: pack.price,
      credits: pack.credits,
      razorpayOrderId: orderId,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      orderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: isMock ? "rzp_test_mock_id" : process.env.RAZORPAY_KEY_ID,
      isMock,
    });
  } catch (error) {
    console.error("Create order API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
