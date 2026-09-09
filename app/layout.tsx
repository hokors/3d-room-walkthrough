import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Room Walkthrough",
  description: "Explore a 3D room in a first-person view.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
