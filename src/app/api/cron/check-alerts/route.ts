import { NextResponse } from "next/server";
import { evaluateAlerts } from "@/lib/services/alert-evaluator";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await evaluateAlerts();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[Cron] Alert check failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
