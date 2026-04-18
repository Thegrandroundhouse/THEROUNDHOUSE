import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-api";
import { getAdminClient } from "@/lib/admin-api";

const BUCKET = "invoice-logos";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB for logos

export async function POST(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const type = (file.type || "").toLowerCase();
  if (!type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image (PNG, JPG, etc.)" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image too large (max 2MB)" }, { status: 400 });
  }

  const ext = type === "image/png" ? "png" : type === "image/jpeg" || type === "image/jpg" ? "jpg" : "png";
  const path = `${crypto.randomUUID()}.${ext}`;

  try {
    const { data: bucketList } = await supabase.storage.listBuckets();
    const exists = bucketList?.some((b) => b.name === BUCKET);
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true });
      if (createErr) {
        return NextResponse.json(
          { error: `Storage bucket "${BUCKET}" not found. Create it in Supabase Dashboard → Storage.` },
          { status: 502 }
        );
      }
    }
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }
}
