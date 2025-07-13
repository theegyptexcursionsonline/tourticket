import React from 'react';
import Image from 'next/image'; // Import the next/image component

const FacilitiesSection = () => {
  return (
    <div className="bg-[#F2F2F2]">
      <div className="container mx-auto px-6 py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-x-16 gap-y-16 lg:grid-cols-2">
          
          {/* Left Column: Text Content and Stats */}
          <div>
            <h2 className="text-base font-semibold leading-7 text-blue-700">Our Infrastructure</h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Built for Scale, Engineered for Precision
            </p>
            <p className="mt-6 text-xl leading-8 text-gray-600">
              Our state-of-the-art manufacturing facility is the foundation of our success, enabling us to handle projects of significant size and complexity with unmatched efficiency and quality control.
            </p>
            
            {/* Key Statistics Grid */}
            <dl className="mt-10 grid grid-cols-1 gap-8 text-base leading-7 text-gray-600 sm:grid-cols-2">
              <div className="flex flex-col gap-y-2">
                <dt className="font-semibold text-gray-900">30,000 sq. ft. Facility</dt>
                <dd>A vast, covered operational area designed for large-scale fabrication and streamlined workflows.</dd>
              </div>
              <div className="flex flex-col gap-y-2">
                <dt className="font-semibold text-gray-900">90-Ton Monthly Capacity</dt>
                <dd>A robust work volume capacity that ensures we meet the demands of high-volume projects.</dd>
              </div>
              <div className="flex flex-col gap-y-2">
                <dt className="font-semibold text-gray-900">Heavy Lifting Power</dt>
                <dd>Equipped with multiple high-capacity EOT cranes (up to 15 tons) to handle heavy components with ease.</dd>
              </div>
              <div className="flex flex-col gap-y-2">
                <dt className="font-semibold text-gray-900">Spotless Safety Record</dt>
                <dd>Our commitment to safety is absolute, reflected in our record of zero workplace accidents.</dd>
              </div>
            </dl>
          </div>

          {/* Right Column: Image - Corrected Implementation */}
          <div className="flex items-center justify-center">
            {/* The Image component now uses width and height props, which is more stable */}
            <Image
              src="/image2.jpeg" // Replace with your authentic facility image
              alt="Wide view of the M.K. Industries manufacturing facility with cranes and equipment."
              width={1000} // Set a base width for the image source
              height={750} // Set a base height for the image source
              className="h-auto w-full" // Responsive classes to make it scale correctly
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacilitiesSection;