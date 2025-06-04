"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
  AlertDialogContent,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Download, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import MainLayout from "@/components/main-layout"
import EditPurchaseOrderModal from "@/components/edit-purchase-order-modal"
import { getPurchaseOrderById, deletePurchaseOrder, type PurchaseOrder } from "@/lib/purchase-orders-utils"
import { addActivity } from "@/lib/activity-store"
import { jsPDF } from "jspdf"

async function generatePurchaseOrderPDF(purchaseOrder: PurchaseOrder): Promise<Blob> {
  try {
    const doc = new jsPDF()

    // Set up document
    doc.setFont("helvetica")
    doc.setDrawColor(0, 0, 0)

    // Add header with optimized spacing
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("2K INVENTORY MANAGEMENT SYSTEM", 105, 20, { align: "center" })

    doc.setFontSize(14)
    doc.text("PURCHASE ORDER", 105, 30, { align: "center" })

    // Add PO info section with reduced spacing
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`PO Number: ${purchaseOrder.po_number}`, 20, 45)
    doc.text(`Supplier: ${purchaseOrder.supplier}`, 20, 52)
    doc.text(`Order Date: ${new Date(purchaseOrder.order_date).toLocaleDateString()}`, 20, 59)
    doc.text(`Status: ${purchaseOrder.status.toUpperCase()}`, 20, 66)
    doc.text(`Created by: ${purchaseOrder.created_by || "System"}`, 120, 45)
    doc.text(`Created: ${new Date(purchaseOrder.created_at).toLocaleDateString()}`, 120, 52)

    if (purchaseOrder.expected_delivery_date) {
      doc.text(`Expected Delivery: ${new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()}`, 120, 59)
    }

    // Add horizontal line with reduced spacing
    doc.setLineWidth(0.5)
    doc.line(20, 75, 190, 75)

    let yPosition = 85

    // Items table with FIXED TEXT POSITIONING
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Order Items", 20, yPosition)
    yPosition += 10

    const headers = ["Material Name", "Quantity", "Unit Price", "Total Price"]
    const widths = [60, 30, 40, 40]
    const tableWidth = widths.reduce((sum, width) => sum + width, 0)
    const tableStartX = 20
    const rowHeight = 8

    // Calculate table dimensions
    const tableStartY = yPosition + 4

    // DRAW TOP BORDER FIRST
    doc.line(tableStartX, tableStartY, tableStartX + tableWidth, tableStartY)

    // Draw table headers with proper positioning
    let xPosition = tableStartX
    doc.setFontSize(10)
    for (let i = 0; i < headers.length; i++) {
      // Center text horizontally and vertically within cell
      const textWidth = (doc.getStringUnitWidth(headers[i]) * doc.getFontSize()) / doc.internal.scaleFactor
      const textX = xPosition + (widths[i] - textWidth) / 2
      doc.text(headers[i], textX, tableStartY + 4) // Position text 4 units below the top border
      xPosition += widths[i]
    }

    // Draw header bottom line
    const headerBottomY = tableStartY + rowHeight
    doc.line(tableStartX, headerBottomY, tableStartX + tableWidth, headerBottomY)

    // Add items data with FIXED POSITIONING
    doc.setFont("helvetica", "normal")
    let currentY = headerBottomY

    for (let i = 0; i < purchaseOrder.items.length; i++) {
      const item = purchaseOrder.items[i]
      currentY += rowHeight

      if (currentY > 270) {
        doc.addPage()
        currentY = 20
      }

      xPosition = tableStartX

      // Material Name - left aligned with padding
      doc.text(item.material_name.substring(0, 25), xPosition + 2, currentY - rowHeight / 2 + 2)
      xPosition += widths[0]

      // Quantity - centered
      const qtyText = item.quantity.toString()
      const qtyWidth = (doc.getStringUnitWidth(qtyText) * doc.getFontSize()) / doc.internal.scaleFactor
      doc.text(qtyText, xPosition + (widths[1] - qtyWidth) / 2, currentY - rowHeight / 2 + 2)
      xPosition += widths[1]

      // Unit Price - right aligned with padding
      const priceText = `PHP ${item.unit_price.toFixed(2)}`
      const priceWidth = (doc.getStringUnitWidth(priceText) * doc.getFontSize()) / doc.internal.scaleFactor
      doc.text(priceText, xPosition + widths[2] - priceWidth - 2, currentY - rowHeight / 2 + 2)
      xPosition += widths[2]

      // Total Price - right aligned with padding
      const totalText = `PHP ${item.total_price.toFixed(2)}`
      const totalWidth = (doc.getStringUnitWidth(totalText) * doc.getFontSize()) / doc.internal.scaleFactor
      doc.text(totalText, xPosition + widths[3] - totalWidth - 2, currentY - rowHeight / 2 + 2)

      // Draw horizontal line after each row
      doc.line(tableStartX, currentY, tableStartX + tableWidth, currentY)
    }

    // Draw ALL vertical lines for complete grid
    xPosition = tableStartX
    for (let i = 0; i <= headers.length; i++) {
      doc.line(xPosition, tableStartY, xPosition, currentY)
      if (i < headers.length) {
        xPosition += widths[i]
      }
    }

    yPosition = currentY + 15

    // Payment summary section
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("Payment Summary", 20, yPosition)
    yPosition += 10

    // Payment summary table
    const summaryStartY = yPosition
    const summaryWidth = 80
    const summaryStartX = 110
    const summaryRowHeight = 6

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)

    // Summary items
    const summaryItems = [
      { label: "Subtotal:", value: `PHP ${purchaseOrder.subtotal.toFixed(2)}` },
      {
        label: `Tax (${(purchaseOrder.tax_rate * 100).toFixed(0)}%):`,
        value: `PHP ${purchaseOrder.tax_amount.toFixed(2)}`,
      },
      { label: "Shipping:", value: `PHP ${purchaseOrder.shipping_cost.toFixed(2)}` },
    ]

    if (purchaseOrder.discount_amount > 0) {
      summaryItems.push({
        label: "Discount:",
        value: `-PHP ${purchaseOrder.discount_amount.toFixed(2)}`,
      })
    }

    let summaryY = summaryStartY
    for (const item of summaryItems) {
      doc.text(item.label, summaryStartX, summaryY)
      const valueWidth = (doc.getStringUnitWidth(item.value) * doc.getFontSize()) / doc.internal.scaleFactor
      doc.text(item.value, summaryStartX + summaryWidth - valueWidth, summaryY)
      summaryY += summaryRowHeight
    }

    // Total line
    summaryY += 3
    doc.line(summaryStartX, summaryY, summaryStartX + summaryWidth, summaryY)
    summaryY += 6

    doc.setFont("helvetica", "bold")
    doc.text("TOTAL:", summaryStartX, summaryY)
    const totalValue = `PHP ${purchaseOrder.total_amount.toFixed(2)}`
    const totalWidth = (doc.getStringUnitWidth(totalValue) * doc.getFontSize()) / doc.internal.scaleFactor
    doc.text(totalValue, summaryStartX + summaryWidth - totalWidth, summaryY)

    // Add notes section if available
    if (purchaseOrder.notes && purchaseOrder.notes.trim()) {
      yPosition = summaryY + 20
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("Notes:", 20, yPosition)
      yPosition += 8

      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)

      // Split notes into lines that fit within the page width
      const noteLines = doc.splitTextToSize(purchaseOrder.notes, 170)
      for (const line of noteLines) {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 20
        }
        doc.text(line, 20, yPosition)
        yPosition += 5
      }
    }

    // Add footer
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text("Generated by 2K Inventory Management System", 105, 285, { align: "center" })
    doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, 290, {
      align: "center",
    })

    return new Blob([doc.output("blob")], { type: "application/pdf" })
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw error
  }
}

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const orderId = params.id as string

  useEffect(() => {
    const loadPurchaseOrder = async () => {
      if (!orderId) return

      setIsLoading(true)
      try {
        const order = await getPurchaseOrderById(Number.parseInt(orderId))
        setPurchaseOrder(order)
      } catch (error) {
        console.error("Error loading purchase order:", error)
        toast({
          title: "Error",
          description: "Failed to load purchase order. Please try again.",
          variant: "destructive",
        })
        router.push("/orders/purchase-orders")
      } finally {
        setIsLoading(false)
      }
    }

    loadPurchaseOrder()
  }, [orderId, router, toast])

  const handleDelete = async () => {
    if (!purchaseOrder?.id) return

    const success = await deletePurchaseOrder(purchaseOrder.id)
    if (success) {
      toast({
        title: "Purchase order deleted",
        description: "The purchase order has been removed successfully.",
      })
      router.push("/orders/purchase-orders")
    } else {
      toast({
        title: "Error",
        description: "Failed to delete purchase order. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleOrderUpdated = async (updatedOrder: PurchaseOrder) => {
    setPurchaseOrder(updatedOrder)
    setEditingOrder(null)
  }

  const handleExportPDF = async () => {
    if (!purchaseOrder) return

    setIsExporting(true)
    try {
      toast({
        title: "Generating PDF",
        description: `Purchase order ${purchaseOrder.po_number} is being exported...`,
      })

      const pdfBlob = await generatePurchaseOrderPDF(purchaseOrder)

      // Create download link
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `PO-${purchaseOrder.po_number}-${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      addActivity(`Exported purchase order ${purchaseOrder.po_number} as PDF`)

      toast({
        title: "PDF Downloaded",
        description: `Purchase order ${purchaseOrder.po_number} has been downloaded successfully.`,
      })
    } catch (error) {
      console.error("Error exporting PDF:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Approved
          </Badge>
        )
      case "sent":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            Sent
          </Badge>
        )
      case "received":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Received
          </Badge>
        )
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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

  if (!purchaseOrder) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Purchase order not found</p>
          <Button onClick={() => router.push("/orders/purchase-orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => router.push("/orders/purchase-orders")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <CardTitle className="text-2xl">Purchase Order Preview</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {purchaseOrder.po_number} - Generated by {purchaseOrder.created_by} on{" "}
                    {new Date(purchaseOrder.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Generating..." : "Export PDF"}
                </Button>
                <Button variant="outline" onClick={() => setEditingOrder(purchaseOrder)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-500 hover:text-red-600 border-red-200">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this purchase order? This action cannot be undone and will
                        permanently remove the purchase order from the database.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                        Delete Purchase Order
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Purchase Order Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-8 rounded-lg border shadow-sm"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">2K</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Purchase Order</h1>
                <p className="text-gray-600">2K Inventory Management</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">PURCHASE ORDER #:</p>
              <p className="text-lg font-bold">{purchaseOrder.po_number}</p>
              <p className="text-sm text-gray-600 mt-2">DATE:</p>
              <p className="font-semibold">{new Date(purchaseOrder.order_date).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Supplier Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name:</p>
                  <p className="font-semibold">{purchaseOrder.supplier}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status:</p>
                  <div className="mt-1">{getStatusBadge(purchaseOrder.status)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Information */}
          <div className="mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border mb-4">
              <h2 className="text-lg font-bold text-gray-800">Order Information</h2>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-bold text-gray-800">Material Name</TableHead>
                    <TableHead className="font-bold text-gray-800">Price</TableHead>
                    <TableHead className="font-bold text-gray-800">Quantity</TableHead>
                    <TableHead className="font-bold text-gray-800">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrder.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.material_name}</TableCell>
                      <TableCell>₱{item.unit_price.toFixed(2)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="font-medium">₱{item.total_price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Empty rows for spacing */}
                  {Array.from({ length: Math.max(0, 3 - purchaseOrder.items.length) }).map((_, index) => (
                    <TableRow key={`empty-${index}`}>
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border mb-4">
              <h2 className="text-lg font-bold text-gray-800">Payment Summary</h2>
            </div>
            <div className="max-w-md ml-auto bg-gray-50 p-4 rounded-lg border">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₱{purchaseOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium">{(purchaseOrder.discount_rate * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxes:</span>
                  <span className="font-medium">{(purchaseOrder.tax_rate * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">₱{purchaseOrder.shipping_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-3">
                  <span>TOTAL:</span>
                  <span>₱{purchaseOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Edit Modal */}
        {editingOrder && (
          <EditPurchaseOrderModal
            purchaseOrder={editingOrder}
            onClose={() => setEditingOrder(null)}
            onOrderUpdated={handleOrderUpdated}
          />
        )}
      </div>
    </MainLayout>
  )
}
