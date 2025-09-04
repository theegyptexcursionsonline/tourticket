import AboutUs from "@/components/AboutUs";
import DayTrips from "@/components/DayTrips";
import FAQ from "@/components/FAQ";
import FeaturedTours from "@/components/FeaturedTours";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import IcebarPromo from "@/components/IcebarPromo";
import InterestGrid from "@/components/InterestGrid";
import PopularInterest from "@/components/PopularInterest";
import Reviews from "@/components/Reviews";
import VisitUs from "@/components/VisitUs";
import Destinations from "@/components/Destinations";
import Chatbot from "@/components/Chatbot"; // 1. Import the new Chatbot component

export default function HomePage() {
  return (
    <main>
      <Header />
      <HeroSection />
      <Destinations />
      <IcebarPromo />
      <FeaturedTours />
      <InterestGrid />
      <DayTrips />
      <PopularInterest />
      <AboutUs />
      <Reviews />
      <FAQ />
      <Footer />

      {/* 2. Add the Chatbot component here. It will automatically position itself. */}
      <Chatbot />
    </main>
  );
}