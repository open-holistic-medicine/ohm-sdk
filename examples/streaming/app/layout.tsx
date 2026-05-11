import type { ReactNode } from "react";

export const metadata = {
  title: "OHM streaming demo",
  description: "audio.extract.stream — transcript renders before extraction.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        {children}
      </body>
    </html>
  );
}
