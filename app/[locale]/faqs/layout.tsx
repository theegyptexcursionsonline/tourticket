import WebSiteSchema from '@/components/schema/WebSiteSchema';

export default function FAQsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WebSiteSchema
        locale="en"
        pageName="Frequently Asked Questions"
        pageDescription="Find answers to the most common questions about our tours and services."
        pageUrl="/faqs"
      />
      {children}
    </>
  );
}
