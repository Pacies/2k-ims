"use client"

import type { ReactNode } from "react"
import Navbar from "./navbar"

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-20 pb-8 px-4 max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
