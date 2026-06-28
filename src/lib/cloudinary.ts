import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  url: string,
  resourceType: "image" | "video"
): Promise<string> {
  // If credentials are the default mock values, skip and return original URL
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME === "mock_cloud" ||
    !process.env.CLOUDINARY_API_KEY ||
    process.env.CLOUDINARY_API_KEY === "mock_key"
  ) {
    console.log(
      `[CLOUDINARY MOCK] Cloudinary is not configured. Returning original URL: ${url}`
    );
    return url;
  }

  try {
    const result = await cloudinary.uploader.upload(url, {
      resource_type: resourceType,
      folder: "pixelreel",
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    // Return original url as fallback
    return url;
  }
}
