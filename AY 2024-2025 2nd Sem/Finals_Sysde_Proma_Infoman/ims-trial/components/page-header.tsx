"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

interface PageHeaderProps {
  title: string
  children?: ReactNode
}

export default function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <motion.div
      className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b border-border"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-light tracking-tight mb-4 md:mb-0">{title}</h1>
      {children}
    </motion.div>
  )
}
