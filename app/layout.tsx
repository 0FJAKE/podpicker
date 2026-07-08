import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pod of Jake — Episode Picker",
  description:
    "200+ episodes with the world's most interesting builders. Tell me what you're into and I'll pick where you should start.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
