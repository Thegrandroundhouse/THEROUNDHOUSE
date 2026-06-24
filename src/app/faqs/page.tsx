import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQs – The Grand Round House",
  description: "Frequently asked questions about The Grand Round House venue and events.",
};

export default function FAQsPage() {
  return (
    <main id="main-content" className="page-content">
      <div className="container">
        <h1 className="page-title">FAQs</h1>
        <p className="page-lead">
          Common questions about capacity, catering, booking and more.
        </p>
        <p className="page-body">
          Content for this page can be managed from the admin dashboard under Pages &amp; content.
        </p>
      </div>
    </main>
  );
}
