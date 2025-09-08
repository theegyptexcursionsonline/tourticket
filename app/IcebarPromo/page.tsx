// app/about-ice-project/page.tsx
"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CheckCircle } from 'lucide-react';

const features = [
  "Everything from walls to glasses is carved from pure ice.",
  "Kept at a constant -5°C (23°F) for an authentic arctic feel.",
  "Receive a designer thermal cape and gloves upon entry.",
  "Signature cocktails served in hand-carved ice glasses.",
  "Stunning ice sculptures and dynamic LED light shows."
];

const galleryImages = [
  { src: "/images/iceberg.png", alt: "Vibrant blue-lit ice bar interior" },
  { src: "/images/iceberg.png", alt: "Detailed ice sculpture" },
  { src: "/images/iceberg.png", alt: "Guests enjoying cocktails in thermal capes" },
  { src: "/images/iceberg.png", alt: "Close-up of a cocktail in an ice glass" },
];

export default function AboutIceProjectPage() {
  return (
    <>
      <Header />
      
      <main className="pt-20 bg-white text-gray-800">
        {/* Hero Section */}
        <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center text-center text-white">
          <Image
            src="/images/iceberg.png"
            alt="A Frozen Fantasy"
            fill
            className="object-cover object-center brightness-50"
          />
          <div className="relative z-10 max-w-4xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              <h1 
                style={{ color: '#FFED4F' }} 
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-wider text-shadow-lg"
              >
                The Ice Project: A Frozen Fantasy
              </h1>
              <p className="mt-6 text-xl text-gray-200 max-w-2xl mx-auto text-shadow">
                Discover a breathtaking arctic oasis where art, temperature, and taste collide.
              </p>
            </motion.div>
          </div>
        </section>

        {/* The Vision Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Vision</h2>
              <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                The Ice Project was born from a simple yet ambitious idea: to create a truly immersive sensory experience that transports guests to a pristine, frozen wonderland. It's more than just a bar; it's an ever-changing gallery of ice art, a feat of engineering, and a unique social destination.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                We blend the raw beauty of ice with cutting-edge design and warm hospitality to create unforgettable moments. Our mission is to offer a chill escape from the everyday, where every detail is crafted to perfection.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full h-80 relative"
            >
              <Image
                src="/images/iceberg.png" 
                alt="Ice artists carving a sculpture"
                fill
                className="rounded-2xl shadow-xl object-cover"
              />
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What to Expect</h2>
                    <p className="text-lg text-gray-600">Your unique arctic experience includes:</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="flex items-start space-x-3"
                        >
                            <CheckCircle className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                            <span className="text-lg text-gray-700">{feature}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>

        {/* Gallery Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Step Inside</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {galleryImages.map((image, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="w-full h-64 relative rounded-xl overflow-hidden shadow-lg"
                >
                  <Image src={image.src} alt={image.alt} fill className="object-cover hover:scale-105 transition-transform duration-300" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-20" style={{ backgroundColor: '#2147F3' }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 style={{ color: '#FFED4F' }} className="text-3xl font-extrabold tracking-tight sm:text-4xl text-shadow-lg">
                    Ready for a Chilling Thrill?
                </h2>
                <p style={{ color: '#FFED4F' }} className="mt-4 text-xl text-shadow">
                    Book your visit to the Ice Project and step into a world of frozen wonder.
                </p>
                <div className="mt-8">
                    <Link
                        href="/experience/ice-bar-adventure" // Link to a specific booking page
                        className="inline-block font-bold py-4 px-10 rounded-full text-lg hover:opacity-90 transform hover:scale-105 transition-all duration-300 ease-in-out shadow-lg"
                        style={{ color: '#2147F3', backgroundColor: '#FFED4F' }}
                    >
                        Book Your Experience
                    </Link>
                </div>
            </div>
        </section>
      </main>

      <Footer />
      <style jsx global>{`
        .text-shadow { text-shadow: 1px 1px 3px rgb(0 0 0 / 0.7); }
        .text-shadow-lg { text-shadow: 2px 2px 5px rgb(0 0 0 / 0.8); }
      `}</style>
    </>
  );
}
