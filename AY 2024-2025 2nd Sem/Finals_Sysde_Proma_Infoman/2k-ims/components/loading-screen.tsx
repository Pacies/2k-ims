"use client"
import { motion } from "framer-motion"

const LoadingScreen = () => {
  return (
    <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black z-50">
      <motion.div className="text-primary text-xl tracking-widest">INITIALIZING 2K INVENTORY</motion.div>
    </div>
  )
}

export default LoadingScreen
