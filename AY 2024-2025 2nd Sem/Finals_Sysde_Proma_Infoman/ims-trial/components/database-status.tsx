"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Database, WifiOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { isConfigured } from "@/lib/supabaseClient"

export default function DatabaseStatus() {
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "offline">("checking")

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    if (!isConfigured) {
      setConnectionStatus("offline")
      return
    }

    try {
      // Try to make a simple query to test connection
      const response = await fetch("/api/health", { method: "HEAD" })
      setConnectionStatus("connected")
    } catch (error) {
      setConnectionStatus("offline")
    }
  }

  if (connectionStatus === "checking") {
    return (
      <Alert>
        <Database className="h-4 w-4 animate-pulse" />
        <AlertDescription>Checking database connection...</AlertDescription>
      </Alert>
    )
  }

  if (connectionStatus === "offline" || !isConfigured) {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <WifiOff className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="flex items-center justify-between">
            <span>Running in offline mode - Connect your Supabase database to see real data</span>
            <Badge variant="secondary">Demo Mode</Badge>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-green-200 bg-green-50">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <div className="flex items-center justify-between">
          <span>Database connected successfully</span>
          <Badge variant="default" className="bg-green-100 text-green-800">
            Live Data
          </Badge>
        </div>
      </AlertDescription>
    </Alert>
  )
}
