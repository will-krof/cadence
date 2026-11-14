import { NextRequest, NextResponse } from "next/server";

/**
 * Private JSON responses. Next.js and the hosting layer negotiate compression;
 * precompressing here causes double gzip with current Next.js route handling.
 */
export function jsonResponse(_request: NextRequest, data: unknown) {
  return NextResponse.json(data, {
    headers: { "cache-control": "no-store, private" },
  });
}
