import HeroSection from '@/components/HeroSection';
import IntroductionSection from '@/components/IntroductionSection';
import CoreCapabilitiesSection from '@/components/CoreCapabilitiesSection';
import ProcessSection from '@/components/ProcessSection';
import FacilitiesSection from '@/components/FacilitiesSection';
import ClientsSection from '@/components/ClientsSection'; // <-- Add this import
import FinalCTASection from '@/components/FinalCTASection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <IntroductionSection />
      <CoreCapabilitiesSection />
      <ProcessSection />
      <FacilitiesSection />
      <FinalCTASection />
            <ClientsSection /> {/* <-- Add this component */}

      <Footer />
    </main>
  );
}