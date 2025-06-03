import { createClient } from "@supabase/supabase-js"

// Get environment variables - no fallbacks for security
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if environment variables are configured
export const isConfigured = !!(supabaseUrl && supabaseAnonKey)

// Only create client if properly configured
export const supabase = isConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
      },
    })
  : null

// Test the connection
export async function testSupabaseConnection() {
  try {
    if (!isConfigured || !supabase) {
      console.log("Supabase not configured - missing environment variables")
      console.log("NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl)
      console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", !!supabaseAnonKey)
      return false
    }

    console.log("Testing Supabase connection...")
    console.log("Supabase URL:", supabaseUrl)
    console.log("Supabase Key available:", !!supabaseAnonKey)

    // Test with a simple query that should work with any Supabase project
    const { data, error } = await supabase.from("users").select("count").limit(1)

    if (error) {
      console.error("Supabase connection test failed:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })

      // If the table doesn't exist, that's still a successful connection
      if (error.code === "PGRST116" || error.message.includes("does not exist")) {
        console.log("Connection successful but users table may not exist yet")
        return true
      }

      return false
    }

    console.log("Supabase connection test successful")
    return true
  } catch (error) {
    console.error("Supabase connection test error:", error)
    return false
  }
}

// Type definitions for your database tables
export interface InventoryItem {
  id: number
  name: string
  description: string | null
  category: string
  price: number
  stock: number
  sku: string
  status: "in-stock" | "low-stock" | "out-of-stock"
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: number
  order_number: string
  customer_name: string
  customer_email: string
  items: string // JSON string of order items
  total: number
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  username: string
  email: string
  user_type: "admin" | "staff" | "viewer"
  status: "active" | "inactive"
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: number
  user_id: number | null
  action: string
  description: string
  created_at: string
}

export interface RawMaterial {
  id: number
  name: string
  description: string | null
  supplier: string | null
  cost_per_unit: number
  quantity: number
  unit: string
  status: "available" | "low-stock" | "out-of-stock"
  created_at: string
  updated_at: string
}
