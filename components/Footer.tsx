import React from 'react';

const Footer = () => {
  return (
    <footer className="relative">
      <div className="bg-[#f9fafb] pt-12">
        <div className="container mx-auto px-8">
          <div className="flex items-center justify-between pb-12">
            <h1 className="text-4xl font-bold tracking-wider text-gray-800">M.K. INDUSTRIES</h1>
            <a href="#" className="flex items-center rounded bg-blue-800 px-8 py-4 text-white transition-colors hover:bg-blue-900">
              <span className="text-base font-medium">Contact Us</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="ml-2 h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
              </svg>
            </a>
          </div>
          <hr className="border-gray-200" />
        </div>
      </div>

      <div className="bg-[#f9fafb]">
        <div className="container mx-auto px-8 pt-12 pb-20">
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 text-[#374151] md:grid-cols-2 lg:grid-cols-4">
            {/* Quick Links */}
            <div>
              <h3 className="mb-4 text-lg font-bold text-black">Quick Links</h3>
              <ul className="space-y-3">
                <li><a href="#" className="font-bold text-blue-700 hover:text-black">Home</a></li>
                <li><a href="#" className="hover:text-black">About</a></li>
                <li><a href="#" className="hover:text-black">Our Products</a></li>
                <li><a href="#" className="hover:text-black">Quality</a></li>
                <li><a href="#" className="hover:text-black">Contact</a></li>
                <li><a href="#" className="hover:text-black">Careers</a></li>
              </ul>
            </div>

            {/* Our Products */}
            <div>
              <h3 className="mb-4 text-lg font-bold text-black">Our Products</h3>
              <ul className="space-y-3">
                <li>Transformer Tanks</li>
                <li>Core Frame & Clamps</li>
                <li>High & Low Pressure Vessels</li>
                <li>Heavy and Light Steel Structure</li>
              </ul>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="mb-4 text-lg font-bold text-black">Contact Information</h3>
              <div className="space-y-3">
                <p><strong>Address:</strong><br />18-A, Industrial Area, Sector E, Govindpura, Bhopal (MP)- 462023</p>
                <p><strong>Phone:</strong><br />9893030763</p>
                <p><strong>Email:</strong><br /><a href="mailto:mkindustries2021@yahoo.com" className="text-blue-700 hover:underline">mkindustries2021@yahoo.com</a></p>
              </div>
            </div>
            
            {/* Key Contacts */}
            <div>
              <h3 className="mb-4 text-lg font-bold text-black">Key Contacts</h3>
              <div className="space-y-3">
                <p>
                  <strong>Mrs. Pooja Sonwane</strong>
                  <br />
                  <span className="text-sm text-gray-500">Proprietor / Owner</span>
                </p>
                <p>
                  <strong>Mr. Manoj Sonwane</strong>
                  <br />
                  <span className="text-sm text-gray-500">Director</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#111827] text-gray-300">
        <div className="container mx-auto px-8 py-5 text-sm">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="flex flex-col items-center space-y-2 md:flex-row md:space-y-0 md:space-x-4">
              <p>&copy; {new Date().getFullYear()} M.K. Industries. All Rights Reserved.</p>
            </div>
            <div className="mt-4 flex items-center space-x-6 md:mt-0">
              <div className="flex items-center space-x-4">
                <a href="#" className="hover:text-white">Privacy</a>
                <a href="#" className="hover:text-white">Terms of Use</a>
                <a href="#" className="hover:text-white">Site Map</a>
              </div>
              <div className="flex items-center space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;