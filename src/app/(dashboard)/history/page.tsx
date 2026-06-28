import { auth } from "@/auth";
import { db } from "@/db";
import { generations } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { HistoryClient } from "./HistoryClient";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; page?: string };
}) {
  const session = await auth();
  const userId = session!.user.id;

  const page = parseInt(searchParams.page || "1", 10);
  const limit = 18;
  const offset = (page - 1) * limit;
  const query = searchParams.q || "";
  const typeFilter = searchParams.type || "all";

  // Build conditions
  const conditions = [eq(generations.userId, userId)];
  if (typeFilter !== "all") {
    conditions.push(eq(generations.type, typeFilter));
  }

  const [allGens, totalCount] = await Promise.all([
    db
      .select()
      .from(generations)
      .where(and(...conditions))
      .orderBy(desc(generations.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(generations)
      .where(and(...conditions)),
  ]);

  const total = totalCount[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <HistoryClient
      generations={allGens}
      total={total}
      totalPages={totalPages}
      currentPage={page}
      query={query}
      typeFilter={typeFilter}
    />
  );
}
