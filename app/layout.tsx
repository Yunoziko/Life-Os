import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { appConfig } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "AZIO is an intelligent personal operating system for managing tasks, goals, projects, habits, calendar, notes and more.";

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.url),
  applicationName: "AZIO",
  title: {
    default: "AZIO — Your life, organized intelligently.",
    template: `%s · AZIO`,
  },
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    title: "AZIO — Your life, organized intelligently.",
    description,
    siteName: "AZIO",
    type: "website",
    url: "/",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "AZIO — Your life, organized intelligently.",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full overflow-x-hidden font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
