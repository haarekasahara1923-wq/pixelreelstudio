import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, generations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uploadToCloudinary } from "@/lib/cloudinary";

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1024&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1024&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1024&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1024&auto=format&fit=crop",
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

    const ratio = aspectRatio || "1:1";

    // 1. Fetch user's current credit balance
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userResult[0];

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.credits < 1) {
      return NextResponse.json(
        { error: "Insufficient credits. Please purchase a credit pack." },
        { status: 400 }
      );
    }

    // 2. Deduct credit
    const newCredits = user.credits - 1;
    await db.update(users).set({ credits: newCredits }).where(eq(users.id, userId));

    let finalImageUrl = "";
    const isMock = !process.env.FAL_KEY || process.env.FAL_KEY === "mock_fal_key";

    if (isMock) {
      // Simulate generation delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const randomIndex = Math.floor(Math.random() * MOCK_IMAGES.length);
      finalImageUrl = MOCK_IMAGES[randomIndex];
    } else {
      try {
        const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
          method: "POST",
          headers: {
            Authorization: `Key ${process.env.FAL_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            image_size:
              ratio === "16:9"
                ? "landscape_16_9"
                : ratio === "9:16"
                  ? "portrait_16_9"
                  : "square_hd",
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Fal.ai API error: ${errText}`);
        }

        const data = await response.json();
        const generatedUrl = data.images?.[0]?.url;

        if (!generatedUrl) {
          throw new Error("No image URL returned from Fal.ai");
        }

        // Upload to Cloudinary
        finalImageUrl = await uploadToCloudinary(generatedUrl, "image");
      } catch (genError) {
        console.error("Fal.ai generation failed. Refunding credits...", genError);
        // Refund credit
        await db.update(users).set({ credits: user.credits }).where(eq(users.id, userId));
        return NextResponse.json(
          { error: "Image generation failed. Credits refunded." },
          { status: 500 }
        );
      }
    }

    // 3. Save generation record
    const [generation] = await db
      .insert(generations)
      .values({
        userId,
        type: "image",
        prompt,
        aspectRatio: ratio,
        mediaUrl: finalImageUrl,
        status: "completed",
        creditsUsed: 1,
      })
      .returning();

    return NextResponse.json({
      success: true,
      generation,
      creditsRemaining: newCredits,
    });
  } catch (error) {
    console.error("Image generation API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
