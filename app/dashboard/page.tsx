"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, TrendingUp, AlertTriangle, Wrench, Zap, Turtle } from "lucide-react"
import {
  getInventoryItems,
  getRawMaterials,
  getActivities,
  type InventoryItem,
  type RawMaterial,
  type Activity,
} from "@/lib/database"
import { getInvoices, type Invoice } from "@/lib/invoice-utils"
import StatCard from "@/components/stat-card"
import ActivityList from "@/components/activity-list"
import AlertList from "@/components/alert-list"
import MainLayout from "@/components/main-layout"

interface ProductSales {
  productId: number
  productName: string
  sku: string
  totalQuantitySold: number
  totalSalesValue: number
  salesCount: number
}

export default function Dashboard() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [fastMovingProduct, setFastMovingProduct] = useState<ProductSales | null>(null)
  const [slowMovingProduct, setSlowMovingProduct] = useState<ProductSales | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [itemsData, materialsData, activitiesData, invoicesData] = await Promise.all([
          getInventoryItems(),
          getRawMaterials(),
          getActivities(),
          getInvoices(),
        ])

        setInventoryItems(itemsData)
        setRawMaterials(materialsData)
        setActivities(activitiesData)
        setInvoices(invoicesData)

        // Calculate fast and slow moving products
        const { fastMoving, slowMoving } = calculateMovingProducts(invoicesData)
        setFastMovingProduct(fastMoving)
        setSlowMovingProduct(slowMoving)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate fast and slow moving products based on weekly sales
  const calculateMovingProducts = (allInvoices: Invoice[]) => {
    // Get invoices from the past week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const weeklyInvoices = allInvoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt)
      return invoiceDate >= oneWeekAgo && invoice.status === "fulfilled"
    })

    // Calculate product sales data
    const productSalesMap = new Map<number, ProductSales>()

    weeklyInvoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const existing = productSalesMap.get(item.productId)
        if (existing) {
          existing.totalQuantitySold += item.quantity
          existing.totalSalesValue += item.totalPrice
          existing.salesCount += 1
        } else {
          productSalesMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            totalQuantitySold: item.quantity,
            totalSalesValue: item.totalPrice,
            salesCount: 1,
          })
        }
      })
    })

    const productSales = Array.from(productSalesMap.values())

    if (productSales.length === 0) {
      return { fastMoving: null, slowMoving: null }
    }

    // Sort by total quantity sold (descending for fast moving, ascending for slow moving)
    const sortedByQuantity = [...productSales].sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)

    return {
      fastMoving: sortedByQuantity[0] || null,
      slowMoving: sortedByQuantity[sortedByQuantity.length - 1] || null,
    }
  }

  // Calculate statistics
  const totalProducts = inventoryItems.length
  const totalRawMaterials = rawMaterials.length
  const lowStockProducts = inventoryItems.filter((item) => item.status === "low-stock")
  const outOfStockProducts = inventoryItems.filter((item) => item.status === "out-of-stock")
  const lowStockRawMaterials = rawMaterials.filter((material) => material.status === "low-stock")
  const outOfStockRawMaterials = rawMaterials.filter((material) => material.status === "out-of-stock")
  const totalValue = inventoryItems.reduce((sum, item) => sum + item.price * item.stock, 0)
  const totalRawMaterialsValue = rawMaterials.reduce(
    (sum, material) => sum + material.cost_per_unit * material.quantity,
    0,
  )

  // Check if there are any alerts to display
  const hasAlerts =
    lowStockProducts.length > 0 ||
    lowStockRawMaterials.length > 0 ||
    outOfStockProducts.length > 0 ||
    outOfStockRawMaterials.length > 0

  if (isLoading) {
    return (
      <MainLayout>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your inventory management system</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            value={totalProducts.toString()}
            label="Total Products"
            icon={<Package className="w-6 h-6" />}
            variant={totalProducts > 0 ? "success" : "default"}
          />
          <StatCard
            value={totalRawMaterials.toString()}
            label="Raw Materials"
            icon={<Wrench className="w-6 h-6" />}
            variant={totalRawMaterials > 0 ? "success" : "default"}
          />
          <StatCard
            value={`₱${totalValue.toLocaleString()}`}
            label="Products Value"
            icon={<TrendingUp className="w-6 h-6" />}
            variant="success"
          />
          <StatCard
            value={`₱${totalRawMaterialsValue.toLocaleString()}`}
            label="Materials Value"
            icon={<TrendingUp className="w-6 h-6" />}
            variant="success"
          />
        </div>

        {/* Product Movement Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600" />
                Fast Moving Product (This Week)
              </CardTitle>
              <CardDescription>Product with highest sales volume</CardDescription>
            </CardHeader>
            <CardContent>
              {fastMovingProduct ? (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                  <div>
                    <p className="font-medium text-green-800">{fastMovingProduct.productName}</p>
                    <p className="text-sm text-green-600">{fastMovingProduct.sku}</p>
                    <p className="text-xs text-green-500">{fastMovingProduct.salesCount} sales transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-800">{fastMovingProduct.totalQuantitySold} dz</p>
                    <p className="text-sm text-green-600">₱{fastMovingProduct.totalSalesValue.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sales data available</p>
                  <p className="text-sm">Fast moving product will appear here once you have fulfilled invoices</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Turtle className="h-5 w-5 text-yellow-600" />
                Slow Moving Product (This Week)
              </CardTitle>
              <CardDescription>Product with lowest sales volume</CardDescription>
            </CardHeader>
            <CardContent>
              {slowMovingProduct ? (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                  <div>
                    <p className="font-medium text-yellow-800">{slowMovingProduct.productName}</p>
                    <p className="text-sm text-yellow-600">{slowMovingProduct.sku}</p>
                    <p className="text-xs text-yellow-500">{slowMovingProduct.salesCount} sales transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-800">{slowMovingProduct.totalQuantitySold} dz</p>
                    <p className="text-sm text-yellow-600">₱{slowMovingProduct.totalSalesValue.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Turtle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sales data available</p>
                  <p className="text-sm">Slow moving product will appear here once you have fulfilled invoices</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {hasAlerts && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Inventory Alerts
              </CardTitle>
              <CardDescription>Items that need your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertList
                lowStockProducts={lowStockProducts}
                lowStockRawMaterials={lowStockRawMaterials}
                outOfStockProducts={outOfStockProducts}
                outOfStockRawMaterials={outOfStockRawMaterials}
              />
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest actions in your inventory system</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityList activities={activities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
