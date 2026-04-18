import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";
import { writeAuditLog } from "@/lib/audit-log";

async function loadWorkspace(supabase: NonNullable<ReturnType<typeof getAdminClient>>, bookingId: string) {
  const [wedding, milestones, tasks, documents, communications, vendorLinks, spaces] = await Promise.all([
    supabase.from("booking_wedding_details").select("*").eq("booking_id", bookingId).maybeSingle(),
    supabase.from("booking_payment_milestones").select("*").eq("booking_id", bookingId).order("sort_order"),
    supabase.from("booking_tasks").select("*").eq("booking_id", bookingId).order("sort_order"),
    supabase.from("booking_documents").select("*").eq("booking_id", bookingId).order("created_at", { ascending: false }),
    supabase.from("booking_communications").select("*").eq("booking_id", bookingId).order("sent_at", { ascending: false }),
    supabase.from("booking_vendors").select("vendor_id, role, vendors(id, name, vendor_type)").eq("booking_id", bookingId),
    supabase.from("venue_spaces").select("id, name, slug").order("sort_order"),
  ]);
  return {
    wedding: wedding.data || null,
    milestones: milestones.data ?? [],
    tasks: tasks.data ?? [],
    documents: documents.data ?? [],
    communications: communications.data ?? [],
    bookingVendors: vendorLinks.data ?? [],
    spaces: spaces.data ?? [],
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAuthUserFromRequest(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  try {
    return NextResponse.json(await loadWorkspace(supabase, bookingId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Workspace tables missing — run migration 015";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: bookingId } = await params;
  const body = await request.json();
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const touched: string[] = [];
  if (body.wedding) touched.push("wedding");
  if (body.space_id !== undefined) touched.push("space");
  if (Array.isArray(body.milestones)) touched.push("milestones");
  if (body.newTask?.title) touched.push("task+");
  if (body.updateTask) touched.push("task~");
  if (body.deleteTaskId) touched.push("task-");
  if (body.newComm?.body) touched.push("comm+");
  if (body.newDoc?.name) touched.push("doc+");
  if (body.deleteDocId) touched.push("doc-");
  if (body.linkVendor?.vendor_id) touched.push("vendor+");
  if (body.unlinkVendorId) touched.push("vendor-");

  try {
    if (body.wedding) {
      const w = body.wedding;
      await supabase.from("booking_wedding_details").upsert(
        {
          booking_id: bookingId,
          guest_count: w.guest_count ?? null,
          seating_notes: w.seating_notes ?? null,
          menu_selection: w.menu_selection ?? null,
          decoration_preferences: w.decoration_preferences ?? null,
          vendor_coordination_notes: w.vendor_coordination_notes ?? null,
          timeline: w.timeline ?? [],
          internal_special_requests: w.internal_special_requests ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "booking_id" }
      );
    }
    if (body.space_id !== undefined) {
      await supabase.from("bookings").update({ space_id: body.space_id || null }).eq("id", bookingId);
    }
    if (Array.isArray(body.milestones)) {
      await supabase.from("booking_payment_milestones").delete().eq("booking_id", bookingId);
      for (let i = 0; i < body.milestones.length; i++) {
        const m = body.milestones[i];
        await supabase.from("booking_payment_milestones").insert({
          booking_id: bookingId,
          label: m.label || `Payment ${i + 1}`,
          amount_cents: m.amount_cents ?? null,
          due_date: m.due_date || null,
          status: m.status || "pending",
          sort_order: i,
        });
      }
    }
    if (body.newTask?.title) {
      await supabase.from("booking_tasks").insert({
        booking_id: bookingId,
        title: body.newTask.title,
        due_date: body.newTask.due_date || null,
        workflow_key: body.newTask.workflow_key || null,
        sort_order: 99,
      });
    }
    if (body.updateTask) {
      await supabase
        .from("booking_tasks")
        .update({
          title: body.updateTask.title,
          done: !!body.updateTask.done,
          due_date: body.updateTask.due_date,
        })
        .eq("id", body.updateTask.id);
    }
    if (body.deleteTaskId) {
      await supabase.from("booking_tasks").delete().eq("id", body.deleteTaskId);
    }
    if (body.newComm?.body) {
      await supabase.from("booking_communications").insert({
        booking_id: bookingId,
        channel: body.newComm.channel || "note",
        direction: body.newComm.direction || "out",
        subject: body.newComm.subject || null,
        body: body.newComm.body,
        sent_at: new Date().toISOString(),
      });
    }
    if (body.newDoc?.name) {
      await supabase.from("booking_documents").insert({
        booking_id: bookingId,
        name: body.newDoc.name,
        doc_type: body.newDoc.doc_type || null,
        file_url: body.newDoc.file_url || null,
        custom_fields: body.newDoc.custom_fields && typeof body.newDoc.custom_fields === "object" ? body.newDoc.custom_fields : {},
      });
    }
    if (body.deleteDocId) {
      await supabase.from("booking_documents").delete().eq("id", body.deleteDocId);
    }
    if (body.linkVendor?.vendor_id) {
      await supabase.from("booking_vendors").upsert({
        booking_id: bookingId,
        vendor_id: body.linkVendor.vendor_id,
        role: body.linkVendor.role || null,
      });
    }
    if (body.unlinkVendorId) {
      await supabase.from("booking_vendors").delete().eq("booking_id", bookingId).eq("vendor_id", body.unlinkVendorId);
    }
    const ws = await loadWorkspace(supabase, bookingId);
    if (touched.length) {
      await writeAuditLog(supabase, user, {
        action: "workspace_update",
        entity_type: "booking",
        entity_id: bookingId,
        booking_id: bookingId,
        summary: `Workspace: ${touched.join(", ")}`,
        metadata: { sections: touched },
      });
    }
    return NextResponse.json(ws);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
