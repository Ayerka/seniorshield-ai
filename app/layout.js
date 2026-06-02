import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "SeniorShield — Bezpieczny Senior w sieci",
  description:
    "Aplikacja pomagająca seniorom sprawdzać podejrzane wiadomości, linki i treści wygenerowane przez AI."
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}