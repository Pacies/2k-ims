import { NextResponse } from "next/server"
import { testSupabaseConnection } from "@/lib/supabaseClient"

export async function GET() {
  const isConnected = await testSupabaseConnection()

  if (isConnected) {
    return NextResponse.json({ status: "ok", message: "Database connection successful" }, { status: 200 })
  } else {
    return NextResponse.json({ status: "error", message: "Database connection failed" }, { status: 503 })
  }
}

export async function HEAD() {
  const isConnected = await testSupabaseConnection()

  if (isConnected) {
    return new NextResponse(null, { status: 200 })
  } else {
    return new NextResponse(null, { status: 503 })
  }
}
