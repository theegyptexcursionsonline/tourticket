import React from 'react';
import Image from 'next/image';

const certifications = [
  { name: 'ISO 9001:2015', description: 'Quality Management' },
  { name: 'ISO 14001:2015', description: 'Environmental Management' },
  { name: 'ISO 45001:2018', description: 'Occupational Health & Safety' },
];

const QualitySection = () => {
  return (
    <section className="bg-[#F2F2F2] py-24 sm:py-32">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 items-center gap-x-16 gap-y-16 lg:grid-cols-2">
          
          {/* Left Column: Image */}
          <div className="relative aspect-[4/3] h-full w-full">
            <Image 
              src="/image6.jpeg" 
              alt="A quality inspector reviewing a finished component at M.K. Industries" 
              fill 
              className="object-contain" // Changed from object-cover to object-contain
            />
          </div>

          {/* Right Column: Text Content */}
          <div>
            <h2 className="text-base font-semibold leading-7 text-blue-700">Our Quality Commitment</h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Certified Excellence in Every Component
            </p>
            <blockquote className="mt-6 border-l-4 border-blue-700 pl-6 text-lg italic leading-8 text-gray-700">
              "We are dedicated to proactively identifying and fulfilling our customers' needs by delivering high-quality products promptly and at competitive prices, with the valuable contributions of each team member."
            </blockquote>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Our quality policy is the cornerstone of our operation. As a proud multi-ISO certified company, we relentlessly pursue our commitment to quality, ensuring every product is a benchmark of reliability and excellence.
            </p>

            {/* Certifications List */}
            <div className="mt-10">
                <h3 className="text-xl font-bold text-gray-900">Our Certifications:</h3>
                <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {certifications.map((cert) => (
                        <div key={cert.name} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <dt className="truncate text-lg font-semibold text-blue-800">{cert.name}</dt>
                            <dd className="text-sm text-gray-500">{cert.description}</dd>
                        </div>
                    ))}
                </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QualitySection;