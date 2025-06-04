"use client"

import { motion } from "framer-motion"
import { Plus, Package, FileText, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { addActivity } from "@/lib/activity-store"

interface QuickActionsProps {
  onAddItem: () => void
}

export default function QuickActions({ onAddItem }: QuickActionsProps) {
  const actions = [
    {
      title: "Add Item",
      description: "Add new item to inventory",
      icon: <Plus className="h-5 w-5" />,
      action: onAddItem,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "View Inventory",
      description: "Browse all inventory items",
      icon: <Package className="h-5 w-5" />,
      action: () => {
        addActivity("Viewed inventory from quick actions")
        window.location.href = "/inventory"
      },
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "Generate Report",
      description: "Create inventory reports",
      icon: <FileText className="h-5 w-5" />,
      action: () => {
        addActivity("Accessed reports from quick actions")
        window.location.href = "/reports"
      },
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      title: "View Products",
      description: "Manage product catalog",
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => {
        addActivity("Viewed products from quick actions")
        window.location.href = "/products"
      },
      color: "bg-orange-500 hover:bg-orange-600",
    },
  ]

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-800">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Button
                onClick={action.action}
                className={`w-full justify-start gap-3 h-auto p-4 ${action.color} text-white`}
                variant="default"
              >
                {action.icon}
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs opacity-90">{action.description}</div>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
