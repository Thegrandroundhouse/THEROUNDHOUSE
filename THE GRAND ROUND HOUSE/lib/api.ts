const BASE = "";

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE}${url}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json() as Promise<T>;
}

export async function postEnquiry(data: Record<string, unknown>) {
  const res = await fetch("/api/enquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Enquiry failed");
  return res.json();
}
