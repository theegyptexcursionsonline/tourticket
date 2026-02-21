// app/layout.tsx
// Root layout - passthrough to [locale]/layout.tsx and admin/layout.tsx
// which provide their own <html>/<body> wrappers
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
