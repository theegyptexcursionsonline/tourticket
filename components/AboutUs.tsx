import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export default function WhyBookWithUs() {
  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Text Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
              Why book with Egypt Excursions Online?
            </h2>
            <p className="text-lg text-gray-500 mb-8">
              With over 35 years of experience, we are the travel experts.
            </p>

            <ul className="space-y-4 mb-10">
              <li className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <span className="text-gray-700">
                  Official partner of top museums & attractions
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <span className="text-gray-700">
                  Best price guaranteed & simple booking process
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <span className="text-gray-700">
                  No printer needed! Show your tickets on your smartphone
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <span className="text-gray-700">
                  Cancel for free up to 8 hours in advance
                </span>
              </li>
            </ul>
            
            <button className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold py-3 px-6 rounded-md hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg">
              <span>More about us</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right Column: Image */}
          <div className="flex justify-center items-center">
            {/* IMPORTANT: Replace the `src` with the path to your image in the /public directory */}
            <Image
              src="/12.png" // <-- Replace this with your image path
              alt="A scenic view of a popular travel destination"
              width={500}
              height={500}
              className="rounded-lg shadow-xl object-cover w-full max-w-md lg:max-w-full h-auto aspect-square"
            />
          </div>
        </div>
      </div>
    </section>
  );
}