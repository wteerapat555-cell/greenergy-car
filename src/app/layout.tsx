import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Greenergy — Car Reservation",
  description: "ระบบจองรถสำหรับองค์กร Greenergy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-linen font-sarabun">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: "Sarabun, sans-serif",
              fontSize: "16px",
              background: "#1C1C1C",
              color: "#fff",
            },
            success: {
              iconTheme: { primary: "#35654E", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#dc2626", secondary: "#fff" },
            },
          }}
        />
      </body>
    </html>
  );
}
