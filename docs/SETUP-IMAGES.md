# Setup — How to change and replace images

Where images are used and how to change them (code vs admin).

---

## 0. Hero video and venue images (Grand-style clone)

The public site expects:

- **Hero video**: `public/video/hero.mp4` — used on the home hero. If missing, the hero falls back to a poster image.
- **Venue images**: `public/images/venue/venue-1.png` … `venue-7.png` — used by the gallery API, suites and home sections.

To copy from THE GRAND ROUND HOUSE (if you have it):

```bash
cp "THE GRAND ROUND HOUSE/public/video/hero.mp4" public/video/
cp THE\ GRAND\ ROUND\ HOUSE/public/images/venue/venue-*.png public/images/venue/
```

Or add your own files to `public/video/` and `public/images/venue/`. The gallery and suites will use placeholders when local files are not present.

---

## 1. Images in code (current setup)

These are set in the codebase. Change the URL or path in the file listed.

| Place        | File | What to change |
|-------------|------|----------------|
| **Hero background** | `src/app/globals.css` | Search for `hero-bg` and the `url("https://images.unsplash.com/...")` — replace with your image URL. |
| **About section**  | `src/components/home/About.tsx` | `style={{ backgroundImage: url("...") }}` — replace the URL. |
| **Catering**       | `src/components/home/Catering.tsx` | Same: `catering-image` background `url("...")`. |
| **Décor**          | `src/components/home/Decor.tsx` | Same: `decor-image` background `url("...")`. |
| **Instagram grid** | `src/components/home/InstagramSection.tsx` | Array `PLACEHOLDER_IMAGES` — replace each URL with your image or Instagram asset URL. |

Use a CDN or Supabase Storage URL (e.g. `https://your-project.supabase.co/storage/v1/object/public/bucket-name/path/to/image.jpg`).

---

## 2. Images via admin (future)

When **site_images** is wired to the admin “Content & images” page:

- Each slot has a **key** (e.g. `hero`, `about`, `catering`, `gallery_1`, `instagram_1`).
- Admin sets **url** (full image URL) or **storage_path** (Supabase Storage path). Frontend reads from `site_images` and renders the image.
- No code change needed to swap images; only admin updates the record.

---

## 3. Supabase Storage (recommended for uploads)

1. In Supabase Dashboard: Storage → create a bucket (e.g. `public-images`), set it to **Public** if the site should show images without signed URLs.
2. Upload images; copy the public URL (e.g. `https://xxx.supabase.co/storage/v1/object/public/public-images/hero.jpg`).
3. Either put that URL in code (see table above) or in **site_images.url** once the admin UI is built.

---

## 4. Environment variables

You can keep a base URL in env if all images live in one place:

- `.env.local`: `NEXT_PUBLIC_IMAGES_BASE=https://your-cdn.com/roundhouse`
- In code: `` `${process.env.NEXT_PUBLIC_IMAGES_BASE}/hero.jpg` ``

Use `NEXT_PUBLIC_` only for values that are safe to expose in the browser.

---

## 5. Checklist

- [ ] Replace hero background URL in `globals.css`.
- [ ] Replace about/catering/décor image URLs in their components (or switch to `site_images` when ready).
- [ ] Replace Instagram placeholder URLs in `InstagramSection.tsx` or connect to `site_images`/API.
- [ ] (Optional) Create Storage bucket and use its URLs.
- [ ] (Optional) Build admin UI for **site_images** so all images are manageable without code changes.
