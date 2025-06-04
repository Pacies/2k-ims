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

// Generate a new invoice number
export async function generateInvoiceNumber(): Promise<string> {
  try {
    // Get the next invoice number from settings
    const { data: settings, error: settingsError } = await supabase!
      .from("invoice_settings")
      .select("next_invoice_number")
      .single()

    if (settingsError) {
      console.error("Error getting invoice settings:", settingsError)
      // Fallback: get the highest existing invoice number and increment
      const { data: invoices } = await supabase!
        .from("invoices")
        .select("invoice_number")
        .order("invoice_number", { ascending: false })
        .limit(1)

      let nextNumber = 1001
      if (invoices && invoices.length > 0) {
        const lastNumber = Number.parseInt(invoices[0].invoice_number.replace("INV-", ""))
        nextNumber = lastNumber + 1
      }
      return `INV-${nextNumber.toString().padStart(4, "0")}`
    }

    const invoiceNumber = `INV-${settings.next_invoice_number.toString().padStart(4, "0")}`

    // Update the counter
    await supabase!
      .from("invoice_settings")
      .update({ next_invoice_number: settings.next_invoice_number + 1 })
      .eq("id", 1)

    return invoiceNumber
  } catch (error) {
    console.error("Error generating invoice number:", error)
    // Fallback to timestamp-based number
    return `INV-${Date.now().toString().slice(-4)}`
  }
}

// Create a new invoice
export async function createInvoice(
  invoiceData: Omit<Invoice, "id" | "invoiceNumber" | "createdAt" | "updatedAt">,
): Promise<Invoice> {
  try {
    const invoiceNumber = await generateInvoiceNumber()

    // Insert invoice header
    const { data: invoiceHeader, error: invoiceError } = await supabase!
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        customer_name: invoiceData.customerName,
        subtotal: invoiceData.subtotal,
        tax_rate: invoiceData.taxRate,
        tax_amount: invoiceData.taxAmount,
        total_amount: invoiceData.totalAmount,
        status: invoiceData.status,
        issue_date: invoiceData.issueDate,
        due_date: invoiceData.dueDate,
        notes: invoiceData.notes,
      })
      .select()
      .single()

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError)
      throw new Error("Failed to create invoice")
    }

    // Insert invoice items
    const invoiceItems = invoiceData.items.map((item) => ({
      invoice_id: invoiceHeader.id,
      product_id: item.productId,
      product_name: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
    }))

    const { error: itemsError } = await supabase!.from("invoice_items").insert(invoiceItems)

    if (itemsError) {
      console.error("Error creating invoice items:", itemsError)
      // Clean up the invoice header if items failed
      await supabase!.from("invoices").delete().eq("id", invoiceHeader.id)
      throw new Error("Failed to create invoice items")
    }

    // Log activity
    await logActivity("create", `Created invoice ${invoiceNumber} for ${invoiceData.customerName}`)

    // Return the complete invoice
    return {
      id: invoiceHeader.id,
      invoiceNumber: invoiceHeader.invoice_number,
      customerName: invoiceHeader.customer_name,
      items: invoiceData.items,
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
  } catch (error) {
    console.error("Error in createInvoice:", error)
    throw error
  }
}

// Get all invoices
export async function getInvoices(): Promise<Invoice[]> {
  try {
    // Get invoices with their items
    const { data: invoices, error: invoicesError } = await supabase!
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

// Get invoice by ID
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const { data: invoice, error } = await supabase!
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

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
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
        await logActivity(
          "inventory_deduction",
          `Deducted ${item.quantity} dz of ${item.productName} for invoice ${invoice.invoiceNumber}`,
        )
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
    const invoice = await getInvoiceById(id)
    if (!invoice) return null

    const previousStatus = invoice.status

    // If changing from fulfilled back to pending/cancelled, restore inventory
    if (previousStatus === "fulfilled" && (status === "pending" || status === "cancelled")) {
      await restoreInventoryForInvoice(invoice)
    }

    // Update the invoice status
    const { data, error } = await supabase!.from("invoices").update({ status }).eq("id", id).select().single()

    if (error) {
      console.error("Error updating invoice status:", error)
      return null
    }

    // Log activity
    await logActivity("update", `Invoice ${invoice.invoiceNumber} status changed from ${previousStatus} to ${status}`)

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
        await logActivity(
          "inventory_restoration",
          `Restored ${item.quantity} units of ${item.productName} from invoice ${invoice.invoiceNumber}`,
        )
      }
    }
  } catch (error) {
    console.error("Error restoring inventory:", error)
  }
}

// Delete invoice
export async function deleteInvoice(id: string): Promise<boolean> {
  try {
    const invoice = await getInvoiceById(id)
    if (!invoice) return false

    // If invoice was fulfilled, restore inventory before deletion
    if (invoice.status === "fulfilled") {
      await restoreInventoryForInvoice(invoice)
    }

    // Delete invoice (items will be deleted automatically due to CASCADE)
    const { error } = await supabase!.from("invoices").delete().eq("id", id)

    if (error) {
      console.error("Error deleting invoice:", error)
      return false
    }

    // Log activity
    await logActivity("delete", `Deleted invoice ${invoice.invoiceNumber}`)

    return true
  } catch (error) {
    console.error("Error in deleteInvoice:", error)
    return false
  }
}

// Calculate invoice totals
export function calculateInvoiceTotals(items: InvoiceItem[], taxRate = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const totalAmount = subtotal + taxAmount

  return {
    subtotal,
    taxAmount,
    totalAmount,
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
      totalValue: allInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      fulfilledValue: allInvoices
        .filter((inv) => inv.status === "fulfilled")
        .reduce((sum, inv) => sum + inv.totalAmount, 0),
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
