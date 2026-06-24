import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Virtual Tour – The Grand Round House",
  description: "Take a virtual tour of The Grand Round House venue.",
};

export default function VirtualTourPage() {
  return (
    <main id="main-content" className="page-content">
      <div className="container">
        <h1 className="page-title">Virtual Tour</h1>
        <p className="page-lead">
          Explore our spaces from anywhere. Virtual tour content can be embedded here.
        </p>
        <p className="page-body">
          Content for this page can be managed from the admin dashboard under Pages &amp; content.
        </p>
      </div>
    </main>
  );
}
