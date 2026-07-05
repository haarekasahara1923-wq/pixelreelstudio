import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, generations } from "@/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 60;

const MOCK_VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-32213-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-galaxy-background-with-nebula-and-stars-32207-large.mp4",
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────
// Provider 1: fal.ai (Kling v1.6 image-to-video)
// ─────────────────────────────────────────────
async function falI2V(prompt: string, imageUrl: string, falKey: string): Promise<string> {
  const submitRes = await fetch(
    "https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video",
    {
      method: "POST",
      headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image_url: imageUrl, duration: "5" }),
    }
  );
  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`fal.ai i2v submit failed (${submitRes.status}): ${err}`);
  }
  const { request_id, status_url, response_url } = await submitRes.json();
  if (!request_id) throw new Error("fal.ai i2v: no request_id");

  const pollUrl = status_url || `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video/requests/${request_id}/status`;
  const resultUrl = response_url || `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video/requests/${request_id}`;

  const start = Date.now();
  while (Date.now() - start < 50_000) {
    await sleep(4000);
    const s = await fetch(pollUrl, { headers: { Authorization: `Key ${falKey}` } });
    if (!s.ok) continue;
    const sd = await s.json();
    if (sd.status === "COMPLETED") {
      const r = await fetch(resultUrl, { headers: { Authorization: `Key ${falKey}` } });
      const rd = await r.json();
      const url = rd.video?.url || rd.video_url || rd.output?.video?.url || "";
      if (!url) throw new Error("fal.ai i2v: no video URL");
      return url;
    }
    if (sd.status === "FAILED") throw new Error(`fal.ai i2v: failed — ${sd.error || sd.detail}`);
  }
  throw new Error("fal.ai i2v: timed out");
}

// ─────────────────────────────────────────────
// Provider 2: Wavespeed (image-to-video via Kling v2)
// ─────────────────────────────────────────────
async function wavespeedI2V(
  prompt: string,
  imageUrl: string,
  wavespeedKey: string
): Promise<string> {
  const submitRes = await fetch(
    "https://api.wavespeed.ai/api/v3/kling-ai/kling-v2-master-image-to-video",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${wavespeedKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image: imageUrl, duration: 5 }),
    }
  );
  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Wavespeed i2v submit failed (${submitRes.status}): ${err}`);
  }
  const submitData = await submitRes.json();
  const predictionId = submitData?.data?.id || submitData?.id;
  if (!predictionId) throw new Error("Wavespeed i2v: no prediction ID");

  const start = Date.now();
  while (Date.now() - start < 50_000) {
    await sleep(4000);
    const r = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${predictionId}/result`, {
      headers: { Authorization: `Bearer ${wavespeedKey}` },
    });
    if (!r.ok) continue;
    const rd = await r.json();
    const status = rd?.data?.status || rd?.status;
    if (status === "completed" || status === "succeeded") {
      const url = rd?.data?.outputs?.[0] || rd?.outputs?.[0] || rd?.data?.output || "";
      if (!url) throw new Error("Wavespeed i2v: no video URL");
      return url;
    }
    if (status === "failed" || status === "error") {
      throw new Error(`Wavespeed i2v: failed — ${rd?.data?.error || "unknown"}`);
    }
  }
  throw new Error("Wavespeed i2v: timed out");
}

// ─────────────────────────────────────────────
// Provider 3: Replicate (stable-video-diffusion)
// ─────────────────────────────────────────────
async function replicateI2V(
  imageUrl: string,
  replicateToken: string
): Promise<string> {
  const submitRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${replicateToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
      input: { input_image: imageUrl, frames_per_second: 6, decoding_t: 14 },
    }),
  });
  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Replicate i2v submit failed (${submitRes.status}): ${err}`);
  }
  const prediction = await submitRes.json();
  if (!prediction.id) throw new Error("Replicate i2v: no prediction ID");

  const start = Date.now();
  while (Date.now() - start < 50_000) {
    await sleep(4000);
    const r = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${replicateToken}` },
    });
    if (!r.ok) continue;
    const rd = await r.json();
    if (rd.status === "succeeded") {
      const url = Array.isArray(rd.output) ? rd.output[0] : rd.output;
      if (!url) throw new Error("Replicate i2v: no URL in output");
      return url;
    }
    if (rd.status === "failed") throw new Error(`Replicate i2v: failed — ${rd.error}`);
  }
  throw new Error("Replicate i2v: timed out");
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
    const { imageUrl, prompt, aspectRatio } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: "Source image URL is required." }, { status: 400 });

    const ratio = aspectRatio || "16:9";
    const promptText = prompt || "Animate this image with smooth cinematic motion";

    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userResult[0];
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (user.credits < 5) {
      return NextResponse.json(
        { error: "Insufficient credits. Video generation requires 5 credits." },
        { status: 400 }
      );
    }

    const newCredits = user.credits - 5;
    await db.update(users).set({ credits: newCredits }).where(eq(users.id, userId));

    const falKey = process.env.FAL_KEY;
    const wavespeedKey = process.env.WAVESPEED_API_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;

    const isMock = !falKey && !wavespeedKey && !replicateToken;

    let videoUrl = "";
    let usedProvider = "mock";

    if (isMock) {
      await sleep(2000);
      videoUrl = MOCK_VIDEOS[Math.floor(Math.random() * MOCK_VIDEOS.length)];
    } else {
      const errors: string[] = [];

      // fal.ai — DISABLED (no credits)
      // if (falKey && falKey !== "mock_fal_key") { ... }

      if (!videoUrl && wavespeedKey) {
        try {
          console.log("[i2v] Trying Wavespeed...");
          videoUrl = await wavespeedI2V(promptText, imageUrl, wavespeedKey);
          usedProvider = "wavespeed";
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn("[i2v] Wavespeed failed:", msg);
          errors.push(`Wavespeed: ${msg}`);
        }
      }

      if (!videoUrl && replicateToken) {
        try {
          console.log("[i2v] Trying Replicate...");
          videoUrl = await replicateI2V(imageUrl, replicateToken);
          usedProvider = "replicate";
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn("[i2v] Replicate failed:", msg);
          errors.push(`Replicate: ${msg}`);
        }
      }

      if (!videoUrl) {
        await db.update(users).set({ credits: user.credits }).where(eq(users.id, userId));
        return NextResponse.json(
          { error: `All providers failed. Credits refunded.\n${errors.join("\n")}` },
          { status: 500 }
        );
      }
    }

    console.log(`[i2v] Generated via ${usedProvider}`);

    const [generation] = await db.insert(generations).values({
      userId,
      type: "image-to-video",
      prompt: promptText,
      aspectRatio: ratio,
      mediaUrl: videoUrl,
      status: "completed",
      creditsUsed: 5,
    }).returning();

    return NextResponse.json({ success: true, generation, creditsRemaining: newCredits });
  } catch (error) {
    console.error("[i2v] Outer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
