import React from 'react';

// --- Type Definition for Feature Data ---
type Feature = {
  icon: React.ElementType;
  title: string;
  description: string;
  iconBgColor: string;
  iconHoverColor: string;
};

// --- SVG Icon Components ---
const CertificateIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FactoryIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18h16.5M4.5 21V3m15 18V3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5h13.5M5.25 12h13.5m-13.5 4.5h13.5" />
  </svg>
);

const GearsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.026 1.11-1.11a10.523 10.523 0 012.094 0c.55.084 1.02.568 1.11 1.11l.092.551a1.5 1.5 0 002.33 1.082l.495-.285a10.5 10.5 0 011.82 1.82l-.285.495a1.5 1.5 0 001.082 2.33l.551.092c.542.09 1.026.56 1.11 1.11a10.523 10.523 0 010 2.094c-.084.55-.568 1.02-1.11 1.11l-.551.092a1.5 1.5 0 00-1.082 2.33l.285.495a10.5 10.5 0 01-1.82 1.82l-.495-.285a1.5 1.5 0 00-2.33 1.082l-.092.551c-.09.542-.56 1.026-1.11 1.11a10.523 10.523 0 01-2.094 0c-.55-.084-1.02-.568-1.11-1.11l-.092-.551a1.5 1.5 0 00-2.33-1.082l-.495.285a10.5 10.5 0 01-1.82-1.82l.285-.495a1.5 1.5 0 00-1.082-2.33l-.551-.092a1.05 1.05 0 01-1.11-1.11 10.523 10.523 0 010-2.094c.084-.55.568-1.02 1.11-1.11l.551-.092a1.5 1.5 0 001.082-2.33l-.285-.495a10.5 10.5 0 011.82-1.82l.495.285a1.5 1.5 0 002.33-1.082l.092-.551z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);


// --- Data for Feature Cards ---
const features: Feature[] = [
  {
    icon: CertificateIcon,
    title: 'ISO 9001:2015 Certified Quality',
    description: 'Our operations adhere to the highest international standards, ensuring every product consistently exceeds client expectations.',
    iconBgColor: 'bg-blue-600',
    iconHoverColor: 'group-hover:bg-blue-700',
  },
  {
    icon: FactoryIcon,
    title: 'High-Capacity Production',
    description: 'With a 30,000 sq. ft. facility and 80-90 ton monthly capacity, we handle large-scale projects with unmatched efficiency.',
    iconBgColor: 'bg-green-600',
    iconHoverColor: 'group-hover:bg-green-700',
  },
  {
    icon: GearsIcon,
    title: 'Specialized Expertise',
    description: 'We specialize in manufacturing a diverse range of transformer tanks, expertly crafted for power from 2.5 MVA up to 160 MVA.',
    iconBgColor: 'bg-amber-500',
    iconHoverColor: 'group-hover:bg-amber-600',
  },
];

// --- FeatureCard Sub-component ---
const FeatureCard = ({ feature, index }: { feature: Feature; index: number }) => (
  <div className="relative p-8 transition-all duration-300 bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-2 group">
    <div className={`absolute top-0 right-8 transform -translate-y-1/2 flex items-center justify-center h-16 w-16 rounded-full ${feature.iconBgColor} ${feature.iconHoverColor} transition-colors duration-300 shadow-lg`}>
      <feature.icon className="h-8 w-8 text-white" />
    </div>
    <div className="pt-8">
      <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
        {feature.title}
      </h3>
      <p className="text-gray-600 leading-relaxed">
        {feature.description}
      </p>
    </div>
  </div>
);


// --- Main IntroductionSection Component ---
const IntroductionSection = () => {
  return (
    <section className="bg-gray-50 py-24 sm:py-32">
      <div className="container mx-auto px-6 lg:px-8">
        {/* Main Introduction Text */}
        <div className="mx-auto max-w-4xl text-center mb-20">
          <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase">Our Commitment</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl [text-wrap:balance]">
            Precision Fabrication for the Energy Sector
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 [text-wrap:balance]">
            As an ISO 9001:2015 certified company, we are dedicated to setting the benchmark for quality and innovation in heavy fabrication, transforming raw materials into robust solutions that power industries forward.
          </p>
        </div>

        {/* Features Grid with Timeline */}
        <div className="relative mx-auto max-w-7xl">
          {/* Timeline Connector - visible on md and up */}
          <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-gray-200" aria-hidden="true"></div>
          
          <div className="grid grid-cols-1 gap-16 md:grid-cols-3 md:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="relative">
                {/* Timeline Dot - visible on md and up */}
                <div className="hidden md:flex absolute top-8 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center w-5 h-5 rounded-full bg-gray-200">
                   <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                </div>
                <FeatureCard feature={feature} index={index} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntroductionSection;