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
  customerEmail: string
  customerAddress: string
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

// In-memory storage for invoices (replace with database later)
const invoices: Invoice[] = []
let nextInvoiceNumber = 1001

// Generate a new invoice number
export function generateInvoiceNumber(): string {
  const invoiceNumber = `INV-${nextInvoiceNumber.toString().padStart(4, "0")}`
  nextInvoiceNumber++
  return invoiceNumber
}

// Create a new invoice
export async function createInvoice(
  invoiceData: Omit<Invoice, "id" | "invoiceNumber" | "createdAt" | "updatedAt">,
): Promise<Invoice> {
  const now = new Date().toISOString()
  const newInvoice: Invoice = {
    ...invoiceData,
    id: `invoice-${Date.now()}`,
    invoiceNumber: generateInvoiceNumber(),
    createdAt: now,
    updatedAt: now,
  }

  invoices.push(newInvoice)

  // Log activity
  await logActivity("create", `Created invoice ${newInvoice.invoiceNumber} for ${newInvoice.customerName}`)

  return newInvoice
}

// Get all invoices
export async function getInvoices(): Promise<Invoice[]> {
  return [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// Get invoice by ID
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  return invoices.find((invoice) => invoice.id === id) || null
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
  const invoiceIndex = invoices.findIndex((invoice) => invoice.id === id)
  if (invoiceIndex === -1) return null

  const invoice = invoices[invoiceIndex]
  const previousStatus = invoice.status

  // If changing from fulfilled back to pending/cancelled, restore inventory
  if (previousStatus === "fulfilled" && (status === "pending" || status === "cancelled")) {
    await restoreInventoryForInvoice(invoice)
  }

  // Update the invoice status
  invoices[invoiceIndex] = {
    ...invoices[invoiceIndex],
    status,
    updatedAt: new Date().toISOString(),
  }

  // Log activity
  await logActivity("update", `Invoice ${invoice.invoiceNumber} status changed from ${previousStatus} to ${status}`)

  return invoices[invoiceIndex]
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
  const invoiceIndex = invoices.findIndex((invoice) => invoice.id === id)
  if (invoiceIndex === -1) return false

  const invoice = invoices[invoiceIndex]

  // If invoice was fulfilled, restore inventory before deletion
  if (invoice.status === "fulfilled") {
    await restoreInventoryForInvoice(invoice)
  }

  invoices.splice(invoiceIndex, 1)

  // Log activity
  await logActivity("delete", `Deleted invoice ${invoice.invoiceNumber}`)

  return true
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
}
