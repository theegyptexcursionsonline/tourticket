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

export default function HomePage() {
  return (
    <main>
      <Header />
      <HeroSection />
      <Destinations />
      <IcebarPromo />
      <FeaturedTours />
      <InterestGrid />
      <PopularInterest />
      <Reviews />
      <DayTrips />
      <AboutUs />
      <FAQ />
      <VisitUs />
      <Footer />
    </main>
  );
}
