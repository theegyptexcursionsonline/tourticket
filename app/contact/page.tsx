// app/contact/page.tsx

import React from 'react';
import HeroSection from '@/components/HeroSection'; // Assuming you want the header
import Footer from '@/components/Footer'; // Assuming you want the footer

const ContactPage = () => {
  return (
    <>
      <HeroSection /> {/* Renders the header and hero which contains the nav */}
      <div className="bg-white text-gray-800 font-sans">
        <div className="bg-gray-100 py-20">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Get in Touch</h1>
            <p className="mt-4 text-lg text-gray-600">
              We'd love to hear from you. Whether you have a question about our products, services, or anything else, our team is ready to answer all your questions.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            <div className="bg-gray-50 p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
              <form action="#" method="POST">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input type="text" name="first-name" id="first-name" autoComplete="given-name" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input type="text" name="last-name" id="last-name" autoComplete="family-name" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="mb-6">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input type="email" name="email" id="email" autoComplete="email" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
                </div>
                <div className="mb-6">
                  <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input type="tel" name="phone-number" id="phone-number" autoComplete="tel" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="+91 9893030763" />
                </div>
                <div className="mb-6">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea id="message" name="message" rows={5} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Briefly describe your inquiry..."></textarea>
                </div>
                <div>
                  <button type="submit" className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-md transition-transform transform hover:scale-105">
                    Send Message
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-8">
                <div className="bg-gray-50 p-8 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
                    <div className="space-y-4">
                        <div className="flex items-start">
                            <svg className="h-6 w-6 text-blue-800 mr-4 flex-shrink-0 mt-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>18-A, Industrial Area, Sector E, Govindpura, Bhopal (MP) - 462023</span>
                        </div>
                        <div className="flex items-center">
                            <svg className="h-6 w-6 text-blue-800 mr-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>+91 9893030763, 7987647263</span>
                        </div>
                        <div className="flex items-center">
                            <svg className="h-6 w-6 text-blue-800 mr-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <a href="mailto:mkindustries2021@yahoo.com" className="hover:underline">mkindustries2021@yahoo.com</a>
                        </div>
                    </div>
                </div>
                
                <div className="rounded-lg shadow-lg overflow-hidden">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3666.191253018284!2d77.46845357510108!3d23.23594817899701!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x397c43daaaaaaaab%3A0x2bbb37add9993355!2sM.K.%20Industries!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                        width="100%"
                        height="350"
                        style={{ border: 0 }}
                        allowFullScreen={true}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="M.K. Industries Location"
                    ></iframe>
                </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ContactPage;