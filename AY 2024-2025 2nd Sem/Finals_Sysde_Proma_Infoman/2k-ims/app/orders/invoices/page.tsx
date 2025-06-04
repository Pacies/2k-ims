"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Search,
  RefreshCw,
  Eye,
  Check,
  X,
  MoreHorizontal,
  Trash2,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  Download,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import PageHeader from "@/components/page-header"
import MainLayout from "@/components/main-layout"
import { useRouter } from "next/navigation"
import {
  getInvoices,
  updateInvoiceStatus,
  deleteInvoice,
  fulfillInvoiceWithInventoryDeduction,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/invoice-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: "fulfill" | "cancel" | "delete" | "revert"
    invoice: Invoice
  } | null>(null)
  const [insufficientItems, setInsufficientItems] = useState<
    Array<{
      productName: string
      sku: string
      requested: number
      available: number
      unit: string
    }>
  >([])
  const [showStockAlert, setShowStockAlert] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    fulfilled: 0,
    cancelled: 0,
    totalAmount: 0,
    pendingAmount: 0,
    fulfilledAmount: 0,
  })

  const loadInvoices = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getInvoices()
      setInvoices(data)
      console.log("Loaded invoices:", data)

      // Calculate statistics
      const total = data.length
      const pending = data.filter((invoice) => invoice.status === "pending").length
      const fulfilled = data.filter((invoice) => invoice.status === "fulfilled").length
      const cancelled = data.filter((invoice) => invoice.status === "cancelled").length
      const totalAmount = data.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
      const pendingAmount = data
        .filter((invoice) => invoice.status === "pending")
        .reduce((sum, invoice) => sum + invoice.totalAmount, 0)
      const fulfilledAmount = data
        .filter((invoice) => invoice.status === "fulfilled")
        .reduce((sum, invoice) => sum + invoice.totalAmount, 0)

      setStats({
        total,
        pending,
        fulfilled,
        cancelled,
        totalAmount,
        pendingAmount,
        fulfilledAmount,
      })
    } catch (error) {
      console.error("Error loading invoices:", error)
      toast({
        title: "Error",
        description: "Failed to load invoices. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  useEffect(() => {
    let filtered = invoices

    if (searchTerm) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((invoice) => invoice.status === statusFilter)
    }

    // Sort by creation date (newest first)
    filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setFilteredInvoices(filtered)
  }, [invoices, searchTerm, statusFilter])

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        )
      case "fulfilled":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Fulfilled
          </Badge>
        )
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleStatusChange = async (invoice: Invoice, newStatus: InvoiceStatus) => {
    console.log(`Attempting to change invoice ${invoice.invoiceNumber} from ${invoice.status} to ${newStatus}`)

    try {
      if (newStatus === "fulfilled" && invoice.status !== "fulfilled") {
        // Use the special fulfill function that handles inventory deduction
        const result = await fulfillInvoiceWithInventoryDeduction(invoice.id)
        if (result.success) {
          toast({
            title: "Invoice Fulfilled",
            description: `Invoice ${invoice.invoiceNumber} has been fulfilled and inventory has been updated.`,
          })
          await loadInvoices() // Reload to get updated data
        } else {
          // Check if we have insufficient items data
          if (result.insufficientItems && result.insufficientItems.length > 0) {
            setInsufficientItems(result.insufficientItems)
            setShowStockAlert(true)
          } else {
            toast({
              title: "Cannot Fulfill Invoice",
              description: result.error || "Insufficient inventory to fulfill this invoice.",
              variant: "destructive",
            })
          }
        }
      } else {
        // Regular status update
        const updatedInvoice = await updateInvoiceStatus(invoice.id, newStatus)
        if (updatedInvoice) {
          toast({
            title: "Status Updated",
            description: `Invoice ${invoice.invoiceNumber} status changed to ${newStatus}.`,
          })
          await loadInvoices() // Reload to get updated data
        } else {
          toast({
            title: "Error",
            description: "Failed to update invoice status.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error updating invoice status:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the invoice.",
        variant: "destructive",
      })
    }

    setShowConfirmDialog(false)
    setConfirmAction(null)
  }

  const handleDeleteInvoice = async (invoice: Invoice) => {
    console.log(`Attempting to delete invoice ${invoice.invoiceNumber}`)

    try {
      const success = await deleteInvoice(invoice.id)
      if (success) {
        toast({
          title: "Invoice Deleted",
          description: `Invoice ${invoice.invoiceNumber} has been removed.`,
        })
        await loadInvoices() // Reload to get updated data
      } else {
        toast({
          title: "Error",
          description: "Failed to delete invoice.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting invoice:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the invoice.",
        variant: "destructive",
      })
    }

    setShowConfirmDialog(false)
    setConfirmAction(null)
  }

  const openConfirmDialog = (type: "fulfill" | "cancel" | "delete" | "revert", invoice: Invoice) => {
    console.log(`Opening confirm dialog for ${type} action on invoice ${invoice.invoiceNumber}`)
    setConfirmAction({ type, invoice })
    setShowConfirmDialog(true)
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return

    const { type, invoice } = confirmAction

    switch (type) {
      case "fulfill":
        handleStatusChange(invoice, "fulfilled")
        break
      case "cancel":
        handleStatusChange(invoice, "cancelled")
        break
      case "revert":
        handleStatusChange(invoice, "pending")
        break
      case "delete":
        handleDeleteInvoice(invoice)
        break
    }
  }

  const getConfirmDialogContent = () => {
    if (!confirmAction) return { title: "", description: "" }

    const { type, invoice } = confirmAction

    switch (type) {
      case "fulfill":
        return {
          title: "Fulfill Invoice",
          description: `Are you sure you want to mark invoice ${invoice.invoiceNumber} as fulfilled? This will deduct the products from inventory.`,
        }
      case "cancel":
        return {
          title: "Cancel Invoice",
          description: `Are you sure you want to cancel invoice ${invoice.invoiceNumber}?`,
        }
      case "revert":
        return {
          title: "Revert to Pending",
          description: `Are you sure you want to revert invoice ${invoice.invoiceNumber} back to pending? This will restore inventory if it was previously fulfilled.`,
        }
      case "delete":
        return {
          title: "Delete Invoice",
          description: `Are you sure you want to permanently delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`,
        }
      default:
        return { title: "", description: "" }
    }
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleExportPDF = (invoice: Invoice) => {
    // Create a printable version of the invoice
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.4;
            color: #374151;
            background: white;
            padding: 15px;
            font-size: 11px;
          }
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e5e7eb; 
            padding-bottom: 15px; 
            margin-bottom: 20px;
          }
          .logo-section {
            display: flex;
            align-items: center;
          }
          .logo {
            width: 35px;
            height: 35px;
            background: #3b82f6;
            color: white;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            margin-right: 12px;
          }
          .company-info h1 {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
            margin: 0;
          }
          .company-info p {
            color: #6b7280;
            margin: 0;
            font-size: 10px;
          }
          .invoice-details {
            text-align: right;
          }
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 8px;
          }
          .invoice-info {
            font-size: 10px;
            color: #6b7280;
            line-height: 1.3;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 500;
            margin-top: 4px;
          }
          .badge-green { background: #dcfce7; color: #166534; }
          .badge-orange { background: #fed7aa; color: #9a3412; }
          .badge-red { background: #fecaca; color: #991b1b; }
          .customer-section {
            margin-bottom: 20px;
          }
          .customer-title {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 6px;
            color: #111827;
          }
          .customer-info {
            font-size: 10px;
            color: #6b7280;
            line-height: 1.4;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 10px;
          }
          .items-table th,
          .items-table td {
            border: 1px solid #e5e7eb;
            padding: 6px;
            text-align: left;
          }
          .items-table th {
            background: #f3f4f6;
            font-weight: 600;
            color: #374151;
            font-size: 9px;
          }
          .items-table tr:nth-child(even) {
            background: #f9fafb;
          }
          .text-right { text-align: right; }
          .summary-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 15px;
          }
          .summary-table {
            width: 250px;
            font-size: 10px;
          }
          .summary-table td {
            padding: 4px 8px;
            border: none;
          }
          .summary-table .total-row {
            border-top: 2px solid #374151;
            font-weight: bold;
            font-size: 12px;
          }
          .notes-section {
            margin-bottom: 15px;
          }
          .notes-title {
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 4px;
            color: #111827;
          }
          .notes-content {
            font-size: 9px;
            color: #6b7280;
            background: #f9fafb;
            padding: 8px;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            font-size: 9px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
          }
          @media print {
            body { margin: 0; padding: 10px; font-size: 10px; }
            .header { margin-bottom: 15px; padding-bottom: 10px; }
            .customer-section { margin-bottom: 15px; }
            .items-table { margin-bottom: 15px; font-size: 9px; }
            .items-table th, .items-table td { padding: 4px; }
            .summary-section { margin-bottom: 10px; }
            .footer { padding-top: 8px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <div class="logo">2K</div>
            <div class="company-info">
              <h1>INVOICE</h1>
              <p>2K Inventory Management</p>
            </div>
          </div>
          <div class="invoice-details">
            <h1 class="invoice-title">Invoice</h1>
            <div class="invoice-info">
              <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Date:</strong> ${formatDate(invoice.issueDate)}</p>
              <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
              <span class="badge ${
                invoice.status === "fulfilled"
                  ? "badge-green"
                  : invoice.status === "cancelled"
                    ? "badge-red"
                    : "badge-orange"
              }">${invoice.status.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div class="customer-section">
          <h2 class="customer-title">Bill To:</h2>
          <div class="customer-info">
            <p><strong>Customer:</strong> ${invoice.customerName}</p>
            ${invoice.customerEmail ? `<p><strong>Email:</strong> ${invoice.customerEmail}</p>` : ""}
            ${invoice.customerAddress ? `<p><strong>Address:</strong> ${invoice.customerAddress}</p>` : ""}
            ${invoice.customerPhone ? `<p><strong>Phone:</strong> ${invoice.customerPhone}</p>` : ""}
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
              .map(
                (item) => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.sku}</td>
                <td>${item.quantity} dz</td>
                <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                <td class="text-right">${formatCurrency(item.totalPrice)}</td>
              </tr>
            `,
              )
              .join("")}
            ${Array.from({ length: Math.max(0, 3 - invoice.items.length) })
              .map(
                (_, index) => `
              <tr key="empty-${index}">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="summary-section">
          <table class="summary-table">
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">${formatCurrency(invoice.subtotal)}</td>
            </tr>
            <tr>
              <td>Tax (${(invoice.taxRate * 100).toFixed(0)}%):</td>
              <td class="text-right">${formatCurrency(invoice.taxAmount)}</td>
            </tr>
            <tr class="total-row">
              <td>Total:</td>
              <td class="text-right">${formatCurrency(invoice.totalAmount)}</td>
            </tr>
          </table>
        </div>

        ${
          invoice.notes
            ? `
        <div class="notes-section">
          <h2 class="notes-title">Notes</h2>
          <div class="notes-content">
            ${invoice.notes}
          </div>
        </div>
        `
            : ""
        }

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>This invoice was generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `

      printWindow.document.write(htmlContent)
      printWindow.document.close()

      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print()
        printWindow.close()
      }
    }

    toast({
      title: "PDF Export",
      description: `Invoice ${invoice.invoiceNumber} is being exported as PDF...`,
    })
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Invoices">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/orders")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <span className="text-muted-foreground text-base">Manage and track your invoices</span>
          </div>
        </PageHeader>

        {/* Insufficient Stock Alert */}
        {showStockAlert && insufficientItems.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cannot Fulfill Invoice - Insufficient Stock</AlertTitle>
            <AlertDescription>
              <p className="mb-2">The following products don't have enough stock to fulfill this invoice:</p>
              <ul className="list-disc pl-5 space-y-1">
                {insufficientItems.map((item, index) => (
                  <li key={index}>
                    <strong>{item.productName}</strong> ({item.sku}): Requested {item.requested} {item.unit}, but only{" "}
                    {item.available} {item.unit} available
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowStockAlert(false)}>
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalAmount)} total value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(stats.pendingAmount)} pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fulfilled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.fulfilled}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(stats.fulfilledAmount)} completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
              <p className="text-xs text-muted-foreground">Cancelled orders</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invoice Management</CardTitle>
                <CardDescription>Track and manage all your invoices</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={loadInvoices} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Invoices Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {invoices.length === 0
                          ? "No invoices found. Create your first invoice to get started."
                          : "No invoices match your search criteria."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>{invoice.items.length} items</TableCell>
                        <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Quick Action Buttons */}
                            {invoice.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => openConfirmDialog("fulfill", invoice)}
                                  title="Mark as Fulfilled"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => openConfirmDialog("cancel", invoice)}
                                  title="Cancel Invoice"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            {(invoice.status === "fulfilled" || invoice.status === "cancelled") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => openConfirmDialog("revert", invoice)}
                                title="Revert to Pending"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}

                            {/* More Actions Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedInvoice(invoice)
                                    setShowDetailsModal(true)
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openConfirmDialog("delete", invoice)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Invoice
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </p>
              <p>Total value: {formatCurrency(stats.totalAmount)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Invoice Information</h3>
                    <p>
                      <strong>Invoice #:</strong> {selectedInvoice.invoiceNumber}
                    </p>
                    <p>
                      <strong>Customer:</strong> {selectedInvoice.customerName}
                    </p>
                    <p>
                      <strong>Date:</strong> {formatDate(selectedInvoice.issueDate)}
                    </p>
                    <p>
                      <strong>Delivery Date:</strong> {formatDate(selectedInvoice.dueDate)}
                    </p>
                    <div className="flex items-center gap-2">
                      <strong>Status:</strong> {getStatusBadge(selectedInvoice.status)}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">Summary</h3>
                    <p>
                      <strong>Subtotal:</strong> {formatCurrency(selectedInvoice.subtotal)}
                    </p>
                    <p>
                      <strong>Tax:</strong> {formatCurrency(selectedInvoice.taxAmount)}
                    </p>
                    <p>
                      <strong>Total:</strong> {formatCurrency(selectedInvoice.totalAmount)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.quantity} dz</TableCell>
                          <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell>{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Export PDF Button at bottom right */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={() => handleExportPDF(selectedInvoice)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                {getConfirmDialogContent().title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>{getConfirmDialogContent().description}</p>

              {confirmAction?.type === "fulfill" && confirmAction.invoice && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm font-medium mb-2">Items to be deducted from inventory:</p>
                  <ul className="text-sm space-y-1">
                    {confirmAction.invoice.items.map((item, index) => (
                      <li key={index}>
                        • {item.productName} ({item.sku}): {item.quantity} dz
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  variant={confirmAction?.type === "delete" ? "destructive" : "default"}
                >
                  {confirmAction?.type === "fulfill" && "Fulfill Invoice"}
                  {confirmAction?.type === "cancel" && "Cancel Invoice"}
                  {confirmAction?.type === "revert" && "Revert to Pending"}
                  {confirmAction?.type === "delete" && "Delete Invoice"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
