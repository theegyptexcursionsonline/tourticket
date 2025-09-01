import { ArrowRight } from 'lucide-react';

export default function AboutUs() {
    return (
        <section className="bg-slate-50 py-16">
            <div className="container mx-auto px-4">
                <div className="bg-white p-8 md:p-12 rounded-lg shadow-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                        {/* Left Column: About Text */}
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-800 mb-4">
                                ABOUT TOURS&TICKETS
                            </h2>
                            <p className="text-slate-600 mb-6 leading-relaxed">
                                Tours & Tickets grew to adulthood in Amsterdam, with over 35 years of experience as a tour operator and guide to visitors of the city. Now it is time to expand beyond the capital of the Netherlands, to other amazing and not-to-miss European cities.
                            </p>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                We are here to take you on the best excursions and to the best attractions in Amsterdam, Berlin, Copenhagen, Rotterdam and Stockholm. We offer various tickets for museums, attractions and all kinds of boat tours. We also offer an exclusive range of combination deals, to give our guests the best discounts.
                            </p>
                            <button className="inline-flex items-center gap-2 bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-all duration-300 transform hover:scale-105">
                                <span>ABOUT US</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Right Column: Placeholder/Image */}
                        <div className="bg-slate-100 rounded-lg min-h-[300px] flex items-center justify-center">
                           {/* You can place an image here */}
                            <p className="text-slate-500 font-semibold">Image Placeholder</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
