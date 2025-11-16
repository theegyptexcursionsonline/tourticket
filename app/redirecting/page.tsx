'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';

const REDIRECT_DELAY = 3000; // 3 seconds

export default function RedirectingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const destination = searchParams.get('to') || '/checkout';

  useEffect(() => {
    // Redirect after delay
    const redirectTimer = setTimeout(() => {
      router.push(destination);
    }, REDIRECT_DELAY);

    return () => {
      clearTimeout(redirectTimer);
    };
  }, [router, destination]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl w-full"
      >
        {/* Animated Image/GIF - Replace with your own animated GIF */}
        <motion.div
          className="mb-8 flex justify-center"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="relative w-64 h-64 md:w-80 md:h-80">
            <Image
              src="/newimage.png!bw700" // Replace this with your animated GIF
              alt="Loading"
              fill
              className="object-contain"
              priority
            />
          </div>
        </motion.div>

        {/* Large Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
        >
          Preparing Your Adventure
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-lg md:text-xl text-slate-600 mb-8 max-w-xl mx-auto"
        >
          Hold tight! We're securing your booking and preparing everything for your amazing Egyptian experience.
        </motion.p>

        {/* Simple Loading Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-center gap-2"
        >
          <motion.div
            className="w-3 h-3 bg-red-600 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 0,
            }}
          />
          <motion.div
            className="w-3 h-3 bg-red-600 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 0.2,
            }}
          />
          <motion.div
            className="w-3 h-3 bg-red-600 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 0.4,
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

