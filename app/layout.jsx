import "@/styles/globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "PERIOD-APP",
  description: "Track your menstrual cycle and symptoms",
};

export default function Layout(props) {
  const { children } = props;

  return (
    <html lang="en" className={inter.variable}>
      <body className="font-display bg-background-light text-text-light">{children}</body>
    </html>
  );
}
