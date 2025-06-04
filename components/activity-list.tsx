"use client"

import { motion } from "framer-motion"
import { Clock, User, Package, Edit, Trash2, Plus } from "lucide-react"
import type { Activity } from "@/lib/database"

interface ActivityListProps {
  activities: Activity[]
}

export default function ActivityList({ activities }: ActivityListProps) {
  const getActivityIcon = (action: string) => {
    switch (action) {
      case "create":
        return <Plus className="h-4 w-4" />
      case "update":
        return <Edit className="h-4 w-4" />
      case "delete":
        return <Trash2 className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const getActivityColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-green-100 text-green-800"
      case "update":
        return "bg-blue-100 text-blue-800"
      case "delete":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No recent activity to display.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.slice(0, 10).map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <div className={`p-2 rounded-full ${getActivityColor(activity.action)}`}>
            {getActivityIcon(activity.action)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{activity.description}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {formatTime(activity.created_at)}
              </div>
            </div>
            {activity.user_id && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <User className="h-3 w-3" />
                User ID: {activity.user_id}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
