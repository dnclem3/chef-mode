import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { SiteNav } from "@/components/site-nav"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Recipe Walker - Step-by-Step Cooking Guide",
  description: "Follow recipes step-by-step with timers and ingredient tracking",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SiteNav />
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
