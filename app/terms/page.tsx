'use client';

import React from "react";
import { 
  Menu, Search, ChevronDown
} from "lucide-react";
import Image from "next/image";

// Import reusable components
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// =================================================================
// --- DARK HERO SECTION COMPONENT ---
// Reusing this component to maintain consistent styling.
// =================================================================
function DarkHero() {
  return (
    <div className="relative h-96 bg-slate-900 flex items-center justify-center text-white text-center px-4 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <Image
          src="/images/dark-hero-bg.jpg" // Placeholder for a dark, stylish background image
          alt="Abstract dark background"
          layout="fill"
          objectFit="cover"
        />
      </div>
      <div className="relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
          Your Best Travel Buddy
        </h1>
        <p className="mt-4 text-lg sm:text-xl max-w-2xl mx-auto opacity-80">
          Discover hidden gems and unforgettable experiences with our expert guidance.
        </p>
      </div>
    </div>
  );
}

// =================================================================
// --- TERMS AND CONDITIONS PAGE COMPONENT ---
// =================================================================
export default function TermsAndConditionsPage() {
  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <DarkHero />
      <Header />

      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-2">
              Terms of Service
            </h1>
            <p className="text-slate-600">
              Last updated: 12 November 2025
            </p>
          </section>

          <section className="prose prose-lg mx-auto text-slate-700">
            <div className="mb-6">
              <p className="font-semibold">Company name: Egypt Excursions Online</p>
              <p className="font-semibold">Mother company: Excursions Online LLC FZ</p>
              <p className="font-semibold">Official email: info@egypt-excursionsonline.com</p>
              <p className="font-semibold">Website: https://www.egypt-excursionsonline.com</p>
            </div>

            <h2>1. Introduction</h2>
            <p>
              Welcome to Egypt Excursions Online ("Company", "we", "our", "us"). These Terms of Service ("Terms") govern your access to and use of our website located at www.egypt-excursionsonline.com and any related pages, content, features, or services we operate (collectively, the "Service").
            </p>
            <p>
              Egypt Excursions Online is operated by Excursions Online LLC FZ (the "Mother Company").
            </p>
            <p>
              Our Privacy Policy (published on a separate page) explains how we collect, safeguard, and disclose personal data. These Terms of Service govern your access to and use of the Service. By accessing or using the Service you agree to be bound by these Terms. For privacy matters, please refer to the Privacy Policy. If you have questions, contact us at info@egypt-excursionsonline.com.
            </p>

            <h2>2. Communications</h2>
            <p>
              By using the Service, you agree that we may send you transactional notices and essential service communications. You may opt out of marketing communications at any time by following the unsubscribe link in the message or by emailing info@egypt-excursionsonline.com.
            </p>

            <h2>3. Tour Booking</h2>
            <p>
              If you book any service made available through the Service (a "Tour Booking"), you may be asked to provide information including, without limitation, your payment card details, billing address, hotel/accommodation information, and participant details.
            </p>
            <p>
              You represent and warrant that (i) you have the legal right to use any payment method in connection with a Tour Booking, and (ii) all information you supply is true, correct, and complete. We may use third-party services to process payments and to complete bookings. By submitting your information, you grant us the right to provide that information to third parties subject to our Privacy Policy.
            </p>
            <p>
              We reserve the right to refuse or cancel any booking for reasons including, but not limited to, service availability, pricing or descriptive errors, suspected fraud or unauthorized/illegal activity, or errors in your booking information.
            </p>

            <h3>3.1 Booking Information Accuracy & Modifications</h3>
            <p>
              All information regarding travelers must be true and complete at the time of booking. Requests for modifications/amendments must be sent by email to info@egypt-excursionsonline.com.
            </p>

            <h3>3.2 Ways to Book</h3>
            <p>You may book a tour with us via any of the following:</p>
            <ul>
              <li>Our site: https://www.egypt-excursionsonline.com</li>
              <li>By phone (Egypt) or via email / Online Support Team<br/>EGY: +20 11 42255624</li>
            </ul>

            <h3>3.3 After Payment & Voucher</h3>
            <p>
              After paying the tour cost by credit/debit card, an invoice and trip voucher (including pickup time and other relevant information) will be issued to you via email.
            </p>

            <h3>3.4 Traveler Phone Numbers & Documents</h3>
            <ul>
              <li>Your phone number is required so we can contact you in case of itinerary updates.</li>
              <li>For certain private tours, you may be asked to send a copy of your passport to complete arrangements.</li>
            </ul>

            <h2>4. Contests, Sweepstakes, and Promotions</h2>
            <p>
              Any contests, sweepstakes, or other promotions (collectively, "Promotions") made available through the Service may be governed by rules separate from these Terms. If you participate in any Promotions, please review the applicable rules and our Privacy Policy. If Promotion rules conflict with these Terms, the Promotion rules will apply.
            </p>

            <h2>5. Refunds & Cancellations</h2>
            <p>
              We issue refunds for bookings within 1 day (24 hours) of the original purchase unless otherwise stated in the specific product's cancellation policy or required by applicable law.
            </p>

            <h3>5.1 Cancellation Scale (unless otherwise stated)</h3>
            <ul>
              <li>7 days before the trip: Full refund (except Flights, Boats, and Private Tours).</li>
              <li>4 days before the trip: 50% refund (except Flights, Boats, and Private Tours).</li>
              <li>1 day before or on the day of the trip: No refund.</li>
            </ul>
            <p>
              If the Company cancels your trip for any reason, a full refund will be provided.
            </p>
            <p>
              Cancellations due to sickness may require a doctor's certificate; refunds in such cases are at management's discretion.
            </p>

            <h3>5A. Payment Policy</h3>
            <p>
              <strong>Cash payment:</strong> Per our policy, cash balances for tours must be paid 2 days before the tour to our local supplier in order to receive your paid voucher.
            </p>
            <p>
              Certain tours (e.g., Cairo by plane, Petra by air or ferry) must be fully prepaid in advance.
            </p>
            <p>
              Upon arrival, please contact us at +20 11 42255624 (or email) with your room number; we will reconfirm your pickup time.
            </p>
            <p>
              Accepted cash currencies: GBP (Pounds Sterling), USD, EUR, and EGP, calculated per the prevailing Egypt rate on the tour date.
            </p>
            <p>
              <strong>Card payment:</strong> If you prefer to pay the outstanding balance by card, we accept Visa, MasterCard, American Express, and PayPal.
            </p>
            <p>
              Merchant of Record / Statement Name: Excursions Online LLC FZ.
              You may be charged in GBP or your preferred currency at the conversion rate applicable on the date of payment.
            </p>

            <h2>6. Content</h2>
            <p>
              The content found on or through the Service is the property of Egypt Excursions Online or used with permission. You may not distribute, modify, transmit, reuse, download, repost, copy, or use such content, whether in whole or in part, for commercial purposes or personal gain without our prior express written permission.
            </p>

            <h2>7. Prohibited Uses</h2>
            <p>
              You may use the Service only for lawful purposes and in accordance with these Terms. You agree not to use the Service:
            </p>
            <ol>
              <li>In any way that violates any applicable national or international law or regulation.</li>
              <li>To exploit, harm, or attempt to exploit or harm minors in any way.</li>
              <li>To transmit or procure the sending of any unsolicited advertising or promotional material ("spam").</li>
              <li>To impersonate the Company, a Company employee, another user, or any other person or entity.</li>
              <li>In any way that infringes upon the rights of others or is illegal, threatening, fraudulent, or harmful.</li>
              <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service or that may harm the Company or users of the Service or expose them to liability.</li>
            </ol>
            <p>Additionally, you agree not to:</p>
            <ol>
              <li>Use the Service in any manner that could disable, overburden, damage, or impair the Service or interfere with others' use of the Service.</li>
              <li>Use any robot, spider, or other automatic device, process, or means to access the Service for any purpose, including monitoring or copying material on the Service.</li>
              <li>Use any manual process to monitor or copy any material on the Service without our prior written consent.</li>
              <li>Use any device, software, or routine that interferes with the proper working of the Service.</li>
              <li>Introduce viruses, Trojan horses, worms, logic bombs, or other material that is malicious or technologically harmful.</li>
              <li>Attempt to gain unauthorized access to, interfere with, damage, or disrupt any parts of the Service, the server on which the Service is stored, or any server, computer, or database connected to the Service.</li>
              <li>Attack the Service via a denial-of-service or distributed denial-of-service attack.</li>
              <li>Take any action that may damage or falsify the Company rating.</li>
              <li>Otherwise attempt to interfere with the proper working of the Service.</li>
            </ol>

            <h2>8. Analytics</h2>
            <p>
              We may use third-party service providers to monitor and analyze the use of the Service.
            </p>

            <h2>9. No Use by Minors</h2>
            <p>
              The Service is intended only for individuals at least eighteen (18) years old. By accessing or using the Service, you represent and warrant that you are at least 18 years of age and have the full authority and capacity to enter into the Agreements. If you are not at least 18 years old, you are prohibited from accessing or using the Service.
            </p>

            <h2>10. Intellectual Property</h2>
            <p>
              The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Egypt Excursions Online and its licensors, and are protected by copyright, trademark, and other laws. Our trademarks may not be used in connection with any product or service without our prior written consent.
            </p>

            <h2>11. Copyright Policy</h2>
            <p>
              We respect the intellectual property rights of others and will respond to claims that content posted on the Service infringes the copyright or other intellectual property rights of any person or entity. If you believe your copyrighted work has been copied in a way that constitutes infringement, please email info@egypt-excursionsonline.com with the subject line "Copyright Infringement", including the details set forth below under Section 12.
            </p>
            <p>
              You may be held liable for damages (including costs and attorneys' fees) for misrepresentation or bad-faith claims.
            </p>

            <h2>12. DMCA Notice and Procedure for Copyright Infringement Claims</h2>
            <p>
              You may submit a notification under the Digital Millennium Copyright Act (DMCA) by providing our Copyright Agent with the following information in writing (see 17 U.S.C. §512(c)(3) for further detail):
            </p>
            <ol>
              <li>An electronic or physical signature of the person authorized to act on behalf of the copyright owner.</li>
              <li>A description of the copyrighted work that you claim has been infringed, including the URL of the location where the copyrighted work exists or a copy of the work.</li>
              <li>Identification of the URL or other specific location on the Service where the material that you claim is infringing is located.</li>
              <li>Your address, telephone number, and email address.</li>
              <li>A statement by you that you have a good-faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.</li>
              <li>A statement by you, made under penalty of perjury, that the information in your notice is accurate and that you are authorized to act on the copyright owner's behalf.</li>
            </ol>
            <p>Copyright Agent Contact: info@egypt-excursionsonline.com</p>

            <h2>13. Error Reporting and Feedback</h2>
            <p>
              You may provide us with feedback, suggestions for improvements, ideas, problems, or other matters related to the Service ("Feedback") by emailing info@egypt-excursionsonline.com or via third-party tools. You agree that (i) you will not retain or assert any IP or other rights in the Feedback; (ii) the Company may have developed ideas similar to the Feedback; (iii) Feedback is non-confidential; and (iv) the Company has no obligation of confidentiality with respect to the Feedback. Where ownership transfer is not possible under applicable law, you grant the Company an exclusive, transferable, irrevocable, royalty-free, sublicensable, perpetual license to use and commercialize the Feedback.
            </p>

            <h2>14. Links to Other Websites</h2>
            <p>
              The Service may contain links to third-party websites or services that are not owned or controlled by Egypt Excursions Online. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services. You acknowledge and agree that the Company shall not be responsible or liable, directly or indirectly, for any damage or loss caused by or in connection with use of or reliance on any such content, goods, or services. We strongly advise you to review the terms and privacy policies of any third-party websites or services that you visit.
            </p>

            <h2>15. Disclaimer of Warranty</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. THE COMPANY MAKES NO REPRESENTATIONS OR WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, REGARDING THE OPERATION OF THE SERVICE OR THE INFORMATION, CONTENT, OR MATERIALS INCLUDED THEREIN. YOU EXPRESSLY AGREE THAT YOUR USE OF THE SERVICE IS AT YOUR SOLE RISK.
            </p>
            <p>
              NEITHER THE COMPANY NOR ANY PERSON ASSOCIATED WITH THE COMPANY MAKES ANY WARRANTY OR REPRESENTATION WITH RESPECT TO THE COMPLETENESS, SECURITY, RELIABILITY, QUALITY, ACCURACY, OR AVAILABILITY OF THE SERVICE. WITHOUT LIMITING THE FOREGOING, NEITHER THE COMPANY NOR ANYONE ASSOCIATED WITH THE COMPANY REPRESENTS OR WARRANTS THAT THE SERVICE OR ITS CONTENT WILL BE ACCURATE, RELIABLE, ERROR-FREE, OR UNINTERRUPTED, THAT DEFECTS WILL BE CORRECTED, THAT THE SERVICE OR THE SERVER THAT MAKES IT AVAILABLE ARE FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS, OR THAT THE SERVICE WILL OTHERWISE MEET YOUR NEEDS OR EXPECTATIONS.
            </p>
            <p>
              TO THE FULLEST EXTENT PERMITTED BY LAW, THE COMPANY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS OR IMPLIED, STATUTORY OR OTHERWISE, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, NON-INFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE.
            </p>

            <h2>16. Limitation of Liability</h2>
            <p>
              EXCEPT AS PROHIBITED BY LAW, YOU WILL HOLD US AND OUR OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS HARMLESS FOR ANY INDIRECT, PUNITIVE, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGE, HOWEVER IT ARISES (INCLUDING ATTORNEYS' FEES AND ALL RELATED COSTS), WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE, OR OTHER TORT, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR THE SERVICE. EXCEPT AS PROHIBITED BY LAW, IF LIABILITY IS FOUND ON THE PART OF THE COMPANY, IT WILL BE LIMITED TO THE AMOUNT PAID FOR THE PRODUCTS AND/OR SERVICES, AND IN NO EVENT SHALL THERE BE CONSEQUENTIAL OR PUNITIVE DAMAGES. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES; IN SUCH JURISDICTIONS, THE ABOVE LIMITATIONS SHALL APPLY TO THE MAXIMUM EXTENT PERMITTED BY LAW.
            </p>

            <h2>17. Termination</h2>
            <p>
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, at our sole discretion for any reason, including without limitation a breach of these Terms. If you wish to terminate your account, you may simply discontinue using the Service. Sections that by their nature should survive termination will survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
            </p>

            <h2>18. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the Arab Republic of Egypt, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision is held to be invalid or unenforceable by a court, the remaining provisions will remain in effect. These Terms constitute the entire agreement between you and us regarding the Service and supersede all prior agreements regarding the Service.
            </p>

            <h2>19. Changes to Service</h2>
            <p>
              We reserve the right to withdraw or amend the Service, and any service or material we provide via the Service, in our sole discretion without notice. We will not be liable if for any reason all or any part of the Service is unavailable at any time or for any period. From time to time, we may restrict access to some parts of the Service, or the entire Service, to users, including registered users.
            </p>

            <h2>20. Amendments to Terms</h2>
            <p>
              We may amend these Terms at any time by posting the amended terms on the Service. It is your responsibility to review the Terms periodically. Your continued use of the Service following the posting of revised Terms means that you accept and agree to the changes. If you do not agree to the new Terms, you are no longer authorized to use the Service.
            </p>

            <h2>21. Waiver and Severability</h2>
            <p>
              No waiver by the Company of any term or condition set out in these Terms shall be deemed a further or continuing waiver of such term or condition or a waiver of any other term or condition. If any provision of these Terms is held by a court or other tribunal of competent jurisdiction to be invalid, illegal, or unenforceable for any reason, such provision shall be eliminated or limited to the minimum extent such that the remaining provisions will continue in full force and effect.
            </p>

            <h2>22. Acknowledgement</h2>
            <p>
              BY USING THE SERVICE OR OTHER SERVICES PROVIDED BY US, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE AND AGREE TO BE BOUND BY THEM.
            </p>

            <h3>22A. Operational Information & Disclaimers</h3>
            <p>
              <strong>Passport validity:</strong> Your passport should be valid for at least 6 months to avoid tour cancellation.
            </p>
            <p>
              <strong>Police checkpoints:</strong> Intercity travel in Egypt may involve highway checkpoints; you may be required to show a passport.
            </p>
            <p>
              <strong>Complaints:</strong> If you experience any problem during Tours/Transfers, notify our representative or Company Hotline immediately so we can attempt to resolve it on the spot. Post-trip complaints are difficult to remedy.
            </p>
            <p>
              <strong>Partial participation:</strong> If you choose not to participate in any portion of a tour once started, no refund will be issued for unused services (many services are prepaid and capacity-based).
            </p>
            <p>
              <strong>Agent role & Force Majeure:</strong> We act as an agent for participants with respect to travel by railroad, motor coach, private car, boat, aircraft, or other conveyance, and assume no liability for injury, illness, damage, loss, accident, delay, or irregularity to person or property resulting directly or indirectly from causes including, but not limited to: weather, acts of God, force majeure, governmental acts, civil disturbances, labor disputes, riots, theft, mechanical breakdowns, quarantines, defaults, delays, cancellations, or changes by any hotel, carrier, or restaurant. We accept no responsibility for any additional expenses arising therefrom.
            </p>
            <p>
              <strong>Local suppliers:</strong> We carefully select local providers in each city to deliver quality service and value.
            </p>
            <p>
              <strong>Drivers:</strong> Our drivers are chosen for experience and safety.
            </p>
            <p>
              <strong>Guides:</strong> We work with qualified and certified tour guides across Egypt.
            </p>

            <h2>23. Contact Us</h2>
            <p>
              Questions, feedback, or requests for support may be sent to info@egypt-excursionsonline.com. For privacy inquiries and data rights, please see our separate Privacy Policy page.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}