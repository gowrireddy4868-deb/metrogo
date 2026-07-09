import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ChatWidget from "@/components/ChatWidget";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "MetroGo — Book metro tickets in seconds",
  description: "Plan your journey, buy tickets, and ride. Fast metro ticket booking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans" style={{ background: "var(--paper)", color: "var(--text-main)" }}>
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[var(--line-rule)] py-6 text-center text-xs text-[var(--text-mute)]">
            MetroGo © {new Date().getFullYear()} · Fast, safe metro ticketing
          </footer>
          <ChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
