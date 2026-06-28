import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, generations } from "@/db/schema";
import { eq } from "drizzle-orm";

// Vercel max duration - set to 300s for Pro, or keep 60s for Hobby
export const maxDuration = 60;

const MOCK_VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-32213-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-galaxy-background-with-nebula-and-stars-32207-large.mp4",
];

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = session.user.id;
    const { prompt, aspectRatio } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const ratio = aspectRatio || "16:9";

    // 1. Fetch user credits
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userResult[0];

    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    if (user.credits < 5) {
      return NextResponse.json(
        { error: "Insufficient credits. Video generation requires 5 credits." },
        { status: 400 }
      );
    }

    // 2. Deduct credits upfront
    const newCredits = user.credits - 5;
    await db.update(users).set({ credits: newCredits }).where(eq(users.id, userId));

    const falKey = process.env.FAL_KEY;
    const isMock = !falKey || falKey === "mock_fal_key";

    if (isMock) {
      // --- MOCK MODE ---
      await new Promise((r) => setTimeout(r, 2000));
      const videoUrl = MOCK_VIDEOS[Math.floor(Math.random() * MOCK_VIDEOS.length)];

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
    }

    // --- REAL FAL.AI MODE ---
    try {
      // Step 1: Submit to fal queue
      const submitRes = await fetch(
        "https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video",
        {
          method: "POST",
          headers: {
            Authorization: `Key ${falKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            aspect_ratio: ratio,
            duration: "5",
          }),
        }
      );

      if (!submitRes.ok) {
        const errText = await submitRes.text();
        console.error("Fal.ai submit error:", submitRes.status, errText);
        throw new Error(`Fal.ai submit failed (${submitRes.status}): ${errText}`);
      }

      const submitData = await submitRes.json();
      console.log("Fal.ai submit response:", JSON.stringify(submitData));

      const requestId = submitData.request_id;
      const responseUrl = submitData.response_url;
      const statusUrl = submitData.status_url;

      if (!requestId) {
        throw new Error("Fal.ai did not return a request_id. Response: " + JSON.stringify(submitData));
      }

      // Step 2: Poll for completion (max 50s to stay under Vercel 60s limit)
      const pollUrl = statusUrl || `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video/requests/${requestId}/status`;
      const resultFetchUrl = responseUrl || `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video/requests/${requestId}`;

      let videoUrl = "";
      const startTime = Date.now();
      const maxWaitMs = 50_000; // 50 seconds max polling

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise((r) => setTimeout(r, 4000));

        const statusRes = await fetch(pollUrl, {
          headers: { Authorization: `Key ${falKey}` },
        });

        if (!statusRes.ok) {
          console.warn("Status check failed:", statusRes.status);
          continue;
        }

        const statusData = await statusRes.json();
        console.log("Fal.ai status:", statusData.status);

        if (statusData.status === "COMPLETED") {
          // Fetch the actual result
          const resultRes = await fetch(resultFetchUrl, {
            headers: { Authorization: `Key ${falKey}` },
          });

          if (!resultRes.ok) {
            throw new Error(`Failed to fetch result: ${resultRes.status}`);
          }

          const resultData = await resultRes.json();
          console.log("Fal.ai result:", JSON.stringify(resultData));

          // Try multiple possible response shapes
          videoUrl =
            resultData.video?.url ||
            resultData.video_url ||
            resultData.output?.video?.url ||
            resultData.outputs?.[0]?.video?.url ||
            "";

          if (!videoUrl) {
            throw new Error("No video URL in response: " + JSON.stringify(resultData));
          }
          break;
        } else if (statusData.status === "FAILED") {
          const reason = statusData.error || statusData.detail || "Unknown fal.ai error";
          throw new Error(`Fal.ai generation failed: ${reason}`);
        }
        // else IN_QUEUE or IN_PROGRESS — keep polling
      }

      if (!videoUrl) {
        // Timed out — save as pending so user can check later
        // Refund credits since we couldn't confirm completion
        await db.update(users).set({ credits: user.credits }).where(eq(users.id, userId));
        return NextResponse.json(
          { error: "Video generation is taking longer than expected. Credits refunded. Please try again." },
          { status: 504 }
        );
      }

      // Step 3: Save generation (use fal URL directly — Cloudinary upload optional)
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

    } catch (genError) {
      console.error("Video generation failed:", genError);
      // Refund credits
      await db.update(users).set({ credits: user.credits }).where(eq(users.id, userId));
      return NextResponse.json(
        {
          error: `Video generation failed. Credits refunded. Reason: ${
            genError instanceof Error ? genError.message : String(genError)
          }`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Video API outer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
