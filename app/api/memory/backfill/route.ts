import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { backfillMessageEmbeddings } from "../../../lib/memory";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    let batchSize = 25;

    try {
      const body = await request.json();

      if (
        typeof body?.batchSize === "number" &&
        Number.isFinite(body.batchSize)
      ) {
        batchSize = Math.min(
          Math.max(Math.floor(body.batchSize), 1),
          50
        );
      }
    } catch {
      // Empty request body is fine.
    }

    const result =
      await backfillMessageEmbeddings(batchSize);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "ClaudeGPT memory backfill failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Memory backfill failed.",
      },
      { status: 500 }
    );
  }
}