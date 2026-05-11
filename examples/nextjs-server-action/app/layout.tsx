import type { ReactNode } from "react";

export const metadata = {
  title: "OHM SDK demo",
  description: "Next.js server action demo for @ohm_studio/sdk.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
