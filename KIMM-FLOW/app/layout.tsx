import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KIMM-Flow Prototype",
  description: "KIMM-Flow CFD desktop interface prototype",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
