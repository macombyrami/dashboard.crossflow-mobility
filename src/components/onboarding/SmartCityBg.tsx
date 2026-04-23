'use client'
import React from 'react'
import { motion } from 'framer-motion'

export function SmartCityBg() {
  return (
    <div className="fixed inset-0 z-[-1] bg-bg-base overflow-hidden pointer-events-none">
      {/* Dynamic Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 blur-[120px] rounded-full animate-pulse-slow" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-brand-green/5 blur-[100px] rounded-full animate-pulse-slow delay-1000" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px' 
        }} 
      />

      {/* Floating Particles (Pseudo-Data) */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 100, x: Math.random() * 100 + '%' }}
          animate={{ 
            opacity: [0, 0.2, 0], 
            y: [-100, -1000], 
            x: (Math.random() * 100) + '%' 
          }}
          transition={{ 
            duration: Math.random() * 10 + 15, 
            repeat: Infinity, 
            ease: "linear",
            delay: i * 3
          }}
          className="absolute w-[1px] h-[100px] bg-gradient-to-t from-transparent via-brand/40 to-transparent"
        />
      ))}

      {/* Radial Mask */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-bg-base opacity-80" />
    </div>
  )
}
