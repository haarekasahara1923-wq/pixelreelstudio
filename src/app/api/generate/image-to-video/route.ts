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

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = session.user.id;
    const { imageUrl, prompt, aspectRatio } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "Source image URL is required." }, { status: 400 });
    }

    const ratio = aspectRatio || "16:9";
    const promptText = prompt || "Animate this image in cinematic style";

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
      await new Promise((r) => setTimeout(r, 2000));
      const videoUrl = MOCK_VIDEOS[Math.floor(Math.random() * MOCK_VIDEOS.length)];

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
    }

    // --- REAL FAL.AI MODE ---
    try {
      const submitRes = await fetch(
        "https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video",
        {
          method: "POST",
          headers: {
            Authorization: `Key ${falKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: promptText,
            image_url: imageUrl,
            duration: "5",
          }),
        }
      );

      if (!submitRes.ok) {
        const errText = await submitRes.text();
        console.error("Fal.ai i2v submit error:", submitRes.status, errText);
        throw new Error(`Fal.ai submit failed (${submitRes.status}): ${errText}`);
      }

      const submitData = await submitRes.json();
      console.log("Fal.ai i2v submit response:", JSON.stringify(submitData));

      const requestId = submitData.request_id;
      const responseUrl = submitData.response_url;
      const statusUrl = submitData.status_url;

      if (!requestId) {
        throw new Error("Fal.ai did not return a request_id. Response: " + JSON.stringify(submitData));
      }

      const pollUrl = statusUrl || `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video/requests/${requestId}/status`;
      const resultFetchUrl = responseUrl || `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video/requests/${requestId}`;

      let videoUrl = "";
      const startTime = Date.now();
      const maxWaitMs = 50_000;

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
        console.log("Fal.ai i2v status:", statusData.status);

        if (statusData.status === "COMPLETED") {
          const resultRes = await fetch(resultFetchUrl, {
            headers: { Authorization: `Key ${falKey}` },
          });

          if (!resultRes.ok) throw new Error(`Failed to fetch result: ${resultRes.status}`);

          const resultData = await resultRes.json();
          console.log("Fal.ai i2v result:", JSON.stringify(resultData));

          videoUrl =
            resultData.video?.url ||
            resultData.video_url ||
            resultData.output?.video?.url ||
            resultData.outputs?.[0]?.video?.url ||
            "";

          if (!videoUrl) throw new Error("No video URL in response: " + JSON.stringify(resultData));
          break;
        } else if (statusData.status === "FAILED") {
          const reason = statusData.error || statusData.detail || "Unknown error";
          throw new Error(`Fal.ai i2v failed: ${reason}`);
        }
      }

      if (!videoUrl) {
        await db.update(users).set({ credits: user.credits }).where(eq(users.id, userId));
        return NextResponse.json(
          { error: "Video generation is taking longer than expected. Credits refunded. Please try again." },
          { status: 504 }
        );
      }

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

    } catch (genError) {
      console.error("Image-to-video generation failed:", genError);
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
    console.error("Image-to-video API outer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
