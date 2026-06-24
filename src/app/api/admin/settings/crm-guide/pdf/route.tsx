import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { AdminCrmGuidePdfDocument } from "@/lib/admin-crm-guide-pdf";

/** Download the staff CRM user guide PDF (Settings → User guide). */
export async function GET(request: Request) {
  if (!(await getAuthUserFromRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(<AdminCrmGuidePdfDocument />);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PDF render failed" }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Grand-Round-House-CRM-User-Guide.pdf"',
    },
  });
}
