"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// --- Icons ---
const PlanIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-12 w-12 text-white">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const ManufactureIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-12 w-12 text-white">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.625a2.25 2.25 0 01-2.36 0l-7.5-4.625A2.25 2.25 0 013.25 6.993V6.75" />
    </svg>
);

const TestingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-12 w-12 text-white">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const DeliveryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-12 w-12 text-white">
        <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1zM3 11h10" />
    </svg>
);

// --- Process Steps Data ---
const processSteps = [
    {
        year: "2019",
        title: "Precision Planning",
        subtitle: "Blueprint to Reality",
        description: "Every project begins with meticulous planning, tailored to exact customer drawings and approved Quality Assurance Plans to ensure a flawless start.",
        Icon: PlanIcon,
        image: "/image1.jpeg",
        gradient: "from-emerald-600 to-green-700"
    },
    {
        year: "2020",
        title: "Quality-First Manufacturing",
        subtitle: "Precision in Motion",
        description: "Our skilled team uses state-of-the-art machinery to fabricate components with unparalleled strength and durability, adhering to the strictest standards.",
        Icon: ManufactureIcon,
        image: "/image2.jpeg",
        gradient: "from-teal-600 to-emerald-700"
    },
    {
        year: "2021",
        title: "Rigorous In-House Testing",
        subtitle: "Excellence Verified",
        description: "Each component undergoes a battery of strict in-house tests. We verify every dimension, weld, and seam to guarantee performance and safety.",
        Icon: TestingIcon,
        image: "/image3.jpeg",
        gradient: "from-green-600 to-teal-700"
    },
    {
        year: "2022",
        title: "On-Time Delivery",
        subtitle: "Promise Delivered",
        description: "We are unwavering in our commitment to deadlines. Our streamlined workflow ensures your components are delivered on schedule, every time.",
        Icon: DeliveryIcon,
        image: "/image4.jpeg",
        gradient: "from-lime-600 to-green-700"
    },
];

const ProcessSection = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);
    const sectionRef = useRef(null);
    const stepRefs = useRef([]);

    useEffect(() => {
        const handleScroll = () => {
            if (!sectionRef.current) return;
           
            const sectionRect = sectionRef.current.getBoundingClientRect();
            const scrollableHeight = sectionRef.current.offsetHeight - window.innerHeight;
            const scrollTop = -sectionRect.top;
           
            const progress = Math.max(0, Math.min(1, scrollTop / scrollableHeight));
            setScrollProgress(progress);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const stepIndex = parseInt(entry.target.getAttribute('data-step-index') || '0', 10);
                        setActiveStep(stepIndex);
                    }
                });
            },
            {
                root: null,
                threshold: 0.5,
                rootMargin: '0px 0px 0px 0px'
            }
        );

        const currentRefs = stepRefs.current;
        currentRefs.forEach(ref => {
            if (ref) observer.observe(ref);
        });

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            currentRefs.forEach(ref => {
                if (ref) observer.unobserve(ref);
            });
        };
    }, []);

    const currentStep = processSteps[activeStep];
    const circleCircumference = 2 * Math.PI * 240;
    const CurrentIcon = currentStep.Icon; // Extract the icon component

    return (
        <div ref={sectionRef} className="relative text-white">
            {/* Sticky Container holds the visible UI */}
            <div className="sticky top-0 h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.1),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(5,150,105,0.1),transparent_50%)]" />
               
                <div className="container mx-auto px-6 h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 h-full items-center gap-16">
                       
                        {/* Left Column: Static Header + Animated Content */}
                        <div className="relative z-10 flex flex-col justify-center h-full">
                            {/* Static Header */}
                            <div className="mb-8">
                                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                                    Sigma Heavy
                                    <br />
                                    <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                        Engineering
                                    </span>
                                </h1>
                                <p className="text-xl text-slate-300 leading-relaxed max-w-lg mt-4">
                                    History is a testament to growth, innovation, and industry leadership. Key milestones reflect our commitment to excellence.
                                </p>
                            </div>

                            {/* Animated Steps Content Container */}
                            <div className="relative h-[24rem] overflow-hidden">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeStep}
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -50 }}
                                        transition={{ type: "spring", damping: 20, stiffness: 100 }}
                                        className="absolute inset-0"
                                    >
                                        <div className="border-l-4 border-emerald-400 pl-8 space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl bg-gradient-to-r ${currentStep.gradient} shadow-lg`}>
                                                    <CurrentIcon />
                                                </div>
                                                <div>
                                                    <p className="text-emerald-200 text-lg font-medium">Since {currentStep.year}</p>
                                                    <h3 className="text-3xl font-bold text-white">{currentStep.title}</h3>
                                                </div>
                                            </div>
                                            <p className="text-slate-300 text-lg leading-relaxed">
                                                {currentStep.description}
                                            </p>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Right Column: Circular Visual */}
                        <div className="relative flex items-center justify-center h-full">
                            <div className="relative w-[500px] h-[500px]">
                               
                                {/* Base Circle */}
                                <div className="absolute inset-0 rounded-full border-2 border-emerald-400/20 bg-gray-900/30 backdrop-blur-sm" />

                                {/* Animated Content Inside Circle */}
                                <div className="relative w-full h-full overflow-hidden rounded-full">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeStep}
                                            className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
                                            initial={{ y: "100%", opacity: 0 }}
                                            animate={{ y: "0%", opacity: 1 }}
                                            exit={{ y: "-100%", opacity: 0 }}
                                            transition={{ type: "spring", damping: 25, stiffness: 150 }}
                                        >
                                            {/* Background Image with Overlay */}
                                            <div
                                                className="absolute inset-0 bg-cover bg-center rounded-full"
                                                style={{ backgroundImage: `url(${currentStep.image})` }}
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-br ${currentStep.gradient} mix-blend-multiply opacity-80 rounded-full`} />
                                                <div className="absolute inset-0 bg-black/50 rounded-full" />
                                            </div>

                                            {/* Text Content */}
                                            <div className="relative z-10 space-y-4">
                                                <h3 className="text-8xl font-bold text-white drop-shadow-lg">
                                                    {currentStep.year}
                                                </h3>
                                                <p className="text-emerald-200 font-semibold text-xl tracking-wide">
                                                    {currentStep.subtitle}
                                                </p>
                                                <h4 className="text-2xl font-bold text-white">
                                                    {currentStep.title}
                                                </h4>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Outer Progress Ring */}
                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 500 500" fill="none">
                                    <circle cx="250" cy="250" r="240" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="4" />
                                    <motion.circle
                                        cx="250" cy="250" r="240"
                                        stroke="url(#gradient)"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeDasharray={circleCircumference}
                                        animate={{ strokeDashoffset: circleCircumference * (1 - scrollProgress) }}
                                        transition={{ type: "spring", stiffness: 50, damping: 20 }}
                                    />
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#6EE7B7" />
                                            <stop offset="100%" stopColor="#10B981" />
                                        </linearGradient>
                                    </defs>
                                </svg>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area (Invisible Triggers) */}
            <div className="relative z-0">
                {processSteps.map((_, index) => (
                    <div
                        key={index}
                        ref={el => stepRefs.current[index] = el}
                        data-step-index={index}
                        className="h-screen"
                    />
                ))}
            </div>
        </div>
    );
};

export default ProcessSection;