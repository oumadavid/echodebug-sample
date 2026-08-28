import type { ReactNode } from "react";

export const metadata = {
  title: "echodebug-sample",
  description: "Broken Next.js sample used to test an error-log debugging agent",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
