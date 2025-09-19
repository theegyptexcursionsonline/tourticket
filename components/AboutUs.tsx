'use client';

import { ArrowRight, Award, DollarSign, Smartphone, CalendarCheck } from 'lucide-react';
import Image from 'next/image';

export default function WhyBookWithUs() {
  return (
    <section className="bg-slate-50 py-20 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Text Content */}
          <div className="order-2 lg:order-1">
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">
              Why book with Egypt Excursions Online?
            </h2>
            <p className="text-lg text-slate-600 mb-10 max-w-lg">
              With over 35 years of experience, we are the travel experts.
            </p>

            <ul className="space-y-6 mb-10">
              <li className="flex items-start">
                <Award className="w-6 h-6 text-red-600 mr-4 flex-shrink-0" />
                <span className="text-lg font-medium text-slate-800 leading-tight">
                  Official partner of top museums & attractions
                </span>
              </li>
              <li className="flex items-start">
                <DollarSign className="w-6 h-6 text-red-600 mr-4 flex-shrink-0" />
                <span className="text-lg font-medium text-slate-800 leading-tight">
                  Best price guaranteed & simple booking process
                </span>
              </li>
              <li className="flex items-start">
                <Smartphone className="w-6 h-6 text-red-600 mr-4 flex-shrink-0" />
                <span className="text-lg font-medium text-slate-800 leading-tight">
                  No printer needed! Show your tickets on your smartphone
                </span>
              </li>
              <li className="flex items-start">
                <CalendarCheck className="w-6 h-6 text-red-600 mr-4 flex-shrink-0" />
                <span className="text-lg font-medium text-slate-800 leading-tight">
                  Cancel for free up to 8 hours in advance
                </span>
              </li>
            </ul>
            
            <a href="/about" className="inline-flex items-center gap-2 bg-red-600 text-white font-bold py-3.5 px-8 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl group">
              <span>More about us</span>
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>

          {/* Right Column: Image */}
          <div className="order-1 lg:order-2 flex justify-center items-center">
            <div className="relative w-full aspect-square max-w-md lg:max-w-full transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
              <Image
                src="/about.png" // <-- Replace this with your image path
                alt="A scenic view of a popular travel destination"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}