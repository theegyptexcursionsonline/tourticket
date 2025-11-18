// app/careers/page.tsx
import React from "react";
import CareersClientPage from "./CareersClientPage";
import dbConnect from "@/lib/dbConnect";
import Job from "@/lib/models/Job";
import { Job as JobType } from "@/types";

// NO CACHING - Real-time data from admin panel
export const revalidate = 0;
export const dynamic = 'force-dynamic';

async function getJobs(): Promise<JobType[]> {
    await dbConnect();
    try {
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