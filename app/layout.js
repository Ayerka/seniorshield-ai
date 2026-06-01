import "./globals.css";

export const metadata = {
  title: "SeniorShield — Bezpieczny Senior w sieci",
  description: "Aplikacja pomagająca seniorom rozpoznawać oszustwa internetowe."
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
