import { NextResponse } from "next/server";

/** Production requires `SCRAPE_ADMIN_SECRET`; dev can omit both secret and header. */
export function adminMutationsConfigError(): NextResponse | null {
  const secret = process.env.SCRAPE_ADMIN_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "SCRAPE_ADMIN_SECRET is not configured", code: "ADMIN_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    return null;
  }
  return null;
}

export function isAdminMutationAuthorized(request: Request): boolean {
  const secret = process.env.SCRAPE_ADMIN_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("x-admin-scrape-secret")?.trim();
  return header === secret;
}
