// app/careers/page.tsx
import React from "react";
import { Metadata } from "next";
import CareersClientPage from "./CareersClientPage";
import OrganizationSchema from "@/components/schema/OrganizationSchema";
import WebSiteSchema from "@/components/schema/WebSiteSchema";
import { englishOnlyMetadataAlternates } from '@/lib/i18n/seoAlternates';
import dbConnect from "@/lib/dbConnect";
import Job from "@/lib/models/Job";
import { Job as JobType } from "@/types";

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant

// Generate metadata for SEO
const PAGE_METADATA: Metadata = {
  title: 'Careers - Join Our Team | Egypt Excursions Online',
  description: 'Explore exciting career opportunities at Egypt Excursions Online. Join our team and help create unforgettable travel experiences.',
  openGraph: {
    title: 'Careers - Join Our Team | Egypt Excursions Online',
    description: 'Explore exciting career opportunities at Egypt Excursions Online.',
    type: 'website',
  },
};


export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  await params;
  return { ...PAGE_METADATA, alternates: englishOnlyMetadataAlternates('/careers') };
}

async function getJobs(): Promise<JobType[]> {
    // Skip database fetch during build if MONGODB_URI is not set
    if (!process.env.MONGODB_URI) {
        console.warn('⚠️ Skipping job fetch - MONGODB_URI not set');
        return [];
    }
    
    try {
        await dbConnect();
        const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 }).lean();
        return JSON.parse(JSON.stringify(jobs));
    } catch (error) {
        console.error("Failed to fetch job openings:", error);
        return [];
    }
}

export default async function CareersPage() {
    const jobOpenings = await getJobs();
    return (
        <>
            <OrganizationSchema />
            <WebSiteSchema
                locale="en"
                pageName="Join Our Team"
                pageDescription="Are you passionate about travel and creating unforgettable experiences? We're a team of dedicated experts committed to providing the best of Egypt to the world."
                pageUrl="/careers"
            />
            <CareersClientPage jobOpenings={jobOpenings} />
        </>
    );
}
