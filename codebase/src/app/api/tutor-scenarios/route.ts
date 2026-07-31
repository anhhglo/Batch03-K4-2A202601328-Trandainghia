import { NextResponse } from "next/server";

import { listTutorScenarioSummaries } from "@/lib/tutor/tutor-scenarios";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ scenarios: listTutorScenarioSummaries() });
}
