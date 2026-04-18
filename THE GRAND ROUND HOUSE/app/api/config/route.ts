import { NextResponse } from "next/server";
import { siteConfig } from "@/data/site";

export async function GET() {
  return NextResponse.json(siteConfig);
}
