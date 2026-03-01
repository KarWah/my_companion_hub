import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/sidebar";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MobileNavProvider } from "@/components/MobileNavProvider";
import { MobileHeader } from "@/components/MobileHeader";

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
            <ThemeProvider>
              <MobileNavProvider>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar />
                  <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    <MobileHeader />
                    <main className="flex-1 overflow-y-auto bg-slate-900">
                      {children}
                    </main>
                  </div>
                </div>
              </MobileNavProvider>
            </ThemeProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
