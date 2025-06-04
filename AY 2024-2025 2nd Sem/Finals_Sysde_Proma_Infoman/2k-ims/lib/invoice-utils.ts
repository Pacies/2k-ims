import { supabase } from "./supabaseClient"
import { updateInventoryItem, getInventoryItems, logActivity } from "./database"

export interface InvoiceItem {
  id: number
  productId: number
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  customerEmail: string // Added to match database schema
  customerAddress?: string
  customerPhone?: string
  items: InvoiceItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  status: "pending" | "fulfilled" | "cancelled"
  issueDate: string
  dueDate: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type InvoiceStatus = "pending" | "fulfilled" | "cancelled"

// Generate a new invoice number with better error handling and uniqueness guarantee
export async function generateInvoiceNumber(): Promise<string> {
  try {
    // Check if supabase client is available
    if (!supabase) {
      console.warn("Supabase client not available, using fallback invoice number")
      return `INV-${Date.now().toString().slice(-6)}`
    }

    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      attempts++

      try {
        // Try to get the next invoice number from settings
        const { data: settings, error: settingsError } = await supabase
          .from("invoice_settings")
          .select("next_invoice_number")
          .single()

        let nextNumber = 1001

        if (settingsError) {
          console.warn("Invoice settings not found, using fallback method:", settingsError.message)

          // Fallback: get the highest existing invoice number and increment
          const { data: invoices, error: invoicesError } = await supabase
            .from("invoices")
            .select("invoice_number")
            .order("invoice_number", { ascending: false })
            .limit(1)

          if (!invoicesError && invoices && invoices.length > 0) {
            const lastInvoiceNumber = invoices[0].invoice_number
            if (lastInvoiceNumber && lastInvoiceNumber.startsWith("INV-")) {
              const lastNumber = Number.parseInt(lastInvoiceNumber.replace("INV-", ""))
              if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1
              }
            }
          }
        } else {
          nextNumber = settings.next_invoice_number
        }

        const invoiceNumber = `INV-${nextNumber.toString().padStart(4, "0")}`

        // Check if this invoice number already exists
        const { data: existingInvoice, error: checkError } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("invoice_number", invoiceNumber)
          .single()

        if (checkError && checkError.code === "PGRST116") {
          // No existing invoice found, this number is available
          try {
            // Try to update the counter in settings
            if (!settingsError) {
              await supabase
                .from("invoice_settings")
                .update({ next_invoice_number: nextNumber + 1 })
                .eq("id", 1)
            }
          } catch (updateError) {
            console.warn("Could not update invoice counter:", updateError)
          }

          return invoiceNumber
        } else if (!checkError && existingInvoice) {
          // Invoice number already exists, try next number
          console.warn(`Invoice number ${invoiceNumber} already exists, trying next number`)

          // Force increment and try again
          if (!settingsError) {
            await supabase
              .from("invoice_settings")
              .update({ next_invoice_number: nextNumber + 1 })
              .eq("id", 1)
          }
          continue
        } else {
          console.error("Error checking existing invoice:", checkError)
          continue
        }
      } catch (error) {
        console.error(`Attempt ${attempts} failed:`, error)
        if (attempts >= maxAttempts) {
          break
        }
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // Final fallback to timestamp-based number with random component
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    return `INV-${timestamp}${random}`
  } catch (error) {
    console.error("Error generating invoice number:", error)
    // Ultimate fallback
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")
    return `INV-${timestamp}${random}`
  }
}

// Create a new invoice with comprehensive error handling
export async function createInvoice(
  invoiceData: Omit<Invoice, "id" | "invoiceNumber" | "createdAt" | "updatedAt">,
): Promise<Invoice> {
  try {
    // Validate input data
    if (!invoiceData.customerName?.trim()) {
      throw new Error("Customer name is required")
    }

    if (!invoiceData.items || invoiceData.items.length === 0) {
      throw new Error("At least one item is required")
    }

    if (!invoiceData.issueDate || !invoiceData.dueDate) {
      throw new Error("Issue date and due date are required")
    }

    // Check if supabase client is available
    if (!supabase) {
      throw new Error("Database connection not available")
    }

    let invoiceNumber: string
    let attempts = 0
    const maxAttempts = 5

    // Generate a unique invoice number with retry logic
    while (attempts < maxAttempts) {
      attempts++
      invoiceNumber = await generateInvoiceNumber()

      // Double-check uniqueness before proceeding
      const { data: existingInvoice, error: checkError } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("invoice_number", invoiceNumber)
        .single()

      if (checkError && checkError.code === "PGRST116") {
        // No existing invoice found, we can use this number
        break
      } else if (!checkError && existingInvoice) {
        // Invoice number exists, generate a new one
        console.warn(`Invoice number ${invoiceNumber} already exists, generating new one (attempt ${attempts})`)
        if (attempts >= maxAttempts) {
          // Use timestamp-based fallback
          const timestamp = Date.now().toString()
          const random = Math.floor(Math.random() * 100000)
            .toString()
            .padStart(5, "0")
          invoiceNumber = `INV-${timestamp.slice(-7)}${random}`
          break
        }
        continue
      } else {
        console.error("Error checking invoice uniqueness:", checkError)
        if (attempts >= maxAttempts) {
          throw new Error("Failed to generate unique invoice number")
        }
        continue
      }
    }

    console.log("Generated unique invoice number:", invoiceNumber)

    // Prepare invoice data for insertion - include all required fields
    const invoiceInsertData = {
      invoice_number: invoiceNumber!,
      customer_name: invoiceData.customerName.trim(),
      customer_email: invoiceData.customerEmail || "customer@example.com",
      customer_address: invoiceData.customerAddress || "",
      customer_phone: invoiceData.customerPhone || "",
      subtotal: Number(invoiceData.subtotal) || 0,
      tax_rate: Number(invoiceData.taxRate) || 0,
      tax_amount: Number(invoiceData.taxAmount) || 0,
      total_amount: Number(invoiceData.totalAmount) || 0,
      status: invoiceData.status || "pending",
      issue_date: invoiceData.issueDate,
      due_date: invoiceData.dueDate,
      notes: invoiceData.notes || "",
    }

    console.log("Inserting invoice data:", invoiceInsertData)

    // Insert invoice header with retry logic for unique constraint violations
    let invoiceHeader: any = null
    let insertAttempts = 0
    const maxInsertAttempts = 3

    while (insertAttempts < maxInsertAttempts) {
      insertAttempts++

      const { data, error: invoiceError } = await supabase.from("invoices").insert(invoiceInsertData).select().single()

      if (!invoiceError) {
        invoiceHeader = data
        break
      } else if (invoiceError.code === "23505" && invoiceError.message.includes("invoices_invoice_number_key")) {
        // Unique constraint violation, generate new invoice number
        console.warn(
          `Unique constraint violation for ${invoiceNumber}, generating new number (insert attempt ${insertAttempts})`,
        )

        if (insertAttempts >= maxInsertAttempts) {
          // Final attempt with timestamp-based number
          const timestamp = Date.now().toString()
          const random = Math.floor(Math.random() * 100000)
            .toString()
            .padStart(5, "0")
          invoiceInsertData.invoice_number = `INV-${timestamp.slice(-7)}${random}`
        } else {
          // Generate new invoice number and try again
          invoiceInsertData.invoice_number = await generateInvoiceNumber()
        }
        continue
      } else {
        console.error("Error creating invoice header:", invoiceError)
        throw new Error(`Failed to create invoice: ${invoiceError.message || "Unknown database error"}`)
      }
    }

    if (!invoiceHeader) {
      throw new Error("Failed to create invoice after multiple attempts")
    }

    console.log("Invoice header created:", invoiceHeader)

    // Prepare invoice items for insertion
    const invoiceItems = invoiceData.items.map((item, index) => ({
      invoice_id: invoiceHeader.id,
      product_id: Number(item.productId),
      product_name: item.productName || `Product ${index + 1}`,
      sku: item.sku || "",
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unitPrice) || 0,
      total_price: Number(item.totalPrice) || 0,
    }))

    console.log("Inserting invoice items:", invoiceItems)

    // Insert invoice items
    const { data: insertedItems, error: itemsError } = await supabase
      .from("invoice_items")
      .insert(invoiceItems)
      .select()

    if (itemsError) {
      console.error("Error creating invoice items:", itemsError)
      // Try to clean up the invoice header if items failed
      try {
        await supabase.from("invoices").delete().eq("id", invoiceHeader.id)
      } catch (cleanupError) {
        console.error("Failed to cleanup invoice header:", cleanupError)
      }
      throw new Error(`Failed to create invoice items: ${itemsError.message || "Unknown database error"}`)
    }

    console.log("Invoice items created:", insertedItems)

    // Log activity
    try {
      await logActivity("create", `Created invoice ${invoiceHeader.invoice_number} for ${invoiceData.customerName}`)
    } catch (logError) {
      console.warn("Failed to log activity:", logError)
      // Don't fail the entire operation for logging issues
    }

    // Return the complete invoice
    const completeInvoice: Invoice = {
      id: invoiceHeader.id,
      invoiceNumber: invoiceHeader.invoice_number,
      customerName: invoiceHeader.customer_name,
      customerEmail: invoiceHeader.customer_email,
      customerAddress: invoiceHeader.customer_address,
      customerPhone: invoiceHeader.customer_phone,
      items: invoiceData.items, // Use original items data
      subtotal: invoiceHeader.subtotal,
      taxRate: invoiceHeader.tax_rate,
      taxAmount: invoiceHeader.tax_amount,
      totalAmount: invoiceHeader.total_amount,
      status: invoiceHeader.status as InvoiceStatus,
      issueDate: invoiceHeader.issue_date,
      dueDate: invoiceHeader.due_date,
      notes: invoiceHeader.notes,
      createdAt: invoiceHeader.created_at,
      updatedAt: invoiceHeader.updated_at,
    }

    console.log("Invoice created successfully:", completeInvoice)
    return completeInvoice
  } catch (error) {
    console.error("Error in createInvoice:", error)

    // Provide more specific error messages
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error("An unexpected error occurred while creating the invoice")
    }
  }
}

