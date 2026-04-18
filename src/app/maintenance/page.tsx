import Link from "next/link";

export default function MaintenancePage() {
  return (
    <div className="maintenance-page">
      <h1>We&apos;re updating something special</h1>
      <p>
        The Grand Roundhouse website is temporarily under maintenance. We&apos;ll be
        back shortly. Thank you for your patience.
      </p>
      <Link href="/admin-login" className="btn btn-primary">
        Staff login
      </Link>
    </div>
  );
}
