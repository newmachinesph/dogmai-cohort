import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

// Extract file key from UploadThing URL
function getFileKeyFromUrl(url: string): string | null {
  try {
    // UploadThing URLs look like: https://utfs.io/f/{fileKey} or https://{app}.ufs.sh/f/{fileKey}
    const match = url.match(/\/f\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be less than 2MB" }, { status: 400 });
    }

    // Get current user to check for existing avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { avatarUrl: true },
    });

    const oldAvatarUrl = currentUser?.avatarUrl;

    // Upload new image to UploadThing
    const response = await utapi.uploadFiles(file);

    if (response.error) {
      console.error("Upload error:", response.error);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }

    const avatarUrl = response.data.ufsUrl;

    // Update user's avatar URL
    await prisma.user.update({
      where: { id: user.userId },
      data: { avatarUrl },
    });

    // Delete old avatar from UploadThing (if exists and is an UploadThing URL)
    if (oldAvatarUrl) {
      const oldFileKey = getFileKeyFromUrl(oldAvatarUrl);
      if (oldFileKey) {
        try {
          await utapi.deleteFiles(oldFileKey);
          console.log(`Deleted old avatar: ${oldFileKey}`);
        } catch (deleteError) {
          // Log but don't fail the request if delete fails
          console.error("Failed to delete old avatar:", deleteError);
        }
      }
    }

    return NextResponse.json({ url: avatarUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}
