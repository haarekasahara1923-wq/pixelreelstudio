import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, generations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uploadToCloudinary } from "@/lib/cloudinary";

const MOCK_VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-32213-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-galaxy-background-with-nebula-and-stars-32207-large.mp4",
];

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const userId = session.user.id;
    const { prompt, aspectRatio } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const ratio = aspectRatio || "16:9";

    // 1. Fetch user's current credits
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userResult[0];

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.credits < 5) {
      return NextResponse.json(
        { error: "Insufficient credits. Video generation requires 5 credits." },
        { status: 400 }
      );
    }

    // 2. Deduct credits
    const newCredits = user.credits - 5;
    await db.update(users).set({ credits: newCredits }).where(eq(users.id, userId));

    let finalVideoUrl = "";
    const isMock = !process.env.FAL_KEY || process.env.FAL_KEY === "mock_fal_key";

    if (isMock) {
      // Simulate video generation delay
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const randomIndex = Math.floor(Math.random() * MOCK_VIDEOS.length);
      finalVideoUrl = MOCK_VIDEOS[randomIndex];
    } else {
      try {
        // Submit task to Fal Queue
        const queueResponse = await fetch(
          "https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video",
          {
            method: "POST",
            headers: {
              Authorization: `Key ${process.env.FAL_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt,
              aspect_ratio: ratio,
              duration: 5,
            }),
          }
        );

        if (!queueResponse.ok) {
          const errText = await queueResponse.text();
          throw new Error(`Fal.ai Queue failed: ${errText}`);
        }

        const queueData = await queueResponse.json();
        const statusUrl = queueData.status_url;
        const responseUrl = queueData.response_url;

        // Poll the status URL
        let completed = false;
        let generatedVideoUrl = "";
        const maxAttempts = 20; // 20 attempts * 3s = 60 seconds max

        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const checkResponse = await fetch(statusUrl, {
            headers: { Authorization: `Key ${process.env.FAL_KEY}` },
          });

          if (!checkResponse.ok) continue;

          const checkData = await checkResponse.json();
          if (checkData.status === "COMPLETED") {
            const resultResponse = await fetch(responseUrl, {
              headers: { Authorization: `Key ${process.env.FAL_KEY}` },
            });
            if (resultResponse.ok) {
              const resultData = await resultResponse.json();
              generatedVideoUrl = resultData.video?.url || "";
              completed = true;
            }
            break;
          } else if (checkData.status === "FAILED") {
            throw new Error("Fal.ai video generation failed in queue.");
          }
        }

        if (!completed || !generatedVideoUrl) {
          throw new Error("Video generation timed out or returned no URL.");
        }

        // Upload to Cloudinary
        finalVideoUrl = await uploadToCloudinary(generatedVideoUrl, "video");
      } catch (genError) {
        console.error("Video generation failed. Refunding credits...", genError);
        // Refund credits
        await db.update(users).set({ credits: user.credits }).where(eq(users.id, userId));
        return NextResponse.json(
          { error: "Video generation failed. Credits refunded." },
          { status: 500 }
        );
      }
    }

    // 3. Save generation record
    const [generation] = await db
      .insert(generations)
      .values({
        userId,
        type: "video",
        prompt,
        aspectRatio: ratio,
        mediaUrl: finalVideoUrl,
        status: "completed",
        creditsUsed: 5,
      })
      .returning();

    return NextResponse.json({
      success: true,
      generation,
      creditsRemaining: newCredits,
    });
  } catch (error) {
    console.error("Video generation API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
