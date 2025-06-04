"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getRawMaterials,
  getFixedPrices,
  getProductRecipes,
  getProductRecipesByName,
  type RawMaterial,
  type FixedPrice,
} from "@/lib/database"
import { createProductOrder } from "@/lib/orders-utils"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertTriangle, CheckCircle, Package } from "lucide-react"

interface GenerateProductOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onOrderCreated: () => void
}

interface RequiredMaterial {
  materialId: number
  name: string
  quantityRequired: number
  quantityNeeded: number
  available: number
  unit: string
  sufficient: boolean
}

export default function GenerateProductOrderModal({ isOpen, onClose, onOrderCreated }: GenerateProductOrderModalProps) {
  const [products, setProducts] = useState<FixedPrice[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [productQuantity, setProductQuantity] = useState<string>("1")
  const [requiredMaterials, setRequiredMaterials] = useState<RequiredMaterial[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isCalculating, setIsCalculating] = useState<boolean>(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        console.log("Loading products and materials...")
        const [productsData, materialsData] = await Promise.all([getFixedPrices("product"), getRawMaterials()])
        console.log("Products loaded:", productsData.length)
        console.log("Materials loaded:", materialsData.length)
        setProducts(productsData)
        setRawMaterials(materialsData)
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "Failed to load products and materials",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (isOpen) {
      loadData()
    }
  }, [isOpen, toast])

  const calculateRequiredMaterials = async () => {
    if (!selectedProduct || !productQuantity) {
      console.log("Missing product or quantity")
      return
    }

    const quantity = Number.parseInt(productQuantity) || 0
    if (quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity greater than 0",
        variant: "destructive",
      })
      return
    }

    setIsCalculating(true)
    try {
      console.log("Calculating materials for product ID:", selectedProduct, "quantity:", quantity)

      // Get the selected product details
      const selectedProductData = products.find((p) => p.id.toString() === selectedProduct)
      if (!selectedProductData) {
        console.error("Selected product not found")
        return
      }

      console.log("Selected product:", selectedProductData)

      // Try to get recipes by product ID first
      let recipes = await getProductRecipes(Number.parseInt(selectedProduct))
      console.log("Recipes by ID:", recipes)

      // If no recipes found by ID, try by product name
      if (recipes.length === 0) {
        console.log("No recipes found by ID, trying by name:", selectedProductData.item_name)
        recipes = await getProductRecipesByName(selectedProductData.item_name)
        console.log("Recipes by name:", recipes)
      }

      // If still no recipes, try with generic fallback
      if (recipes.length === 0) {
        console.log("No specific recipes found, trying generic...")
        recipes = await getProductRecipes(999) // Generic recipe
        console.log("Generic recipes:", recipes)
      }

      if (recipes.length === 0) {
        toast({
          title: "No Recipe Found",
          description: `No recipe found for "${selectedProductData.item_name}". Please contact administrator to set up the product recipe.`,
          variant: "destructive",
        })
        setRequiredMaterials([])
        return
      }

      console.log("Using recipes:", recipes)

      // Calculate required materials
      const materialsNeeded: RequiredMaterial[] = recipes.map((recipe) => {
        const material = rawMaterials.find((m) => m.id === recipe.raw_material_id)
        const quantityNeeded = recipe.quantity_required * quantity
        const available = material?.quantity || 0

        console.log(`Material ${recipe.raw_material_name}: need ${quantityNeeded}, available ${available}`)

        return {
          materialId: recipe.raw_material_id,
          name: recipe.raw_material_name,
          quantityRequired: recipe.quantity_required,
          quantityNeeded: quantityNeeded,
          available: available,
          unit: recipe.unit,
          sufficient: available >= quantityNeeded,
        }
      })

      console.log("Materials needed:", materialsNeeded)
      setRequiredMaterials(materialsNeeded)

      // Check if all materials are sufficient
      const insufficientMaterials = materialsNeeded.filter((m) => !m.sufficient)
      if (insufficientMaterials.length > 0) {
        toast({
          title: "Insufficient Materials",
          description: `${insufficientMaterials.length} material(s) have insufficient stock. Please check the requirements below.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Materials Available",
          description: "All required materials are available for production.",
        })
      }
    } catch (error) {
      console.error("Error calculating required materials:", error)
      toast({
        title: "Error",
        description: "Failed to calculate required materials",
        variant: "destructive",
      })
    } finally {
      setIsCalculating(false)
    }
  }

  // Trigger calculation when product or quantity changes
  useEffect(() => {
    if (selectedProduct && productQuantity && products.length > 0 && rawMaterials.length > 0) {
      console.log("Triggering calculation due to changes")
      calculateRequiredMaterials()
    } else {
      console.log("Clearing materials - missing data")
      setRequiredMaterials([])
    }
  }, [selectedProduct, productQuantity, products, rawMaterials])

  const handleSubmit = async () => {
    if (!selectedProduct || !productQuantity) {
      toast({
        title: "Missing Information",
        description: "Please select a product and enter quantity",
        variant: "destructive",
      })
      return
    }

    if (requiredMaterials.length === 0) {
      toast({
        title: "No Materials",
        description: "No materials calculated for this product",
        variant: "destructive",
      })
      return
    }

    const quantity = Number.parseInt(productQuantity) || 0
    if (quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Product quantity must be greater than zero",
        variant: "destructive",
      })
      return
    }

    // Check if all materials are sufficient
    const insufficientMaterials = requiredMaterials.filter((m) => !m.sufficient)
    if (insufficientMaterials.length > 0) {
      toast({
        title: "Cannot Create Order",
        description: "Some materials have insufficient stock. Please restock before creating the order.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const product = products.find((p) => p.id.toString() === selectedProduct)
      if (!product) throw new Error("Selected product not found")

      const orderData = {
        productId: product.id,
        productName: product.item_name,
        quantity: quantity,
        materials: requiredMaterials.map((m) => ({
          materialId: m.materialId,
          quantity: m.quantityNeeded,
        })),
        status: "pending" as const,
      }

      await createProductOrder(orderData)
      toast({
        title: "Success",
        description: "Product order created successfully and raw materials have been deducted",
      })
      onOrderCreated()
      onClose()
    } catch (error) {
      console.error("Error creating product order:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create product order",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setSelectedProduct("")
    setProductQuantity("1")
    setRequiredMaterials([])
  }

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  const canCreateOrder = requiredMaterials.length > 0 && requiredMaterials.every((m) => m.sufficient)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Generate Product Order
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Product Selection */}
            <div className="grid gap-4">
              <div>
                <Label htmlFor="product" className="text-base font-semibold">
                  Select Product to Produce
                </Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger id="product" className="mt-2">
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.item_name} - ₱{product.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity" className="text-base font-semibold">
                  Quantity to Produce
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={productQuantity === "0" ? "" : productQuantity}
                  onChange={(e) => setProductQuantity(e.target.value)}
                  min="1"
                  className="mt-2"
                  placeholder="Enter quantity"
                />
              </div>
            </div>

            {/* Required Materials */}
            {selectedProduct && productQuantity && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Required Materials
                    {isCalculating && <Loader2 className="h-4 w-4 animate-spin" />}
                  </CardTitle>
                  <CardDescription>
                    Materials needed to produce {productQuantity} unit(s) of the selected product
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isCalculating ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Calculating required materials...
                    </div>
                  ) : requiredMaterials.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No materials calculated yet</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Material</TableHead>
                              <TableHead>Required per Unit</TableHead>
                              <TableHead>Total Needed</TableHead>
                              <TableHead>Available</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {requiredMaterials.map((material) => (
                              <TableRow key={material.materialId}>
                                <TableCell className="font-medium">{material.name}</TableCell>
                                <TableCell>
                                  {material.quantityRequired} {material.unit}
                                </TableCell>
                                <TableCell>
                                  {material.quantityNeeded} {material.unit}
                                </TableCell>
                                <TableCell>
                                  {material.available} {material.unit}
                                </TableCell>
                                <TableCell>
                                  {material.sufficient ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Sufficient
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Insufficient
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Summary */}
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          {canCreateOrder ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span className="font-medium text-green-700">
                                All materials available - Ready to create order
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                              <span className="font-medium text-red-700">
                                {requiredMaterials.filter((m) => !m.sufficient).length} material(s) insufficient
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || isLoading || !canCreateOrder}
            className={canCreateOrder ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Product Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
