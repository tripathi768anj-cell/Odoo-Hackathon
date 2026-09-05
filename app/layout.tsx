import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/auth-context";

export const metadata: Metadata = {
  title: "DealFlow 360 | Enterprise Sales & Revenue Operations",
  description: "Enterprise sales operations from quotation, discount gating, multi-level approval, and stock allocation to billing and payment reconciliation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <a className="skip-link" href="#main">Skip to content</a>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
