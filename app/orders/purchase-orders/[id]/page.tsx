"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)

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

  const handleExportPDF = () => {
    if (purchaseOrder) {
      addActivity(`Exported purchase order ${purchaseOrder.po_number} as PDF`)

      // Create a printable version of the purchase order
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Purchase Order ${purchaseOrder.po_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
              .company-info { display: flex; align-items: center; gap: 15px; }
              .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; }
              .po-details { text-align: right; }
              .section { margin-bottom: 25px; }
              .section-title { background: #f3f4f6; padding: 10px; border-radius: 5px; font-weight: bold; margin-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f3f4f6; font-weight: bold; }
              .summary { max-width: 300px; margin-left: auto; background: #f9fafb; padding: 15px; border-radius: 5px; }
              .total-row { border-top: 2px solid #333; font-weight: bold; font-size: 18px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-info">
                <div class="logo">2K</div>
                <div>
                  <h1>Purchase Order</h1>
                  <p>2K Inventory Management</p>
                </div>
              </div>
              <div class="po-details">
                <p><strong>PURCHASE ORDER #:</strong></p>
                <p style="font-size: 18px; font-weight: bold;">${purchaseOrder.po_number}</p>
                <p><strong>DATE:</strong></p>
                <p>${new Date(purchaseOrder.order_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Supplier Information</div>
              <p><strong>Name:</strong> ${purchaseOrder.supplier}</p>
            </div>

            <div class="section">
              <div class="section-title">Order Information</div>
              <table>
                <thead>
                  <tr>
                    <th>Material Name</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${purchaseOrder.items
                    .map(
                      (item) => `
                    <tr>
                      <td>${item.material_name}</td>
                      <td>₱${item.unit_price.toFixed(2)}</td>
                      <td>${item.quantity}</td>
                      <td>₱${item.total_price.toFixed(2)}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Payment Summary</div>
              <div class="summary">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Subtotal:</span>
                  <span>₱${purchaseOrder.subtotal.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Discount:</span>
                  <span>${(purchaseOrder.discount_rate * 100).toFixed(0)}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Taxes:</span>
                  <span>${(purchaseOrder.tax_rate * 100).toFixed(0)}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Shipping:</span>
                  <span>₱${purchaseOrder.shipping_cost.toFixed(2)}</span>
                </div>
                <div class="total-row" style="display: flex; justify-content: space-between; padding-top: 8px;">
                  <span>TOTAL:</span>
                  <span>₱${purchaseOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>
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
        description: `Purchase order ${purchaseOrder.po_number} is being exported as PDF...`,
      })
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
                <Button onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
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
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name:</p>
                  <p className="font-semibold">{purchaseOrder.supplier}</p>
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
