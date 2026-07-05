import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, generations } from "@/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 60;

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1024&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1024&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1024&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1024&auto=format&fit=crop",
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Provider 1: fal.ai — DISABLED (no credits)

// ─────────────────────────────────────────────
// Provider 2: HuggingFace (SDXL — reliable free tier)
// ─────────────────────────────────────────────
async function generateWithHuggingFace(
  prompt: string,
  ratio: string,
  hfToken: string
): Promise<string> {
  // Use 512x512 to stay within HF free tier limits and avoid timeouts
  const width = ratio === "16:9" ? 768 : ratio === "9:16" ? 512 : 512;
  const height = ratio === "16:9" ? 432 : ratio === "9:16" ? 768 : 512;

  // Try models in order — SDXL is more reliably warm on HF free tier
  const models = [
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5",
  ];

  for (const model of models) {
    // Retry up to 3 times for model loading (503 responses)
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45_000);

      try {
        const res = await fetch(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfToken}`,
              "Content-Type": "application/json",
              "X-Wait-For-Model": "true",
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: { width, height, num_inference_steps: 20 },
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        // 503 = model still loading, retry after delay
        if (res.status === 503) {
          const retryData = await res.json().catch(() => ({})) as { estimated_time?: number };
          const waitSec = Math.min(retryData?.estimated_time ?? 10, 15);
          console.log(`[image] HF model ${model} loading, waiting ${waitSec}s (attempt ${attempt + 1})...`);
          await sleep(waitSec * 1000);
          continue;
        }

        if (!res.ok) {
          const err = await res.text();
          console.warn(`[image] HF model ${model} failed (${res.status}): ${err}`);
          break; // try next model
        }

        // HF returns raw image bytes
        const contentType = res.headers.get("content-type") || "image/jpeg";
        if (!contentType.startsWith("image/")) {
          const errText = await res.text();
          console.warn(`[image] HF model ${model} returned non-image: ${errText}`);
          break;
        }

        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return `data:${contentType};base64,${base64}`;
      } catch (e) {
        clearTimeout(timeoutId);
        if ((e as Error)?.name === "AbortError") {
          console.warn(`[image] HF model ${model} timed out (attempt ${attempt + 1})`);
          break; // try next model
        }
        throw e;
      }
    }
  }

  throw new Error("HuggingFace: all models failed or timed out");
}

// ─────────────────────────────────────────────
// Provider 3: Replicate (black-forest-labs/flux-schnell)
// ─────────────────────────────────────────────
async function generateWithReplicate(
  prompt: string,
  ratio: string,
  replicateToken: string
): Promise<string> {
  const aspectRatioMap: Record<string, string> = {
    "1:1": "1:1",
    "16:9": "16:9",
    "9:16": "9:16",
  };
  const submitRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${replicateToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: aspectRatioMap[ratio] || "1:1",
        num_outputs: 1,
        output_format: "webp",
      },
    }),
  });
  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Replicate image submit failed (${submitRes.status}): ${err}`);
  }
  const prediction = await submitRes.json();
  if (!prediction.id) throw new Error("Replicate: no prediction ID");

  const start = Date.now();
  while (Date.now() - start < 25_000) {
    await sleep(2000);
    const r = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${replicateToken}` },
    });
    if (!r.ok) continue;
    const rd = await r.json();
    if (rd.status === "succeeded") {
      const url = Array.isArray(rd.output) ? rd.output[0] : rd.output;
      if (!url) throw new Error("Replicate: no image URL");
      return url;
    }
    if (rd.status === "failed") throw new Error(`Replicate: failed — ${rd.error}`);
  }
  throw new Error("Replicate: timed out");
}

// ─────────────────────────────────────────────
// Main Route
// ─────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = session.user.id;
    const { prompt, aspectRatio } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });

    const ratio = aspectRatio || "1:1";

    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userResult[0];
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (user.credits < 1) {
      return NextResponse.json(
        { error: "Insufficient credits. Please purchase a credit pack." },
        { status: 400 }
      );
    }

    const newCredits = user.credits - 1;
    await db.update(users).set({ credits: newCredits }).where(eq(users.id, userId));

    const falKey = process.env.FAL_KEY;
    const hfToken = process.env.HF_TOKEN;
    const replicateToken = process.env.REPLICATE_API_TOKEN;

    const isMock = !falKey && !hfToken && !replicateToken;

    let imageUrl = "";
    let usedProvider = "mock";

    if (isMock) {
      await sleep(1500);
      imageUrl = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];
    } else {
      const errors: string[] = [];

      // 1. fal.ai — DISABLED (no credits)
      // if (falKey && falKey !== "mock_fal_key") { ... }

      // 2. HuggingFace
      if (!imageUrl && hfToken) {
        try {
          console.log("[image] Trying HuggingFace FLUX.1-schnell...");
          imageUrl = await generateWithHuggingFace(prompt, ratio, hfToken);
          usedProvider = "huggingface";
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn("[image] HuggingFace failed:", msg);
          errors.push(`HuggingFace: ${msg}`);
        }
      }

      // 3. Replicate
      if (!imageUrl && replicateToken) {
        try {
          console.log("[image] Trying Replicate flux-schnell...");
          imageUrl = await generateWithReplicate(prompt, ratio, replicateToken);
          usedProvider = "replicate";
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn("[image] Replicate failed:", msg);
          errors.push(`Replicate: ${msg}`);
        }
      }

      if (!imageUrl) {
        await db.update(users).set({ credits: user.credits }).where(eq(users.id, userId));
        return NextResponse.json(
          { error: `All image providers failed. Credits refunded.\n${errors.join("\n")}` },
          { status: 500 }
        );
      }
    }

    console.log(`[image] Generated via ${usedProvider}`);

    const [generation] = await db.insert(generations).values({
      userId,
      type: "image",
      prompt,
      aspectRatio: ratio,
      mediaUrl: imageUrl,
      status: "completed",
      creditsUsed: 1,
    }).returning();

    return NextResponse.json({ success: true, generation, creditsRemaining: newCredits });
  } catch (error) {
    console.error("[image] Outer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
