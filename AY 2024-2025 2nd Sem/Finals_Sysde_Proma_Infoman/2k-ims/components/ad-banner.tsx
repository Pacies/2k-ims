"use client"

import { motion } from "framer-motion"
import Image from "next/image"

interface AdBannerProps {
  text: string
  delay?: number
}

export default function AdBanner({ text, delay = 0 }: AdBannerProps) {
  return (
    <motion.div
      className="relative mt-8 mb-8 rounded-lg overflow-hidden shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Image
        src={`/placeholder.svg?height=150&width=1200&text=Coca-Cola+${text}`}
        alt="Coca-Cola Advertisement"
        width={1200}
        height={150}
        className="w-full h-auto"
      />
      <span className="absolute top-2 right-2 bg-black/50 text-gray-400 px-2 py-1 rounded text-xs">Advertisement</span>
    </motion.div>
  )
}
