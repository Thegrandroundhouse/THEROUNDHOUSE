# The Grand Round House

A luxury wedding venue website built with **Next.js 15**, **React 19**, and **SWR** for data fetching and caching. Inspired by [Meridian Grand](https://www.meridiangrand.co.uk/).

## Stack

- **Node.js** – runtime
- **Next.js 15** – App Router, React Server Components
- **React 19**
- **SWR** – client-side data fetching with caching (testimonials, suites, gallery, config)
- **TypeScript**
- **Tailwind CSS**

## Project structure

```
├── app/                    # Next.js App Router
│   ├── api/                # API routes (testimonials, suites, config, gallery, enquiry)
│   ├── weddings/           # Weddings index + [type] dynamic pages
│   ├── events/              # Events index + [slug] dynamic pages
│   ├── suites/              # Suites list + [slug] detail (SWR)
│   ├── catering/
│   ├── decor/
│   ├── gallery/             # Gallery (SWR)
│   ├── testimonials/        # Testimonials (SWR)
│   ├── contact/            # Contact + Enquiry form
│   ├── layout.tsx
│   ├── page.tsx             # Home
│   └── globals.css
├── components/
│   ├── layout/              # Header, Footer
│   ├── home/                # Hero, About, TestimonialsSection, WeddingTypes, Stats, CateringDecor
│   ├── contact/             # EnquiryForm
│   └── providers/           # SWRProvider
├── hooks/                   # useTestimonials, useSuites (SWR)
├── lib/                     # swr-config, api (fetcher, postEnquiry)
├── types/                   # TypeScript types
├── data/                    # site, testimonials, suites, weddings, events
└── public/                  # Static assets (add /images/gallery, /images/suites)
```

## Commands

```bash
npm install
npm run dev    # http://localhost:3000
npm run build
npm run start
```

## SWR usage

- **Testimonials** and **Suites** are fetched from `/api/testimonials` and `/api/suites` and cached by SWR (1 min deduping).
- **Gallery** uses `useSWR(SWR_KEYS.gallery(category))`.
- Global `SWRProvider` in `app/layout.tsx` sets `fetcher` and options in `lib/swr-config.ts`.

## Enquiry form

Submit goes to `POST /api/enquiry`. Extend the route to validate, email, or save to a database.

## Images

Add your own images under `public/images/` (e.g. `public/images/suites/`, `public/images/gallery/`) and update `data/suites.ts` and the gallery API if needed.
