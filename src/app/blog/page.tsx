import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog – The Grand Roundhouse",
  description: "News, inspiration and updates from The Grand Roundhouse.",
};

export default function BlogPage() {
  return (
    <main id="main-content" className="page-content">
      <div className="container">
        <h1 className="page-title">Blog</h1>
        <p className="page-lead">
          News, seasonal inspiration and updates from our venue.
        </p>
        <p className="page-body">
          Content for this page can be managed from the admin dashboard under Pages &amp; content.
        </p>
      </div>
    </main>
  );
}
