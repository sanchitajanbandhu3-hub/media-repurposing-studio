import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Studio — Media Repurposing", description: "Thoughtful tools for turning long conversations into lasting content." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
