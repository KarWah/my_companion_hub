import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/sidebar";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/error-boundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Companion Hub",
  description: "AI Companion Chat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />

              <main className="flex-1 overflow-y-auto bg-slate-950">
                {children}
              </main>
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}