// Get all invoices with better error handling
export async function getInvoices(): Promise<Invoice[]> {
  try {
    if (!supabase) {
      console.warn("Supabase client not available")
      return []
    }

    // Get invoices with their items
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select(`
        *,
        invoice_items (
          id,
          product_id,
          product_name,
          sku,
          quantity,
          unit_price,
          total_price
        )
      `)
      .order("created_at", { ascending: false })

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError)
      return []
    }

    // Transform the data to match our interface
    return (invoices || []).map((invoice: any) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
      customerEmail: invoice.customer_email,
      customerAddress: invoice.customer_address,
      customerPhone: invoice.customer_phone,
      items: (invoice.invoice_items || []).map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
      })),
      subtotal: invoice.subtotal,
      taxRate: invoice.tax_rate,
      taxAmount: invoice.tax_amount,
      totalAmount: invoice.total_amount,
      status: invoice.status as InvoiceStatus,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      notes: invoice.notes,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
    }))
  } catch (error) {
    console.error("Error in getInvoices:", error)
    return []
  }
}

// Get invoice by ID with better error handling
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    if (!supabase || !id) {
      return null
    }

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(`
        *,
        invoice_items (
          id,
          product_id,
          product_name,
          sku,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching invoice:", error)
      return null
    }

    if (!invoice) {
      return null
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
      customerEmail: invoice.customer_email,
      customerAddress: invoice.customer_address,
      customerPhone: invoice.customer_phone,
      items: (invoice.invoice_items || []).map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
      })),
      subtotal: invoice.subtotal,
      taxRate: invoice.tax_rate,
      taxAmount: invoice.tax_amount,
      totalAmount: invoice.total_amount,
      status: invoice.status as InvoiceStatus,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      notes: invoice.notes,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
    }
  } catch (error) {
    console.error("Error in getInvoiceById:", error)
    return null
  }
}

// Fulfill invoice with inventory deduction
export async function fulfillInvoiceWithInventoryDeduction(invoiceId: string): Promise<{
  success: boolean
  error?: string
  insufficientItems?: Array<{
    productName: string
    sku: string
    requested: number
    available: number
    unit: string
  }>
  invoice?: Invoice
}> {
  try {
    const invoice = await getInvoiceById(invoiceId)
    if (!invoice) {
      return { success: false, error: "Invoice not found" }
    }

    if (invoice.status === "fulfilled") {
      return { success: false, error: "Invoice is already fulfilled" }
    }

    // Check inventory availability
    const currentInventory = await getInventoryItems()
    const insufficientItems: Array<{
      productName: string
      sku: string
      requested: number
      available: number
      unit: string
    }> = []

    for (const item of invoice.items) {
      const inventoryItem = currentInventory.find((inv) => inv.id === item.productId)
      if (!inventoryItem) {
        insufficientItems.push({
          productName: item.productName,
          sku: item.sku,
          requested: item.quantity,
          available: 0,
          unit: "dz",
        })
        continue
      }

      if (inventoryItem.stock < item.quantity) {
        insufficientItems.push({
          productName: item.productName,
          sku: item.sku,
          requested: item.quantity,
          available: inventoryItem.stock,
          unit: "dz",
        })
      }
    }

    if (insufficientItems.length > 0) {
      return {
        success: false,
        error: "Insufficient stock for one or more products",
        insufficientItems,
      }
    }

    // Deduct inventory
    for (const item of invoice.items) {
      const inventoryItem = currentInventory.find((inv) => inv.id === item.productId)
      if (inventoryItem) {
        const newStock = inventoryItem.stock - item.quantity
        await updateInventoryItem(item.productId, { stock: newStock })

        // Log inventory deduction
        try {
          await logActivity(
            "inventory_deduction",
            `Deducted ${item.quantity} dz of ${item.productName} for invoice ${invoice.invoiceNumber}`,
          )
        } catch (logError) {
          console.warn("Failed to log inventory deduction:", logError)
        }
      }
    }

    // Update invoice status
    const updatedInvoice = await updateInvoiceStatus(invoiceId, "fulfilled")
    if (!updatedInvoice) {
      return { success: false, error: "Failed to update invoice status" }
    }

    return { success: true, invoice: updatedInvoice }
  } catch (error) {
    console.error("Error fulfilling invoice:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Update invoice status
export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice | null> {
  try {
    if (!supabase) {
      return null
    }

    const invoice = await getInvoiceById(id)
    if (!invoice) return null

    const previousStatus = invoice.status

    // If changing from fulfilled back to pending/cancelled, restore inventory
    if (previousStatus === "fulfilled" && (status === "pending" || status === "cancelled")) {
      await restoreInventoryForInvoice(invoice)
    }

    // Update the invoice status
    const { data, error } = await supabase.from("invoices").update({ status }).eq("id", id).select().single()

    if (error) {
      console.error("Error updating invoice status:", error)
      return null
    }

    // Log activity
    try {
      await logActivity("update", `Invoice ${invoice.invoiceNumber} status changed from ${previousStatus} to ${status}`)
    } catch (logError) {
      console.warn("Failed to log status change:", logError)
    }

    // Return updated invoice
    return await getInvoiceById(id)
  } catch (error) {
    console.error("Error in updateInvoiceStatus:", error)
    return null
  }
}

// Restore inventory when invoice is changed from fulfilled to pending/cancelled
async function restoreInventoryForInvoice(invoice: Invoice): Promise<void> {
  try {
    console.log(`Restoring inventory for invoice ${invoice.invoiceNumber}`)

    // Restore inventory for each item
    for (const item of invoice.items) {
      const currentInventory = await getInventoryItems()
      const inventoryItem = currentInventory.find((inv) => inv.id === item.productId)

      if (inventoryItem) {
        const newStock = inventoryItem.stock + item.quantity

        await updateInventoryItem(item.productId, {
          stock: newStock,
        })

        console.log(`Restored ${item.quantity} units of ${item.productName}. New stock: ${newStock}`)

        // Log individual inventory restoration
        try {
          await logActivity(
            "inventory_restoration",
            `Restored ${item.quantity} units of ${item.productName} from invoice ${invoice.invoiceNumber}`,
          )
        } catch (logError) {
          console.warn("Failed to log inventory restoration:", logError)
        }
      }
    }
  } catch (error) {
    console.error("Error restoring inventory:", error)
  }
}

// Delete invoice
export async function deleteInvoice(id: string): Promise<boolean> {
  try {
    if (!supabase) {
      return false
    }

    const invoice = await getInvoiceById(id)
    if (!invoice) return false

    // If invoice was fulfilled, restore inventory before deletion
    if (invoice.status === "fulfilled") {
      await restoreInventoryForInvoice(invoice)
    }

    // Delete invoice (items will be deleted automatically due to CASCADE)
    const { error } = await supabase.from("invoices").delete().eq("id", id)

    if (error) {
      console.error("Error deleting invoice:", error)
      return false
    }

    // Log activity
    try {
      await logActivity("delete", `Deleted invoice ${invoice.invoiceNumber}`)
    } catch (logError) {
      console.warn("Failed to log deletion:", logError)
    }

    return true
  } catch (error) {
    console.error("Error in deleteInvoice:", error)
    return false
  }
}

// Calculate invoice totals
export function calculateInvoiceTotals(items: InvoiceItem[], taxRate = 0) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)
  const taxAmount = subtotal * (taxRate / 100)
  const totalAmount = subtotal + taxAmount

  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
  }
}

// Get invoice statistics
export async function getInvoiceStats() {
  try {
    const allInvoices = await getInvoices()

    const stats = {
      total: allInvoices.length,
      pending: allInvoices.filter((inv) => inv.status === "pending").length,
      fulfilled: allInvoices.filter((inv) => inv.status === "fulfilled").length,
      cancelled: allInvoices.filter((inv) => inv.status === "cancelled").length,
      totalValue: allInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0),
      fulfilledValue: allInvoices
        .filter((inv) => inv.status === "fulfilled")
        .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0),
    }

    return stats
  } catch (error) {
    console.error("Error getting invoice stats:", error)
    return {
      total: 0,
      pending: 0,
      fulfilled: 0,
      cancelled: 0,
      totalValue: 0,
      fulfilledValue: 0,
    }
  }
}
