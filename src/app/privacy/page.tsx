import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – The Grand Roundhouse",
  description: "Privacy policy for The Grand Roundhouse website.",
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="page-content">
      <div className="container">
        <h1 className="page-title">Privacy Policy</h1>
        <p className="page-body">
          Content for this page can be managed from the admin dashboard under Pages &amp; content.
        </p>
      </div>
    </main>
  );
}
