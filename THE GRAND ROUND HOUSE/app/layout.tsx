import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { ComingSoonBanner } from "@/components/layout/ComingSoonBanner";
import { ComingSoonEntrance } from "@/components/layout/ComingSoonEntrance";
import { Footer } from "@/components/layout/Footer";
import { SWRProvider } from "@/components/providers/SWRProvider";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Grand Round House – Luxury Wedding Venue London",
  description:
    "A luxury wedding and reception venue in North London. Asian, African, Turkish and more. Over 800 capacity, in-house catering and décor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="min-h-screen flex flex-col font-sans text-charcoal">
        <SWRProvider>
          <ComingSoonEntrance />
          <Header />
          <ComingSoonBanner />
          <main className="relative z-0 flex-1">{children}</main>
          <Footer />
        </SWRProvider>
      </body>
    </html>
  );
}
