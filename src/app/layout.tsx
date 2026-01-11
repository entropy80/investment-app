import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ConditionalNavbar } from "@/components/navigation/conditional-navbar"
import { ConditionalFooter } from "@/components/navigation/conditional-footer"
import { AuthProvider } from "@/components/providers/session-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Investment App - Portfolio Tracking & Education",
  description: "Modern investment platform for portfolio tracking and education",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <ConditionalNavbar />
            <main className="flex-1">{children}</main>
            <ConditionalFooter />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
