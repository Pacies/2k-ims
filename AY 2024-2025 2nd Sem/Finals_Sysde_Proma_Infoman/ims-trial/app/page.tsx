"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import LoadingScreen from "@/components/loading-screen"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to landing page after a brief loading screen
    const timer = setTimeout(() => {
      router.push("/landing")
    }, 1500)

    return () => clearTimeout(timer)
  }, [router])

  return <LoadingScreen />
}
