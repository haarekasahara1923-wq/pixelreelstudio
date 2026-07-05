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

// ─────────────────────────────────────────────
// Provider 1: fal.ai (Kling v1.6)
// ─────────────────────────────────────────────
async function generateWithFal(
  prompt: string,
  ratio: string,
  falKey: string
): Promise<string> {
  const submitRes = await fetch(
    "https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video",
    {
      method: "POST",
      headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspect_ratio: ratio, duration: "5" }),
    }
  );
  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`fal.ai submit failed (${submitRes.status}): ${err}`);
  }
  const { request_id, status_url, response_url } = await submitRes.json();
  if (!request_id) throw new Error("fal.ai: no request_id returned");

  const pollUrl = status_url || `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video/requests/${request_id}/status`;
  const resultUrl = response_url || `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video/requests/${request_id}`;

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
      if (!url) throw new Error("fal.ai: no video URL in result");
      return url;
    }
    if (sd.status === "FAILED") throw new Error(`fal.ai: generation failed — ${sd.error || sd.detail}`);
  }
  throw new Error("fal.ai: timed out");
}

// ─────────────────────────────────────────────
// Provider 2: Wavespeed.ai (short-video-generator)
// ─────────────────────────────────────────────
async function generateWithWavespeed(
  prompt: string,
  wavespeedKey: string
): Promise<string> {
  const submitRes = await fetch(
    "https://api.wavespeed.ai/api/v3/wavespeed-ai/short-video-generator",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${wavespeedKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }
  );
  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Wavespeed submit failed (${submitRes.status}): ${err}`);
  }
  const submitData = await submitRes.json();
  const predictionId = submitData?.data?.id || submitData?.id;
  if (!predictionId) throw new Error("Wavespeed: no prediction ID returned");

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
      if (!url) throw new Error("Wavespeed: no video URL in result");
      return url;
    }
    if (status === "failed" || status === "error") {
      throw new Error(`Wavespeed: generation failed — ${rd?.data?.error || "unknown"}`);
    }
  }
  throw new Error("Wavespeed: timed out");
}

// ─────────────────────────────────────────────
// Provider 3: Hugging Face (Zeroscope v2 XL)
// ─────────────────────────────────────────────
async function generateWithHuggingFace(
  prompt: string,
  hfToken: string
): Promise<string> {
  // HF returns raw video bytes — upload to a temp buffer and return as data URL
  const res = await fetch(
    "https://api-inference.huggingface.co/models/cerspense/zeroscope_v2_XL",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { num_frames: 24, num_inference_steps: 20 },
        options: { wait_for_model: true },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HuggingFace failed (${res.status}): ${err}`);
  }
  // HF returns binary video blob — convert to base64 data URL
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:video/mp4;base64,${base64}`;
}

// ─────────────────────────────────────────────
// Provider 4: Replicate (lucataco/animate-diff)
// ─────────────────────────────────────────────
async function generateWithReplicate(
  prompt: string,
  replicateToken: string
): Promise<string> {
  const submitRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${replicateToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f",
      input: { prompt, num_frames: 24, num_inference_steps: 25 },
    }),
  });
  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Replicate submit failed (${submitRes.status}): ${err}`);
  }
  const prediction = await submitRes.json();
  const predictionId = prediction.id;
  if (!predictionId) throw new Error("Replicate: no prediction ID");

  const start = Date.now();
  while (Date.now() - start < 50_000) {
    await sleep(4000);
    const r = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${replicateToken}` },
    });
    if (!r.ok) continue;
    const rd = await r.json();
    if (rd.status === "succeeded") {
      const url = Array.isArray(rd.output) ? rd.output[0] : rd.output;
      if (!url) throw new Error("Replicate: no video URL in output");
      return url;
    }
    if (rd.status === "failed") {
      throw new Error(`Replicate: generation failed — ${rd.error || "unknown"}`);
    }
  }
  throw new Error("Replicate: timed out");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

    const ratio = aspectRatio || "16:9";

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
    const hfToken = process.env.HF_TOKEN;
    const replicateToken = process.env.REPLICATE_API_TOKEN;

    const isMock =
      !falKey && !wavespeedKey && !hfToken && !replicateToken;

    let videoUrl = "";
    let usedProvider = "mock";

    if (isMock) {
      await sleep(2000);
      videoUrl = MOCK_VIDEOS[Math.floor(Math.random() * MOCK_VIDEOS.length)];
    } else {
      const errors: string[] = [];

      // 1. fal.ai — DISABLED (no credits)
      // if (falKey && falKey !== "mock_fal_key") { ... }

      // 2. Try Wavespeed
      if (!videoUrl && wavespeedKey) {
        try {
          console.log("[video] Trying Wavespeed...");
          videoUrl = await generateWithWavespeed(prompt, wavespeedKey);
          usedProvider = "wavespeed";
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn("[video] Wavespeed failed:", msg);
          errors.push(`Wavespeed: ${msg}`);
        }
      }

      // 3. Try HuggingFace
      if (!videoUrl && hfToken) {
        try {
          console.log("[video] Trying HuggingFace...");
          videoUrl = await generateWithHuggingFace(prompt, hfToken);
          usedProvider = "huggingface";
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn("[video] HuggingFace failed:", msg);
          errors.push(`HuggingFace: ${msg}`);
        }
      }

      // 4. Try Replicate
      if (!videoUrl && replicateToken) {
        try {
          console.log("[video] Trying Replicate...");
          videoUrl = await generateWithReplicate(prompt, replicateToken);
          usedProvider = "replicate";
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn("[video] Replicate failed:", msg);
          errors.push(`Replicate: ${msg}`);
        }
      }

      if (!videoUrl) {
        // All providers failed — refund credits
        await db.update(users).set({ credits: user.credits }).where(eq(users.id, userId));
        return NextResponse.json(
          { error: `All video providers failed. Credits refunded.\n${errors.join("\n")}` },
          { status: 500 }
        );
      }
    }

    console.log(`[video] Generated via ${usedProvider}`);

    const [generation] = await db.insert(generations).values({
      userId,
      type: "video",
      prompt,
      aspectRatio: ratio,
      mediaUrl: videoUrl,
      status: "completed",
      creditsUsed: 5,
    }).returning();

    return NextResponse.json({ success: true, generation, creditsRemaining: newCredits });
  } catch (error) {
    console.error("[video] Outer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
