"use client"

import type React from "react"
import { motion } from "framer-motion"

const IntroScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
      <motion.div className="mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
          <span className="text-white font-bold text-2xl">2K</span>
        </div>
      </motion.div>

      <motion.h1 className="text-6xl font-bold tracking-wider text-primary glow-text mb-4">2K INVENTORY</motion.h1>

      <motion.p className="text-xl text-gray-400 tracking-widest mb-10">MODERN INVENTORY MANAGEMENT SYSTEM</motion.p>
    </div>
  )
}

export default IntroScreen
