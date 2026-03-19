import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import LayoutWrapper from "@/components/layout-wrapper";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/context/ProtectedRoute";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://vextron.ai";

export const metadata: Metadata = {
  title: {
    default: "Vextron AI - Intelligent Conversational Interface",
    template: "%s | Vextron AI",
  },
  description: "Experience the next generation of conversational AI. State-of-the-art intelligence engineered for clarity, speed, and uncompromising performance.",
  keywords: [
    "AI chat",
    "conversational AI",
    "chatbot",
    "intelligent assistant",
    "natural language processing",
    "machine learning",
    "Vextron",
    "AI assistant",
    "GPT alternative",
    "AI chatbot",
    "online AI",
  ],
  authors: [{ name: "Vextron AI" }],
  creator: "Vextron AI",
  metadataBase: new URL(baseUrl),
  
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Vextron AI",
    title: "Vextron AI - Intelligent Conversational Interface",
    description: "Experience the next generation of conversational AI. State-of-the-art intelligence engineered for clarity, speed, and uncompromising performance.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vextron AI - Intelligent Conversational Interface",
        type: "image/png",
      },
      {
        url: "/og-image-square.png",
        width: 800,
        height: 800,
        alt: "Vextron AI",
        type: "image/png",
      },
    ],
  },
  
  twitter: {
    card: "summary_large_image",
    title: "Vextron AI - Intelligent Conversational Interface",
    description: "Experience the next generation of conversational AI",
    images: ["/og-image.png"],
    creator: "@vextronai",
  },
  
  robots: {
    index: true,
    follow: true,
    nocache: false,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
  
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  
  manifest: "/site.webmanifest",
  
  alternates: {
    canonical: baseUrl,
  },
  verification: {
    google: "M-RH5LhTnCCIBauNpdYEQx7i0dH9t1g0u-PSwKkgYxQ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <TooltipProvider>
              <ProtectedRoute>
                <LayoutWrapper>
                  {children}
                </LayoutWrapper>
              </ProtectedRoute>
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
