import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LeadFlow CRM",
  description: "Lead flow CRM: import, assign, run cadences, hand off to a closer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
