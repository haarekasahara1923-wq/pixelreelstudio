import { db } from "./index";
import { users, creditPacks } from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@pixelreel.studio";
  
  // Hashing password for the admin account
  const adminPassword = await bcrypt.hash("Admin@123", 10);

  // Check if admin user already exists
  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail));

  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      name: "System Admin",
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      credits: 1000,
      isVerified: true,
    });
    console.log("Admin user seeded successfully!");
  } else {
    console.log("Admin user already exists.");
  }

  // Seed default credit packs
  const defaultPacks = [
    {
      name: "Starter Pack",
      credits: 100,
      price: 499, // ₹499
      description: "Perfect for testing things out. 100 credits for high-quality images and video generation.",
    },
    {
      name: "Creator Pro",
      credits: 500,
      price: 1999, // ₹1999
      description: "Best for content creators and professionals. 500 credits with faster generation speeds.",
    },
    {
      name: "Studio Master",
      credits: 1200,
      price: 3999, // ₹3999
      description: "For agencies and power users. 1200 credits to scale your creative output.",
    },
  ];

  for (const pack of defaultPacks) {
    const existingPack = await db.select().from(creditPacks).where(eq(creditPacks.name, pack.name));
    if (existingPack.length === 0) {
      await db.insert(creditPacks).values(pack);
      console.log(`Credit pack "${pack.name}" seeded.`);
    } else {
      console.log(`Credit pack "${pack.name}" already exists.`);
    }
  }

  console.log("Seeding complete!");
}

seed().catch((err) => {
  console.error("Error seeding database:", err);
  process.exit(1);
});
