import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team – The Grand Round House",
  description: "Meet the team behind The Grand Round House.",
};

export default function TeamPage() {
  return (
    <main id="main-content" className="page-content">
      <div className="container">
        <h1 className="page-title">Team</h1>
        <p className="page-lead">
          Meet the people who make every celebration at The Grand Round House exceptional.
        </p>
        <p className="page-body">
          Content for this page can be managed from the admin dashboard under Pages &amp; content.
        </p>
      </div>
    </main>
  );
}
