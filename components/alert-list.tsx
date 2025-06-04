"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Package, Wrench, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { InventoryItem, RawMaterial } from "@/lib/database"

interface AlertListProps {
  lowStockProducts?: InventoryItem[]
  lowStockRawMaterials?: RawMaterial[]
  outOfStockProducts?: InventoryItem[]
  outOfStockRawMaterials?: RawMaterial[]
}

export default function AlertList({
  lowStockProducts = [],
  lowStockRawMaterials = [],
  outOfStockProducts = [],
  outOfStockRawMaterials = [],
}: AlertListProps) {
  const [showAllAlerts, setShowAllAlerts] = useState(false)

  // Create alerts with priority: out of stock first, then low stock
  const alerts = [
    // Out of stock products (highest priority)
    ...outOfStockProducts.map((item) => ({
      id: `out-of-stock-product-${item.id}`,
      type: "error" as const,
      title: "Out of Stock Alert - Product",
      message: `${item.name} is out of stock (0 dz remaining)`,
      time: "Now",
      icon: <Package className="h-4 w-4" />,
      priority: 1,
    })),
    // Out of stock raw materials (highest priority)
    ...outOfStockRawMaterials.map((material) => ({
      id: `out-of-stock-material-${material.id}`,
      type: "error" as const,
      title: "Out of Stock Alert - Raw Material",
      message: `${material.name} is out of stock (0 ${material.unit} remaining)`,
      time: "Now",
      icon: <Wrench className="h-4 w-4" />,
      priority: 1,
    })),
    // Low stock products (lower priority)
    ...lowStockProducts.map((item) => ({
      id: `low-stock-product-${item.id}`,
      type: "warning" as const,
      title: "Low Stock Alert - Product",
      message: `${item.name} is running low (${item.stock} dz remaining)`,
      time: "Now",
      icon: <Package className="h-4 w-4" />,
      priority: 2,
    })),
    // Low stock raw materials (lower priority)
    ...lowStockRawMaterials.map((material) => ({
      id: `low-stock-material-${material.id}`,
      type: "warning" as const,
      title: "Low Stock Alert - Raw Material",
      message: `${material.name} is running low (${material.quantity} ${material.unit} remaining)`,
      time: "Now",
      icon: <Wrench className="h-4 w-4" />,
      priority: 2,
    })),
  ]

  // Sort alerts by priority (out of stock first)
  const sortedAlerts = alerts.sort((a, b) => a.priority - b.priority)

  if (sortedAlerts.length === 0) {
    sortedAlerts.push({
      id: "no-alerts",
      type: "info" as const,
      title: "All Good!",
      message: "No alerts at this time. Your inventory is well-stocked.",
      time: "Now",
      icon: <Package className="h-4 w-4" />,
      priority: 3,
    })
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "info":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "error":
        return <XCircle className="h-4 w-4" />
      case "info":
        return <Package className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const displayedAlerts = showAllAlerts ? sortedAlerts : sortedAlerts.slice(0, 5)

  return (
    <div className="space-y-3">
      <div
        className={`space-y-3 ${
          showAllAlerts && sortedAlerts.length > 5
            ? "max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            : ""
        }`}
      >
        {displayedAlerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className={`p-2 rounded-full ${getAlertColor(alert.type)}`}>{getAlertIcon(alert.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                <Badge variant="outline" className="text-xs">
                  {alert.time}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {sortedAlerts.length > 5 && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            onClick={() => setShowAllAlerts(!showAllAlerts)}
          >
            {showAllAlerts ? "Show Less" : "View More"}
          </Button>
        </div>
      )}
    </div>
  )
}
