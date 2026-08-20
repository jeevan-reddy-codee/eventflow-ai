import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventFlow AI",
  description: "Campus event capacity, QR check-in, waitlist, and real-time crowd tracking.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

