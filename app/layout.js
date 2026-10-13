import "./globals.css";

export const metadata = {
  title: "Il mio assistente",
  description: "Assistente personale costruito durante il corso",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
