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
    // Section background is now a subtle off-white for a more premium feel.
    <section className="bg-slate-50 py-24 sm:py-32">
      <div className="container mx-auto px-6">
        {/* Main Introduction Text with more impactful heading and refined text */}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-700">Our Commitment</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Precision Fabrication for the Energy Sector
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            As an ISO 9001:2015 certified company, we are dedicated to setting the benchmark for quality and innovation in heavy fabrication, transforming raw materials into robust solutions that power industries forward.
          </p>
        </div>

        {/* 3-Column Feature Section with enhanced card design */}
        <div className="mx-auto mt-16 max-w-7xl sm:mt-20 lg:mt-24">
          <div className="grid grid-cols-1 gap-10 text-center md:grid-cols-3">
            
            {/* Feature 1: Card for Certified Quality */}
            <div className="transform rounded-lg bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-700">
                <CertificateIcon />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">ISO 9001:2015 Certified Quality</h3>
              <p className="text-gray-600">
                Our operations adhere to the highest international standards, ensuring every product consistently exceeds client expectations.
              </p>
            </div>

            {/* Feature 2: Card for High-Capacity Production */}
            <div className="transform rounded-lg bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-700">
                <FactoryIcon />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">High-Capacity Production</h3>
              <p className="text-gray-600">
                With a 30,000 sq. ft. facility and a production capacity of 80-90 tons per month, we handle large-scale projects with unmatched efficiency.
              </p>
            </div>

            {/* Feature 3: Card for Specialized Expertise */}
            <div className="transform rounded-lg bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-700">
                <GearsIcon />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Specialized Expertise</h3>
              <p className="text-gray-600">
                We specialize in manufacturing a diverse range of transformer tanks, expertly crafted for power requirements from 2.5 MVA up to 160 MVA.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default IntroductionSection;