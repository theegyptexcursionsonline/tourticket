import React from 'react';

// Icons remain the same, but they will be presented in a more polished way.
const CertificateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-white">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
  
const FactoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-white">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6M9 11.25h6M9 15.75h6" />
    </svg>
);
  
const GearsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-white">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5" />
    </svg>
);

const IntroductionSection = () => {
  return (
    <section className="bg-slate-50 py-24 sm:py-32">
      <div className="container mx-auto px-6">
        {/* Main Introduction Text */}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-700">Our Commitment</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Precision Fabrication for the Energy Sector
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            As an ISO 9001:2015 certified company, we are dedicated to setting the benchmark for quality and innovation in heavy fabrication, transforming raw materials into robust solutions that power industries forward.
          </p>
        </div>

        {/* Connected Cards Layout */}
        <div className="mx-auto mt-16 max-w-7xl sm:mt-20 lg:mt-24">
          <div className="relative grid grid-cols-1 gap-0 md:grid-cols-3">
            
            {/* Connecting Lines - Hidden on mobile, visible on desktop */}
            <div className="absolute inset-0 hidden md:block">
              {/* Horizontal line connecting all cards */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 transform -translate-y-1/2"></div>
              {/* Vertical connector dots */}
              <div className="absolute top-1/2 left-1/3 w-3 h-3 bg-blue-700 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute top-1/2 left-2/3 w-3 h-3 bg-blue-700 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>

            {/* Card 1: ISO Certification */}
            <div className="relative bg-white border border-gray-200 p-8 md:p-10 transition-all duration-300 hover:shadow-lg group">
              {/* Top Icon */}
              <div className="flex justify-end mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-700 group-hover:bg-blue-800 transition-colors duration-300">
                  <CertificateIcon />
                </div>
              </div>
              
              {/* Content */}
              <div className="text-left">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                  ISO 9001:2015 Certified Quality
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Our operations adhere to the highest international standards, ensuring every product consistently exceeds client expectations.
                </p>
              </div>
            </div>

            {/* Card 2: High-Capacity Production */}
            <div className="relative bg-white border-l-0 border-r-0 border-t border-b border-gray-200 md:border-l md:border-r md:border-t md:border-b p-8 md:p-10 transition-all duration-300 hover:shadow-lg group">
              {/* Top Icon */}
              <div className="flex justify-end mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-700 group-hover:bg-green-800 transition-colors duration-300">
                  <FactoryIcon />
                </div>
              </div>
              
              {/* Content */}
              <div className="text-left">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                  High-Capacity Production
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  With a 30,000 sq. ft. facility and a production capacity of 80-90 tons per month, we handle large-scale projects with unmatched efficiency.
                </p>
              </div>
            </div>

            {/* Card 3: Specialized Expertise */}
            <div className="relative bg-white border border-gray-200 p-8 md:p-10 transition-all duration-300 hover:shadow-lg group">
              {/* Top Icon */}
              <div className="flex justify-end mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-600 group-hover:bg-yellow-700 transition-colors duration-300">
                  <GearsIcon />
                </div>
              </div>
              
              {/* Content */}
              <div className="text-left">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
                  Specialized Expertise
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  We specialize in manufacturing a diverse range of transformer tanks, expertly crafted for power requirements from 2.5 MVA up to 160 MVA.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default IntroductionSection;