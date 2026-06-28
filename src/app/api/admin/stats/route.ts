import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, payments, generations } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // 1. Total users
    const usersCountResult = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalUsers = Number(usersCountResult[0]?.count || 0);

    // 2. Total revenue (sum of successfully paid amounts in INR)
    const revenueResult = await db
      .select({ total: sql<number>`sum(${payments.amount})` })
      .from(payments)
      .where(eq(payments.status, "success"));
    const totalRevenue = Number(revenueResult[0]?.total || 0);

    // 3. Total generations count
    const generationsCountResult = await db.select({ count: sql<number>`count(*)` }).from(generations);
    const totalGenerations = Number(generationsCountResult[0]?.count || 0);

    // Generations breakdown by type
    const breakdownResult = await db
      .select({
        type: generations.type,
        count: sql<number>`count(*)`,
      })
      .from(generations)
      .groupBy(generations.type);

    const breakdown = {
      image: 0,
      video: 0,
      "image-to-video": 0,
    };

    breakdownResult.forEach((row) => {
      if (row.type === "image") breakdown.image = Number(row.count);
      if (row.type === "video") breakdown.video = Number(row.count);
      if (row.type === "image-to-video") breakdown["image-to-video"] = Number(row.count);
    });

    // 4. Latest 5 payments
    const latestPayments = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
        userEmail: users.email,
        credits: payments.credits,
      })
      .from(payments)
      .innerJoin(users, eq(payments.userId, users.id))
      .orderBy(desc(payments.createdAt))
      .limit(5);

    // 5. Latest 5 users
    const latestUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        credits: users.credits,
        role: users.role,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalRevenue,
        totalGenerations,
        breakdown,
        latestPayments,
        latestUsers,
      },
    });
  } catch (error) {
    console.error("Admin stats API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
