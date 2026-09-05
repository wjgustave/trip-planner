import type { Metadata, Viewport } from "next";
import { Figtree, Poppins } from "next/font/google";
import "@vibe/core/tokens";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";

// Vibe does not bundle fonts: Figtree for UI, Poppins for headings,
// wired into Vibe's --font-family / --title-font-family tokens in globals.css.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thailand 2027",
  description: "Collaborative trip timeline for the Thailand 2027 group trip",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
