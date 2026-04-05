import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../index.css";

export const metadata: Metadata = {
  title: "BWP Water",
  description: "Business Water Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
