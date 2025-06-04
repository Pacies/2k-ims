"use client"
import { useState, useEffect } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { PurchaseOrder } from "@/lib/purchase-orders-utils"
import { getRawMaterials, getFixedPrices, type RawMaterial, type FixedPrice } from "@/lib/database"
import { supabase } from "@/lib/supabaseClient"

interface EditPurchaseOrderModalProps {
  purchaseOrder: PurchaseOrder | null
  onClose: () => void
  onOrderUpdated: (updatedOrder: PurchaseOrder) => void
}

interface NewItem {
  raw_material_id: number
  material_name: string
  quantity: number
  unit_price: number
}

export default function EditPurchaseOrderModal({
  purchaseOrder,
  onClose,
  onOrderUpdated,
}: EditPurchaseOrderModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterial[]>([])
  const [fixedPrices, setFixedPrices] = useState<FixedPrice[]>([])
  const [newItems, setNewItems] = useState<NewItem[]>([])

  // Add item form state - simplified to skip category selection
  const [step, setStep] = useState(1) // 1: type, 2: quantity, 3: price
  const [selectedType, setSelectedType] = useState("")
  const [customType, setCustomType] = useState("")
  const [quantity, setQuantity] = useState("")
  const [priceOption, setPriceOption] = useState<"manual" | "fixed">("manual")
  const [manualPrice, setManualPrice] = useState("")
  const [selectedFixedPrice, setSelectedFixedPrice] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  const { toast } = useToast()

  // Define expected materials for each supplier
  const getExpectedMaterials = (supplier: string) => {
    if (supplier === "A&B Textile") {
      return [
        { name: "Cotton Fabric", category: "Fabric" },
        { name: "Polyester Fabric", category: "Fabric" },
        { name: "Denim Fabric", category: "Fabric" },
      ]
    } else if (supplier === "Lucky 8") {
      return [
        { name: "Buttons", category: "Sewing" },
        { name: "Thread", category: "Sewing" },
        { name: "Zipper", category: "Sewing" },
        { name: "Needle", category: "Sewing" },
        { name: "Scissors", category: "Sewing" },
      ]
    }
    return []
  }

  // Get supplier category automatically
  const getSupplierCategory = () => {
    if (purchaseOrder?.supplier === "A&B Textile") return "Fabric"
    if (purchaseOrder?.supplier === "Lucky 8") return "Sewing"
    return ""
  }

  // Get material types for the supplier
  const getMaterialTypes = () => {
    if (purchaseOrder?.supplier === "A&B Textile") {
      return ["Cotton Fabric", "Polyester Fabric", "Denim Fabric", "Others"]
    } else if (purchaseOrder?.supplier === "Lucky 8") {
      return ["Buttons", "Thread", "Zipper", "Needle", "Scissors", "Others"]
    }
    return []
  }

  const materialTypes = getMaterialTypes()
  const supplierCategory = getSupplierCategory()

  useEffect(() => {
    if (purchaseOrder) {
      loadAvailableMaterials()
    }
  }, [purchaseOrder])

  useEffect(() => {
    if (supplierCategory && step === 3) {
      loadFixedPrices()
    }
  }, [supplierCategory, step])

  const loadAvailableMaterials = async () => {
    try {
      const materials = await getRawMaterials()
      const expectedMaterials = getExpectedMaterials(purchaseOrder?.supplier || "")

      // Filter materials by supplier first
      const supplierMaterials = materials.filter((material) => {
        return material.supplier === purchaseOrder?.supplier
      })

      // Ensure all expected materials are included
      expectedMaterials.forEach((expectedMaterial) => {
        const exists = supplierMaterials.find((m) => m.name.toLowerCase() === expectedMaterial.name.toLowerCase())

        if (!exists) {
          // Create a virtual material entry
          const virtualMaterial: RawMaterial = {
            id: Date.now() + Math.random(),
            name: expectedMaterial.name,
            category: expectedMaterial.category,
            quantity: 0,
            unit: expectedMaterial.category === "Fabric" ? "rolls" : "pcs",
            cost_per_unit: 0,
            supplier: purchaseOrder?.supplier || "",
            reorder_level: 20,
            sku: `TEMP-${expectedMaterial.name.replace(/\s+/g, "").toUpperCase()}`,
            status: "out-of-stock",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          supplierMaterials.push(virtualMaterial)
        }
      })

      // Sort materials alphabetically
      supplierMaterials.sort((a, b) => a.name.localeCompare(b.name))

      setAvailableMaterials(supplierMaterials)
      console.log("Filtered materials for supplier", purchaseOrder?.supplier, ":", supplierMaterials)
    } catch (error) {
      console.error("Error loading materials:", error)
    }
  }

  const loadFixedPrices = async () => {
    try {
      const prices = await getFixedPrices("raw_material", supplierCategory)
      setFixedPrices(prices)
    } catch (error) {
      console.error("Error loading fixed prices:", error)
    }
  }

  const resetAddItemForm = () => {
    setStep(1)
    setSelectedType("")
    setCustomType("")
    setQuantity("")
    setPriceOption("manual")
    setManualPrice("")
    setSelectedFixedPrice("")
    setShowCustomInput(false)
  }

  const handleTypeSelect = (type: string) => {
    if (type === "Others") {
      setShowCustomInput(true)
    } else {
      setSelectedType(type)
      setStep(2)
    }
  }

  const handleCustomTypeSubmit = () => {
    if (customType.trim()) {
      setSelectedType(customType.trim())
      setStep(2)
      setShowCustomInput(false)
    }
  }

  const handleQuantitySubmit = () => {
    if (quantity && Number.parseFloat(quantity) > 0) {
      setStep(3)
    } else {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity greater than 0.",
        variant: "destructive",
      })
    }
  }

  const getCurrentPrice = (): number => {
    if (priceOption === "manual") {
      return Number.parseFloat(manualPrice) || 0
    } else {
      const selectedPrice = fixedPrices.find((p) => p.id.toString() === selectedFixedPrice)
      return selectedPrice?.price || 0
    }
  }

  const handleAddItem = async () => {
    if (!selectedType || !quantity) {
      toast({
        title: "Validation Error",
        description: "Please complete all steps.",
        variant: "destructive",
      })
      return
    }

    const price = getCurrentPrice()
    if (price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      })
      return
    }

    // Find matching material from available materials
    const material = availableMaterials.find((m) => m.name.toLowerCase() === selectedType.toLowerCase())

    if (!material) {
      toast({
        title: "Material Not Found",
        description: `This material is not available from ${purchaseOrder?.supplier}.`,
        variant: "destructive",
      })
      return
    }

    if (!purchaseOrder) return

    setIsLoading(true)

    try {
      console.log("Looking for existing item with material_name:", selectedType, "and unit_price:", price)
      console.log("Current purchase order items:", purchaseOrder.items)

      // Check if this material already exists in the purchase order with the same price
      // Use material_name for comparison since it's more reliable
      const existingItem = purchaseOrder.items.find(
        (item) =>
          item.material_name.toLowerCase() === selectedType.toLowerCase() && Math.abs(item.unit_price - price) < 0.01, // Use small tolerance for price comparison
      )

      console.log("Found existing item:", existingItem)

      if (existingItem) {
        // Update existing item by adding to its quantity
        const newQuantity = existingItem.quantity + Number.parseFloat(quantity)
        const newTotalPrice = newQuantity * price

        console.log("Updating existing item:", {
          id: existingItem.id,
          oldQuantity: existingItem.quantity,
          addingQuantity: Number.parseFloat(quantity),
          newQuantity,
          newTotalPrice,
        })

        const { data: updatedItem, error: updateError } = await supabase!
          .from("purchase_order_items")
          .update({
            quantity: newQuantity,
            total_price: newTotalPrice,
          })
          .eq("id", existingItem.id)
          .select()
          .single()

        if (updateError) {
          console.error("Error updating existing item:", updateError)
          toast({
            title: "Error",
            description: "Failed to update the existing item quantity.",
            variant: "destructive",
          })
          return
        }

        console.log("Successfully updated existing item:", updatedItem)

        toast({
          title: "Success",
          description: `Added ${quantity} more ${selectedType} to existing item. New quantity: ${newQuantity}`,
        })
      } else {
        // Insert new item into the database
        console.log("Creating new item:", {
          po_id: purchaseOrder.id,
          raw_material_id: material.id,
          material_name: selectedType,
          quantity: Number.parseFloat(quantity),
          unit_price: price,
          total_price: Number.parseFloat(quantity) * price,
        })

        const { data: insertedItem, error: insertError } = await supabase!
          .from("purchase_order_items")
          .insert({
            po_id: purchaseOrder.id,
            raw_material_id: material.id,
            material_name: selectedType,
            quantity: Number.parseFloat(quantity),
            unit_price: price,
            total_price: Number.parseFloat(quantity) * price,
          })
          .select()
          .single()

        if (insertError) {
          console.error("Error inserting new item:", insertError)
          toast({
            title: "Error",
            description: "Failed to save the new item to the purchase order.",
            variant: "destructive",
          })
          return
        }

        console.log("Successfully inserted new item:", insertedItem)

        toast({
          title: "Success",
          description: `Added ${selectedType} to the purchase order.`,
        })
      }

      // Refresh the purchase order data
      await refreshPurchaseOrderData()

      // Reset form and close add item view
      resetAddItemForm()
      setShowAddItem(false)
    } catch (error) {
      console.error("Unexpected error saving item:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving the item.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveItem = async (itemId: number, itemName: string) => {
    if (!purchaseOrder) return

    setIsLoading(true)

    try {
      // Delete the item from the database
      const { error: deleteError } = await supabase!.from("purchase_order_items").delete().eq("id", itemId)

      if (deleteError) {
        console.error("Error deleting item:", deleteError)
        toast({
          title: "Error",
          description: "Failed to remove the item from the purchase order.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: `Removed ${itemName} from the purchase order.`,
      })

      // Refresh the purchase order data
      await refreshPurchaseOrderData()
    } catch (error) {
      console.error("Unexpected error removing item:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while removing the item.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshPurchaseOrderData = async () => {
    if (!purchaseOrder) return

    try {
      // Fetch updated items
      const { data: allItems, error: itemsError } = await supabase!
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", purchaseOrder.id)
        .order("id", { ascending: true })

      if (itemsError) {
        console.error("Error fetching updated items:", itemsError)
        return
      }

      // Calculate new totals
      const newSubtotal = allItems.reduce((sum, item) => sum + item.total_price, 0)
      const newTaxAmount = newSubtotal * purchaseOrder.tax_rate
      const newTotalAmount = newSubtotal + newTaxAmount + purchaseOrder.shipping_cost - purchaseOrder.discount_amount

      // Update the purchase order totals
      const { data: updatedOrder, error: updateError } = await supabase!
        .from("purchase_orders")
        .update({
          subtotal: newSubtotal,
          tax_amount: newTaxAmount,
          total_amount: newTotalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", purchaseOrder.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating purchase order totals:", updateError)
        toast({
          title: "Warning",
          description: "Items were processed but totals may not be updated correctly.",
          variant: "destructive",
        })
      }

      const completeUpdatedOrder = {
        ...(updatedOrder || purchaseOrder),
        items: allItems || purchaseOrder.items,
      }

      // Notify parent
      onOrderUpdated(completeUpdatedOrder)
    } catch (error) {
      console.error("Error refreshing purchase order data:", error)
    }
  }

  const handleRemoveNewItem = (index: number) => {
    setNewItems(newItems.filter((_, i) => i !== index))
  }

  const handleSaveChanges = async () => {
    if (newItems.length === 0) {
      toast({
        title: "No Changes",
        description: "No new items to save.",
        variant: "destructive",
      })
      return
    }

    if (!purchaseOrder) return

    setIsLoading(true)

    try {
      console.log("Saving new items to purchase order:", newItems)

      // Insert new items into the database
      const itemsToInsert = newItems.map((item) => ({
        po_id: purchaseOrder.id,
        raw_material_id: item.raw_material_id,
        material_name: item.material_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }))

      const { data: insertedItems, error: insertError } = await supabase!
        .from("purchase_order_items")
        .insert(itemsToInsert)
        .select()

      if (insertError) {
        console.error("Error inserting new items:", insertError)
        toast({
          title: "Error",
          description: "Failed to save new items to the purchase order.",
          variant: "destructive",
        })
        return
      }

      console.log("New items inserted successfully:", insertedItems)

      // Calculate new totals
      const newItemsSubtotal = newItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
      const newSubtotal = purchaseOrder.subtotal + newItemsSubtotal
      const newTaxAmount = newSubtotal * purchaseOrder.tax_rate
      const newTotalAmount = newSubtotal + newTaxAmount + purchaseOrder.shipping_cost - purchaseOrder.discount_amount

      // Update the purchase order totals
      const { data: updatedOrder, error: updateError } = await supabase!
        .from("purchase_orders")
        .update({
          subtotal: newSubtotal,
          tax_amount: newTaxAmount,
          total_amount: newTotalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", purchaseOrder.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating purchase order totals:", updateError)
        toast({
          title: "Warning",
          description: "Items were added but totals may not be updated correctly.",
          variant: "destructive",
        })
      }

      // Fetch the complete updated purchase order with all items
      const { data: allItems, error: itemsError } = await supabase!
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", purchaseOrder.id)
        .order("id", { ascending: true })

      if (itemsError) {
        console.error("Error fetching updated items:", itemsError)
      }

      const completeUpdatedOrder = {
        ...(updatedOrder || purchaseOrder),
        items: allItems || [...purchaseOrder.items, ...insertedItems],
      }

      // Clear the new items and notify parent
      setNewItems([])
      onOrderUpdated(completeUpdatedOrder)

      toast({
        title: "Success",
        description: `Added ${newItems.length} new item(s) to the purchase order.`,
      })

      // Close the modal
      onClose()
    } catch (error) {
      console.error("Unexpected error saving changes:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving changes.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 3) {
      setStep(2)
      setPriceOption("manual")
      setManualPrice("")
      setSelectedFixedPrice("")
    } else if (step === 2) {
      setStep(1)
      setQuantity("")
    }
  }

  if (!purchaseOrder) return null

  return (
    <Dialog open={!!purchaseOrder} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Purchase Order {purchaseOrder.po_number} - {purchaseOrder.supplier}
          </DialogTitle>
        </DialogHeader>

        {!showAddItem ? (
          <div className="space-y-6">
            {/* Current Items Section */}
            <Card>
              <CardHeader>
                <CardTitle>Current Items in Purchase Order</CardTitle>
              </CardHeader>
              <CardContent>
                {purchaseOrder.items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrder.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.material_name}</TableCell>
                          <TableCell>₱{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₱{item.total_price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id, item.material_name)}
                              className="text-red-500 hover:text-red-600"
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-center py-4">No items in this purchase order.</p>
                )}
              </CardContent>
            </Card>

            {/* Add Items Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Add {supplierCategory} Materials to Purchase Order ({purchaseOrder.supplier})
                  <Button onClick={() => setShowAddItem(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Raw Material
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Available materials: <span className="font-medium">{availableMaterials.length}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Expected:{" "}
                    {getExpectedMaterials(purchaseOrder.supplier)
                      .map((m) => m.name)
                      .join(", ")}
                  </p>
                </div>
                {newItems.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.material_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₱{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell>₱{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveNewItem(index)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No new items added. Click "Add Raw Material" to add {supplierCategory.toLowerCase()} materials from{" "}
                    {purchaseOrder.supplier} to this purchase order.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Add Item Form - Supplier Specific */
          <div className="space-y-4">
            {/* Step 1: Type Selection */}
            {step === 1 && !showCustomInput && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddItem(false)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Label className="text-base font-medium">
                    Select {supplierCategory} Type for {purchaseOrder.supplier}
                  </Label>
                </div>
                {materialTypes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No material types available for {purchaseOrder.supplier}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {materialTypes.map((type) => (
                      <Button
                        key={type}
                        variant="outline"
                        className="h-12 text-left justify-start"
                        onClick={() => handleTypeSelect(type)}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Custom Type Input */}
            {step === 1 && showCustomInput && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowCustomInput(false)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Label className="text-base font-medium">Enter Custom {supplierCategory} Type</Label>
                </div>
                <Input
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder={`Enter ${supplierCategory.toLowerCase()} type name`}
                  onKeyPress={(e) => e.key === "Enter" && handleCustomTypeSubmit()}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddItem(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCustomTypeSubmit} disabled={!customType.trim()}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Quantity Input */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Label className="text-base font-medium">Enter Quantity</Label>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Selected: <span className="font-medium">{selectedType}</span> ({supplierCategory}) from{" "}
                    {purchaseOrder.supplier}
                  </p>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddItem(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleQuantitySubmit} disabled={!quantity || Number.parseFloat(quantity) <= 0}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Price Input */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Label className="text-base font-medium">Set Price</Label>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Item: <span className="font-medium">{selectedType}</span> | Quantity:{" "}
                    <span className="font-medium">{quantity}</span> | Supplier:{" "}
                    <span className="font-medium">{purchaseOrder.supplier}</span>
                  </p>

                  {/* Price Option Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Choose Price Option</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="manual"
                          name="priceOption"
                          value="manual"
                          checked={priceOption === "manual"}
                          onChange={(e) => setPriceOption(e.target.value as "manual" | "fixed")}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="manual" className="text-sm">
                          Enter price manually
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="fixed"
                          name="priceOption"
                          value="fixed"
                          checked={priceOption === "fixed"}
                          onChange={(e) => setPriceOption(e.target.value as "manual" | "fixed")}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="fixed" className="text-sm">
                          Use fixed price from database
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Manual Price Input */}
                  {priceOption === "manual" && (
                    <div className="space-y-2">
                      <Label htmlFor="manualPrice" className="text-sm">
                        Price per unit (₱)
                      </Label>
                      <Input
                        id="manualPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {/* Fixed Price Dropdown */}
                  {priceOption === "fixed" && (
                    <div className="space-y-2">
                      <Label htmlFor="fixedPrice" className="text-sm">
                        Select fixed price
                      </Label>
                      <Select value={selectedFixedPrice} onValueChange={setSelectedFixedPrice}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a fixed price" />
                        </SelectTrigger>
                        <SelectContent>
                          {fixedPrices.length === 0 ? (
                            <SelectItem value="no-prices" disabled>
                              No fixed prices available for {supplierCategory}
                            </SelectItem>
                          ) : (
                            fixedPrices.map((price) => (
                              <SelectItem key={price.id} value={price.id.toString()}>
                                {price.item_name} - ₱{price.price.toFixed(2)}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Price Preview */}
                  {getCurrentPrice() > 0 && (
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm">
                        <span className="font-medium">Total Cost:</span> ₱
                        {(getCurrentPrice() * Number.parseFloat(quantity || "0")).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ₱{getCurrentPrice().toFixed(2)} × {quantity} units
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddItem(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddItem} disabled={isLoading || getCurrentPrice() <= 0}>
                    {isLoading ? "Adding..." : "Add to Purchase Order"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Floating Save Button */}
        {newItems.length > 0 && !showAddItem && (
          <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel Changes
            </Button>
            <Button onClick={handleSaveChanges} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : `Save ${newItems.length} New Item(s) to Purchase Order`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
