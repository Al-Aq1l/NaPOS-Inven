import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAPS — Smart Inventory & POS",
  description: "The all-in-one POS & inventory platform built for Indonesian MSMEs. Capital efficiency, omnichannel scalability.",
  keywords: ["POS", "inventory", "MSME", "Indonesia", "retail", "F&B", "point of sale"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
