'use client';

import { ArrowRight } from 'lucide-react';
import Link from "next/link";

export default function IcebarPromo() {
  return (
    <section style={{ backgroundColor: '#2147F3' }} className="relative py-24 sm:py-32">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/iceberg.png"
          alt="A vibrant, blue-lit bar interior suggesting an ice theme"
          className="w-full h-full object-cover opacity-30"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-3xl ml-auto text-right">
          <h2 style={{ color: '#FFED4F' }} className="text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-wider text-shadow-lg">
            A Frozen Fantasy
          </h2>
          <p style={{ color: '#FFED4F' }} className="mt-6 text-lg md:text-xl max-w-2xl ml-auto text-shadow leading-relaxed">
            Step into a world of frost and wonder. Our bar, carved from pure ice, offers a unique arctic experience where you can sip on signature cocktails in a truly chilling atmosphere.
          </p>
          <div className="mt-10">
          <Link 
  href="/IcebarPromo" 
  className="inline-block font-bold py-3 px-8 rounded-full text-lg hover:opacity-90 transform hover:scale-105 transition-all duration-300 ease-in-out shadow-lg" 
  style={{ color: '#2147F3', backgroundColor: '#FFED4F' }}
>
  ABOUT PRODUCT
</Link>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .text-shadow { text-shadow: 1px 1px 3px rgb(0 0 0 / 0.7); }
        .text-shadow-lg { text-shadow: 2px 2px 5px rgb(0 0 0 / 0.8); }
      `}</style>
    </section>
  );
}