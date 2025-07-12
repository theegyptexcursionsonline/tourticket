import React from 'react';

const FinalCTASection = () => {
  return (
    // Using a subtle gradient for a more premium background
    <section className="bg-gradient-to-br from-gray-50 to-slate-100 py-16">
      <div className="container mx-auto px-6">
        <div className="relative isolate overflow-hidden bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-24 shadow-2xl sm:rounded-3xl sm:px-24 xl:py-32">
          
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 items-center gap-x-16 gap-y-16 lg:grid-cols-2">

            {/* Left Column: Headline and CTA */}
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Your Partner in Engineering & Fabrication Excellence.
              </h2>
              <p className="mt-6 text-lg leading-8 text-indigo-100">
                Ready to bring your next project to life? Our team is equipped with the expertise and infrastructure to handle your most demanding fabrication needs. Let's build the future together.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
                <a
                  href="#"
                  className="rounded-md bg-white px-6 py-3 text-base font-semibold text-blue-800 shadow-sm transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Get Your Project Started
                </a>
              </div>
            </div>

            {/* Right Column: Social Proof / Client List */}
            <div className="flex items-center justify-center">
                <div className="w-full max-w-md rounded-lg bg-white/5 p-8 text-center backdrop-blur-md ring-1 ring-white/10">
                    <h3 className="text-base font-semibold text-white">
                        Trusted By Industry Leaders
                    </h3>
                    <div className="mt-6 flow-root">
                        {/* The client list is now clean, without any citation markers */}
                        <div className="-mt-4 grid grid-cols-2 gap-y-4 text-sm font-medium text-indigo-200">
                            <p>Crompton Greaves</p>
                            <p>BHEL (Bhopal & Jhansi)</p>
                            <p>TBEA Energy</p>
                            <p>Tesla Transformers Ltd.</p>
                            <p>Shirdi Sai Electricals</p>
                            <p>ECE Industries Ltd</p>
                        </div>
                    </div>
                </div>
            </div>

          </div>

          {/* Simplified background decorative element */}
          <div
            className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 1024 1024"
              className="absolute left-1/2 top-1/2 -h-[64rem] -w-[64rem] -translate-x-1/2 -translate-y-1/2 text-blue-700/50"
            >
              <circle cx={512} cy={512} r={512} fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;