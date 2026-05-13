/**
 * Server-side upload proxy — reads the httpOnly auth cookie from the
 * Next.js cookie store (not accessible to the browser JS) and forwards
 * multipart form data to the FastAPI backend with the cookie attached.
 *
 * Why this exists: Next.js rewrites don't reliably forward Cookie headers
 * for multipart/form-data requests in standalone mode.
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const BACKEND =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string }> },
): Promise<NextResponse> {
  const { endpoint } = await params;

  // Only allow known upload endpoints
  const allowed = ["image", "proof", "video"];
  if (!allowed.includes(endpoint)) {
    return NextResponse.json({ detail: "Invalid upload endpoint" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  // Forward the raw multipart body to the backend
  const formData = await request.formData();

  const backendRes = await fetch(`${BACKEND}/uploads/${endpoint}`, {
    method: "POST",
    headers: {
      Cookie: `access_token=${token}`,
    },
    body: formData,
  });

  const text = await backendRes.text();

  if (!backendRes.ok) {
    return NextResponse.json(
      { detail: text || `Upload failed (${backendRes.status})` },
      { status: backendRes.status },
    );
  }

  try {
    return NextResponse.json(JSON.parse(text), { status: backendRes.status });
  } catch {
    return new NextResponse(text, { status: backendRes.status });
  }
}
