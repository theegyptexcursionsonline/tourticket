'use client';

import React from "react";
import { Menu, Search, ChevronDown, Calendar, ArrowRight } from "lucide-react";
import Image from "next/image";

// Import reusable components
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// =================================================================
// --- DARK HERO SECTION COMPONENT ---
// Reusing this component to maintain consistent styling.
// =================================================================
function DarkHero() {
  return (
    <div className="relative h-96 bg-slate-900 flex items-center justify-center text-white text-center px-4 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <Image
          src="/images/dark-hero-bg.jpg" // Placeholder for a dark, stylish background image
          alt="Abstract dark background"
          layout="fill"
          objectFit="cover"
        />
      </div>
      <div className="relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
          Your Best Travel Buddy
        </h1>
        <p className="mt-4 text-lg sm:text-xl max-w-2xl mx-auto opacity-80">
          Discover hidden gems and unforgettable experiences with our expert guidance.
        </p>
      </div>
    </div>
  );
}

// =================================================================
// --- BLOG PAGE COMPONENT ---
// =================================================================
export default function BlogPage() {
  const blogPosts = [
    {
      image: "/images/blog-1.jpg", // Placeholder
      category: "Culture",
      date: "Aug 25, 2025",
      title: "Exploring the Ancient Wonders of Luxor",
      excerpt: "Step back in time as we explore the magnificent temples and tombs of ancient Egypt's capital. From the Valley of the Kings to the Karnak Temple, Luxor is a treasure trove of history.",
      link: "#"
    },
    {
      image: "/images/blog-2.jpg", // Placeholder
      category: "Adventure",
      date: "Sep 1, 2025",
      title: "10 Thrilling Desert Safaris in the Sahara",
      excerpt: "Feel the adrenaline rush as you navigate the vast, golden dunes of the Sahara. Our guide to the top 10 desert safaris will help you choose the adventure of a lifetime.",
      link: "#"
    },
    {
      image: "/images/blog-3.jpg", // Placeholder
      category: "Food",
      date: "Sep 3, 2025",
      title: "A Taste of Cairo: A Street Food Guide",
      excerpt: "Cairo's vibrant streets are a culinary paradise. Join us on a delicious journey to discover the best street food, from Koshary to Hawawshi, that the city has to offer.",
      link: "#"
    },
    {
      image: "/images/blog-4.jpg", // Placeholder
      category: "Travel Tips",
      date: "Sep 2, 2025",
      title: "Your Ultimate Guide to Solo Travel in Egypt",
      excerpt: "Thinking of exploring Egypt on your own? We've compiled essential tips and a step-by-step guide to ensure your solo journey is safe, fun, and memorable.",
      link: "#"
    },
    {
      image: "/images/blog-5.jpg", // Placeholder
      category: "History",
      date: "Aug 30, 2025",
      title: "The Secrets of the Pyramids: A Deeper Look",
      excerpt: "Beyond the Giza Plateau, the pyramids hold countless mysteries. Our in-depth article uncovers the lesser-known secrets and fascinating facts about these iconic structures.",
      link: "#"
    },
    {
      image: "/images/blog-6.jpg", // Placeholder
      category: "Nature",
      date: "Aug 28, 2025",
      title: "Discovering the Oases of the Western Desert",
      excerpt: "Escape the bustling cities and find tranquility in Egypt's stunning oases. We guide you through Siwa, Bahariya, and Farafra—natural havens in the heart of the desert.",
      link: "#"
    }
  ];

  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <DarkHero />
      <Header />

      <main className="container mx-auto px-4 py-16 flex-grow">
        <div className="max-w-6xl mx-auto">
          <section className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">
              Our Travel Blog
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Read our latest articles and get inspired for your next Egyptian adventure.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post, index) => (
              <a 
                key={index}
                href={post.link} 
                className="block bg-slate-50 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 group"
              >
                <div className="relative h-48 w-full">
                  <Image 
                    src={post.image}
                    alt={post.title}
                    layout="fill"
                    objectFit="cover"
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <span className="font-semibold text-red-600 uppercase tracking-wider">{post.category}</span>
                    <span className="text-xs">·</span>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{post.date}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-red-600 transition-colors mb-2">
                    {post.title}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-2 font-semibold text-slate-800 group-hover:text-red-600 transition-colors">
                    <span>Read more</span>
                    <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </a>
            ))}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}