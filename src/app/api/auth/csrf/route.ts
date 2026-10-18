import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, generateCsrfToken } from "@/lib/auth";

// GET /api/auth/csrf - Get CSRF token for the current session
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate CSRF token tied to user's session
    const csrfToken = generateCsrfToken(user.userId);

    return NextResponse.json({ csrfToken });
  } catch (error) {
    console.error("CSRF token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}
