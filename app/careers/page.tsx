'use client';

import React from "react";
import { Menu, Search, ChevronDown, MapPin, Briefcase } from "lucide-react";
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
// --- CAREERS PAGE COMPONENT ---
// =================================================================
export default function CareersPage() {
  const jobOpenings = [
    {
      title: "Senior Travel Consultant",
      location: "Cairo, Egypt",
      type: "Full-time",
      description: "As a Senior Travel Consultant, you will provide exceptional service and expert advice to our clients, helping them plan and book their dream excursions across Egypt.",
      link: "#"
    },
    {
      title: "Digital Marketing Specialist",
      location: "Remote",
      type: "Full-time",
      description: "You will be responsible for developing and executing our digital marketing campaigns, managing social media channels, and analyzing performance to drive growth.",
      link: "#"
    },
    {
      title: "Customer Support Agent",
      location: "Luxor, Egypt",
      type: "Full-time",
      description: "Join our friendly customer support team to assist clients with bookings, inquiries, and provide solutions to ensure a smooth and enjoyable travel experience.",
      link: "#"
    },
    {
      title: "Web Developer",
      location: "Remote",
      type: "Full-time",
      description: "We are seeking a talented Web Developer to help build and maintain our high-performance e-commerce platform. Strong skills in Next.js and Tailwind CSS are a plus.",
      link: "#"
    }
  ];

  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <DarkHero />
      <Header />

      <main className="container mx-auto px-4 py-16 flex-grow">
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">
              Join Our Team
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Are you passionate about travel and creating unforgettable experiences? We're a team of dedicated experts committed to providing the best of Egypt to the world.
            </p>
          </section>
          
          <section className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 text-center md:text-left">
              Current Openings
            </h2>
            <div className="space-y-6">
              {jobOpenings.map((job, index) => (
                <div 
                  key={index}
                  className="bg-slate-50 p-6 rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{job.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase size={16} />
                          <span>{job.type}</span>
                        </div>
                      </div>
                    </div>
                    <a
                      href={job.link}
                      className="inline-flex justify-center items-center h-10 px-6 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors flex-shrink-0"
                    >
                      Apply Now
                    </a>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {job.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="text-center mt-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              Don't see a role for you?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-6">
              We're always looking for talented people to join our team. Send us your resume and tell us how you can help us grow.
            </p>
            <a 
              href="/contact" 
              className="inline-block px-8 py-3 bg-slate-800 text-white rounded-md font-semibold hover:bg-red-600 transition-colors"
            >
              Get in Touch
            </a>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}