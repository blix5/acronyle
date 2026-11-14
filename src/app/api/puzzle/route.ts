import { NextResponse, type NextRequest } from "next/server";
import { isServableDate } from "@/lib/dates";
import { getOrCreatePuzzle, toPublic } from "@/lib/puzzles";

// Generating a puzzle on a cache miss can take a while.
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!isServableDate(date)) {
    return NextResponse.json({ error: "That puzzle isn't available." }, { status: 400 });
  }
  try {
    const puzzle = await getOrCreatePuzzle(date);
    return NextResponse.json(toPublic(puzzle), {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
    });
  } catch (err) {
    console.error("[acronyle] failed to load puzzle", err);
    return NextResponse.json({ error: "Couldn't load the puzzle. Try again shortly." }, { status: 503 });
  }
}
