// app/careers/page.tsx
import React from "react";
import { Metadata } from "next";
import CareersClientPage from "./CareersClientPage";
import dbConnect from "@/lib/dbConnect";
import Job from "@/lib/models/Job";
import { Job as JobType } from "@/types";

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;

// Generate metadata for SEO
export const metadata: Metadata = {
  title: 'Careers - Join Our Team | Egypt Excursions Online',
  description: 'Explore exciting career opportunities at Egypt Excursions Online. Join our team and help create unforgettable travel experiences.',
  openGraph: {
    title: 'Careers - Join Our Team | Egypt Excursions Online',
    description: 'Explore exciting career opportunities at Egypt Excursions Online.',
    type: 'website',
  },
};

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
    return <CareersClientPage jobOpenings={jobOpenings} />;
}