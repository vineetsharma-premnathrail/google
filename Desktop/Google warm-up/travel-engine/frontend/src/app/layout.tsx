import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel Engine — AI Trip Planner",
  description: "Plan trips dynamically with AI, real-time updates, and smart constraints",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
