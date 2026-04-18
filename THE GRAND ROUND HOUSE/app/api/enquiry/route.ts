import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  // In production: validate, send email, save to DB
  console.log("Enquiry received:", body);
  return NextResponse.json({ success: true, message: "Thank you. We will be in touch shortly." });
}
