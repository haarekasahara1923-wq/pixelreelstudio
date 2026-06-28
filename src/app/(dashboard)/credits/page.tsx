import { db } from "@/db";
import { creditPacks } from "@/db/schema";
import { CreditsClient } from "./CreditsClient";

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  const packs = await db.select().from(creditPacks).orderBy(creditPacks.price);

  return <CreditsClient packs={packs} />;
}
