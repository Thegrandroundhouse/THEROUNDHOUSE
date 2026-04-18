import type { Metadata } from "next";
import "./globals.css";
import { PublicShell } from "@/components/layout/PublicShell";

export const metadata: Metadata = {
  title: "The Grand Roundhouse – Wedding Venue London",
  description:
    "A luxury wedding and reception venue in North London. Elegance tailored to every occasion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PublicShell>{children}</PublicShell>
      </body>
    </html>
  );
}
