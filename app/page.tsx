import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturedTours from "@/components/FeaturedTours";
import IcebarPromo from "@/components/IcebarPromo";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main>
      <Header />
      <HeroSection />
      <FeaturedTours />
      <IcebarPromo />
      {/* You can add the rest of your page content below */}
      <div className="bg-gray-100 p-8 h-[50vh]">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center">More Content Here</h2>
          <p className="text-center mt-4 text-slate-600">
            This is where other page sections will go.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}

