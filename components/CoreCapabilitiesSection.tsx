import React from 'react';
import Image from 'next/image';

// A simple checkmark icon for the list items
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 text-blue-700">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
    </svg>
);

const CoreCapabilitiesSection = () => {
    return (
        <section className="bg-white py-24 sm:py-32">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 items-center gap-x-16 gap-y-16 lg:grid-cols-2">
                    {/* Left Column: Text Content */}
                    <div>
                        <h2 className="text-base font-semibold leading-7 text-blue-700">What We Do</h2>
                        <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                            Our Core Fabrication Capabilities
                        </p>
                        <p className="mt-6 text-lg leading-8 text-gray-600">
                            From raw steel to robust, mission-critical components, our expertise covers the full spectrum of heavy industrial fabrication. We pride ourselves on precision, strength, and durability.
                        </p>

                        {/* List of Services */}
                        <ul className="mt-10 space-y-5 text-lg">
                            <li className="flex items-start gap-x-3">
                                <div className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-100">
                                    <CheckIcon />
                                </div>
                                <span>
                                    <strong className="font-semibold text-gray-900">Heavy Fabrication.</strong> Shaping metal with expert precision to meet intricate design requirements for industrial applications.
                                </span>
                            </li>
                            <li className="flex items-start gap-x-3">
                                <div className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-100">
                                    <CheckIcon />
                                </div>
                                <span>
                                    <strong className="font-semibold text-gray-900">Transformer Tank Specialization.</strong> Our primary expertise lies in building high-quality, durable tanks for the energy sector.
                                </span>
                            </li>
                            <li className="flex items-start gap-x-3">
                                <div className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-100">
                                    <CheckIcon />
                                </div>
                                <span>
                                    <strong className="font-semibold text-gray-900">Core Frames & Pressure Vessels.</strong> Manufacturing structural core frames and certified high/low-pressure vessels built to last.
                                </span>
                            </li>
                        </ul>
                        
                        {/* Call to Action Button */}
                        <div className="mt-12">
                            <a href="/contact" className="inline-block rounded-md bg-blue-800 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                                Request a Quote
                            </a>
                        </div>
                    </div>

                    {/* Right Column: Image with Custom Frame */}
                    <div className="flex items-center justify-center">
                      <div className="rounded-2xl bg-white p-2.5 shadow-xl ring-1 ring-gray-900/10">
                        <Image 
                            src="/mkimage5.jpeg" // Authentic image from M.K. Industries workshop
                            alt="Fabrication of a large transformer tank at M.K. Industries" 
                            width={800}
                            height={600}
                            className="w-full rounded-lg object-cover"
                        />
                      </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CoreCapabilitiesSection;