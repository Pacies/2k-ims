"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Package, CreditCard, ShoppingCart } from "lucide-react"
import PageHeader from "@/components/page-header"
import MainLayout from "@/components/main-layout"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getPurchaseOrders } from "@/lib/purchase-orders-utils"
import { getProductOrders } from "@/lib/orders-utils"
import { getInvoices } from "@/lib/invoice-utils"

export default function OrdersPage() {
  const router = useRouter()
  const [activePurchaseOrders, setActivePurchaseOrders] = useState(0)
  const [pendingWorkOrders, setPendingWorkOrders] = useState(0)
  const [outstandingInvoices, setOutstandingInvoices] = useState(0)
  const [pendingInvoicesCount, setPendingInvoicesCount] = useState(0)
  const [weekOverWeekChange, setWeekOverWeekChange] = useState(0)
  const [dayOverDayChange, setDayOverDayChange] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)

        // Fetch real data
        const [purchaseOrders, productOrders, invoices] = await Promise.all([
          getPurchaseOrders(),
          getProductOrders(),
          getInvoices(),
        ])

        // Calculate active purchase orders
        const activePOs = purchaseOrders.filter(
          (po) => po.status === "pending" || po.status === "approved" || po.status === "sent",
        )
        setActivePurchaseOrders(activePOs.length)

        // Calculate pending work orders
        const pendingWOs = productOrders.filter((wo) => wo.status === "pending" || wo.status === "in-progress")
        setPendingWorkOrders(pendingWOs.length)

        // Calculate outstanding invoices
        const pendingInvoices = invoices.filter((inv) => inv.status === "pending")
        const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
        setOutstandingInvoices(totalOutstanding)
        setPendingInvoicesCount(pendingInvoices.length)

        // Calculate week-over-week change for purchase orders
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const lastWeekPOs = purchaseOrders.filter((po) => {
          const createdDate = new Date(po.created_at)
          return (
            createdDate >= oneWeekAgo && (po.status === "pending" || po.status === "approved" || po.status === "sent")
          )
        })
        setWeekOverWeekChange(lastWeekPOs.length)

        // Calculate day-over-day change for work orders
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayWOs = productOrders.filter((wo) => {
          const createdDate = new Date(wo.createdAt)
          return createdDate >= yesterday && (wo.status === "pending" || wo.status === "in-progress")
        })
        setDayOverDayChange(yesterdayWOs.length)
      } catch (error) {
        console.error("Error fetching order data:", error)
        // Keep values at 0 on error - don't use fake fallback data
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const orderModules = [
    {
      title: "Purchase Orders (PO)",
      description: "Manage supplier purchase orders and procurement",
      icon: ShoppingCart,
      color: "bg-blue-500 hover:bg-blue-600",
      route: "/orders/purchase-orders",
    },
    {
      title: "Product Orders (Work Orders)",
      description: "Create and manage production work orders",
      icon: Package,
      color: "bg-green-500 hover:bg-green-600",
      route: "/orders/work-orders",
    },
    {
      title: "Invoice & Payment",
      description: "Handle invoicing and payment processing",
      icon: CreditCard,
      color: "bg-purple-500 hover:bg-purple-600",
      route: "/orders/invoices",
    },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Orders Management">
          <span className="text-muted-foreground text-base">Manage all order types and financial transactions</span>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orderModules.map((module) => {
            const IconComponent = module.icon
            return (
              <Card
                key={module.route}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => router.push(module.route)}
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-16 h-16 ${module.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200`}
                  >
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                  <CardDescription className="text-center">{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(module.route)
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Access Module
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : activePurchaseOrders}</div>
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? "Loading..."
                  : weekOverWeekChange > 0
                    ? `+${weekOverWeekChange} from last week`
                    : "No change from last week"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Work Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : pendingWorkOrders}</div>
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? "Loading..."
                  : dayOverDayChange > 0
                    ? `+${dayOverDayChange} from yesterday`
                    : "No change from yesterday"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : `₱${outstandingInvoices.toLocaleString()}`}</div>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading..." : `${pendingInvoicesCount} invoices pending`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
