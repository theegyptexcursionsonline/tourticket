import React from 'react';
import Image from 'next/image';

const ExperienceSection = () => {
  return (
    // Section background color matches the light gray from the reference
    <section className="bg-slate-100 py-24 sm:py-32">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          
          {/* Left Column: Image with Stats Overlay */}
          <div className="relative w-full lg:w-1/2">
            
            {/* Custom Frame for the Image */}
            <div className="bg-white p-2.5 rounded-2xl shadow-xl ring-1 ring-gray-900/5">
              <div className="aspect-[4/3] relative rounded-lg overflow-hidden">
                <Image
                  src="/mkimage.jpeg" // Replace with your factory/machinery image
                  alt="State-of-the-art heavy fabrication machinery at M.K. Industries"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/10"></div>
              </div>
            </div>

            {/* Stats Box */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6 sm:p-8 text-center w-52 sm:w-60">
                <p className="text-5xl sm:text-6xl font-bold text-green-600">
                  25+
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Years of Combined Experience
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Text Content */}
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <p className="text-base font-semibold uppercase tracking-wider text-gray-500">Our Expertise</p>
            <h2 className="mt-4 text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
              Leading Heavy Fabrication for <span className="text-green-600">Industry's Boldest Innovations</span>
            </h2>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              Partner with us to bring your most ambitious projects to life. Our extensive experience and cutting-edge facilities ensure precision, quality, and durability every step of the way.
            </p>
            <div className="mt-10">
              <a 
                href="/contact" 
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-md shadow-lg transition-transform transform hover:scale-105 duration-300"
              >
                Get a Quote
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;