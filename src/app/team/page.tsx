import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team – The Grand Roundhouse",
  description: "Meet the team behind The Grand Roundhouse.",
};

export default function TeamPage() {
  return (
    <main id="main-content" className="page-content">
      <div className="container">
        <h1 className="page-title">Team</h1>
        <p className="page-lead">
          Meet the people who make every celebration at The Grand Roundhouse exceptional.
        </p>
        <p className="page-body">
          Content for this page can be managed from the admin dashboard under Pages &amp; content.
        </p>
      </div>
    </main>
  );
}
