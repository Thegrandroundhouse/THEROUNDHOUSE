import { NextResponse } from "next/server";
import { suites } from "@/data/suites";

export async function GET() {
  return NextResponse.json(suites);
}
