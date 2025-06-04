"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getInventoryItems, type InventoryItem } from "@/lib/database"
import { calculateInvoiceTotals, type InvoiceItem, type Invoice } from "@/lib/invoice-utils"

interface GenerateInvoiceModalProps {
  onInvoiceCreated: (invoice: Invoice) => void
}

export default function GenerateInvoiceModal({ onInvoiceCreated }: GenerateInvoiceModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Invoice Information
  const [customerName, setCustomerName] = useState("")
  const [invoiceDate, setInvoiceDate] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")

  // Product Line Items
  const [availableProducts, setAvailableProducts] = useState<InventoryItem[]>([])
  const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState("")

  // Load available products when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProducts()
      // Set current date as default invoice date
      const today = new Date().toISOString().split("T")[0]
      setInvoiceDate(today)

      // Set default delivery date (7 days from now)
      const defaultDeliveryDate = new Date()
      defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 7)
      setDeliveryDate(defaultDeliveryDate.toISOString().split("T")[0])
    }
  }, [isOpen])

  const loadProducts = async () => {
    try {
      const products = await getInventoryItems()
      setAvailableProducts(products.filter((p) => p.stock > 0)) // Only show products in stock
    } catch (error) {
      console.error("Error loading products:", error)
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setCustomerName("")
    setInvoiceDate("")
    setDeliveryDate("")
    setSelectedItems([])
    setSelectedProductId("")
    setQuantity("")
  }

  const handleAddItem = () => {
    if (!selectedProductId || !quantity) {
      toast({
        title: "Validation Error",
        description: "Please select a product and enter quantity.",
        variant: "destructive",
      })
      return
    }

    const product = availableProducts.find((p) => p.id.toString() === selectedProductId)
    if (!product) return

    const qty = Number.parseInt(quantity)
    if (qty <= 0 || qty > product.stock) {
      toast({
        title: "Invalid Quantity",
        description: `Please enter a quantity between 1 and ${product.stock}.`,
        variant: "destructive",
      })
      return
    }

    // Check if item already exists
    const existingItemIndex = selectedItems.findIndex((item) => item.productId === product.id)
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...selectedItems]
      const newQuantity = updatedItems[existingItemIndex].quantity + qty
      if (newQuantity > product.stock) {
        toast({
          title: "Insufficient Stock",
          description: `Total quantity would exceed available stock (${product.stock}).`,
          variant: "destructive",
        })
        return
      }
      updatedItems[existingItemIndex].quantity = newQuantity
      updatedItems[existingItemIndex].totalPrice = newQuantity * product.price
      setSelectedItems(updatedItems)
    } else {
      // Add new item
      const newItem: InvoiceItem = {
        id: Date.now(),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: qty * product.price,
      }
      setSelectedItems([...selectedItems, newItem])
    }

    setSelectedProductId("")
    setQuantity("")
  }

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== itemId))
  }

  const handleSave = async () => {
    console.log("=== Starting invoice save process ===")

    // Validation
    if (!customerName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter customer name.",
        variant: "destructive",
      })
      return
    }

    if (!invoiceDate) {
      toast({
        title: "Validation Error",
        description: "Please select invoice date.",
        variant: "destructive",
      })
      return
    }

    if (!deliveryDate) {
      toast({
        title: "Validation Error",
        description: "Please select delivery date.",
        variant: "destructive",
      })
      return
    }

    if (selectedItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one product to the invoice.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      console.log("Validation passed, calculating totals...")

      const { subtotal, taxAmount, totalAmount } = calculateInvoiceTotals(selectedItems, 12) // 12% VAT

      const invoiceData = {
        customerName: customerName.trim(),
        items: selectedItems,
        subtotal,
        taxRate: 12,
        taxAmount,
        totalAmount,
        issueDate: new Date(invoiceDate).toISOString(),
        dueDate: new Date(deliveryDate).toISOString(),
        notes: "",
      }

      console.log("Creating invoice with data:", invoiceData)

      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create invoice")
      }

      const newInvoice = await response.json()

      console.log("Invoice created successfully:", newInvoice)

      toast({
        title: "Invoice Created",
        description: `Invoice ${newInvoice.invoiceNumber} has been created successfully.`,
      })

      onInvoiceCreated(newInvoice)
      resetForm()
      setIsOpen(false)
    } catch (error) {
      console.error("Error creating invoice:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invoice. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedProduct = availableProducts.find((p) => p.id.toString() === selectedProductId)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <FileText className="h-4 w-4 mr-2" />
          Generate Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Info Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Invoice Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date *</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Delivery Date *</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Product Line Items Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Product Line Items</h3>

            {/* Add Product Form */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Product SKU</Label>
                  <Input
                    value={selectedProduct?.sku || ""}
                    disabled
                    placeholder="Auto-filled"
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedProduct?.stock || 999}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter qty"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit of Measurement</Label>
                  <Input
                    value="dz" // Default unit
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button onClick={handleAddItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
              {selectedProduct && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Available stock: {selectedProduct.stock} dz | Unit price: ₱{selectedProduct.price.toFixed(2)}
                </div>
              )}
            </div>

            {/* Selected Items Table */}
            {selectedItems.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell className="text-right">{item.quantity} dz</TableCell>
                        <TableCell className="text-right">₱{item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₱{item.totalPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Total Summary */}
                <div className="border-t p-4 bg-gray-50">
                  <div className="flex justify-end space-y-1">
                    <div className="text-right space-y-1">
                      <div className="flex justify-between w-48">
                        <span>Subtotal:</span>
                        <span>₱{calculateInvoiceTotals(selectedItems, 12).subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between w-48">
                        <span>Tax (12%):</span>
                        <span>₱{calculateInvoiceTotals(selectedItems, 12).taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between w-48 font-bold text-lg border-t pt-1">
                        <span>Total:</span>
                        <span>₱{calculateInvoiceTotals(selectedItems, 12).totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
