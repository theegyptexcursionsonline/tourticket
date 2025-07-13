"use client";

import React, { useState, useEffect, useRef } from 'react';
// 1. Import useTransform from framer-motion
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'framer-motion';

// --- Icon Components (Unchanged) ---
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


// --- Refined Process Steps Data (Unchanged) ---
const processSteps = [
    {
        year: "2019",
        title: "Precision Planning",
        subtitle: "Blueprint to Reality",
        description: "Every project begins with meticulous planning, tailored to exact customer drawings and approved Quality Assurance Plans to ensure a flawless start.",
        Icon: PlanIcon,
        image: "/image1.jpeg",
        accentColor: "border-sky-400",
        gradient: "from-sky-500 to-indigo-600",
        textColor: "text-sky-200",
        progressGradient: { stop1: "#38BDF8", stop2: "#4F46E5" }
    },
    {
        year: "2020",
        title: "Quality-First Manufacturing",
        subtitle: "Precision in Motion",
        description: "Our skilled team uses state-of-the-art machinery to fabricate components with unparalleled strength and durability, adhering to the strictest standards.",
        Icon: ManufactureIcon,
        image: "/image2.jpeg",
        accentColor: "border-teal-400",
        gradient: "from-teal-500 to-cyan-600",
        textColor: "text-teal-200",
        progressGradient: { stop1: "#2DD4BF", stop2: "#0891B2" }
    },
    {
        year: "2021",
        title: "Rigorous In-House Testing",
        subtitle: "Excellence Verified",
        description: "Each component undergoes a battery of strict in-house tests. We verify every dimension, weld, and seam to guarantee performance and safety.",
        Icon: TestingIcon,
        image: "/image3.jpeg",
        accentColor: "border-emerald-400",
        gradient: "from-emerald-500 to-green-600",
        textColor: "text-emerald-200",
        progressGradient: { stop1: "#34D399", stop2: "#059669" }
    },
    {
        year: "2022",
        title: "On-Time Delivery",
        subtitle: "Promise Delivered",
        description: "We are unwavering in our commitment to deadlines. Our streamlined workflow ensures your components are delivered on schedule, every time.",
        Icon: DeliveryIcon,
        image: "/image4.jpeg",
        accentColor: "border-purple-400",
        gradient: "from-purple-500 to-violet-600",
        textColor: "text-purple-200",
        progressGradient: { stop1: "#A78BFA", stop2: "#7C3AED" }
    },
];

const ProcessSection = () => {
    const [activeStep, setActiveStep] = useState(0);
    const sectionRef = useRef(null);
    const stepRefs = useRef([]);

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end end"]
    });

    const smoothScrollProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    useEffect(() => {
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
                rootMargin: '0px 0px -50% 0px'
            }
        );

        const currentRefs = stepRefs.current;
        currentRefs.forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => {
            currentRefs.forEach(ref => {
                if (ref) observer.unobserve(ref);
            });
        };
    }, []);

    const currentStep = processSteps[activeStep];
    const CurrentIcon = currentStep.Icon;
    const circleCircumference = 2 * Math.PI * 240;

    // 2. Create a new motion value with useTransform
    // It maps the input (0 to 1) to the desired output range for the stroke offset.
    const strokeDashoffset = useTransform(
        smoothScrollProgress,
        [0, 1], // Input range
        [circleCircumference, 0] // Output range
    );

    return (
        <div ref={sectionRef} className="relative text-white" style={{ height: `${processSteps.length * 100}vh` }}>
            <div className="sticky top-0 h-screen bg-gray-900 overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(13,148,136,0.1),transparent_40%)]" />
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(79,70,229,0.1),transparent_40%)]" />
                <div className="container mx-auto px-6 h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 h-full items-center gap-16">
                        <div className="relative z-10 flex flex-col justify-center h-full">
                            <div className="mb-8">
                                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                                    MK Industries <br />
                                    <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
                                       Our History
                                    </span>
                                </h1>
                                <p className="text-xl text-slate-300 leading-relaxed max-w-lg mt-4">
                                    Our history is a testament to growth, innovation, and industry leadership. These milestones reflect our unwavering commitment to excellence.
                                </p>
                            </div>
                            <div className="relative h-[24rem] overflow-hidden">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeStep}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -30 }}
                                        transition={{ type: "spring", damping: 15, stiffness: 100 }}
                                        className="absolute inset-0"
                                    >
                                        <div className={`border-l-4 ${currentStep.accentColor} pl-8 space-y-4`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl bg-gradient-to-br ${currentStep.gradient} shadow-lg`}>
                                                    <CurrentIcon />
                                                </div>
                                                <div>
                                                    <p className={`${currentStep.textColor} text-lg font-medium`}>Since {currentStep.year}</p>
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
                        <div className="relative hidden lg:flex items-center justify-center h-full">
                            <div className="relative w-[500px] h-[500px]">
                                <div className="absolute inset-0 rounded-full border-2 border-slate-700/50 bg-slate-800/20 backdrop-blur-sm" />
                                <div className="relative w-full h-full overflow-hidden rounded-full">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeStep}
                                            className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            transition={{ type: "spring", damping: 20, stiffness: 120 }}
                                        >
                                            <div
                                                className="absolute inset-0 bg-cover bg-center rounded-full"
                                                style={{ backgroundImage: `url(${currentStep.image})` }}
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-br ${currentStep.gradient} mix-blend-multiply opacity-70 rounded-full`} />
                                                <div className="absolute inset-0 bg-black/40 rounded-full" />
                                            </div>
                                            <div className="relative z-10 space-y-4">
                                                <h3 className="text-8xl font-bold text-white drop-shadow-lg">
                                                    {currentStep.year}
                                                </h3>
                                                <p className={`${currentStep.textColor} font-semibold text-xl tracking-wide`}>
                                                    {currentStep.subtitle}
                                                </p>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 500 500" fill="none">
                                    <circle cx="250" cy="250" r="240" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="4" />
                                    {/* 3. Apply the transformed motion value directly to the style prop */}
                                    <motion.circle
                                        cx="250" cy="250" r="240"
                                        stroke={`url(#progressGradient-${activeStep})`}
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeDasharray={circleCircumference}
                                        style={{ strokeDashoffset }}
                                    />
                                    <defs>
                                        {processSteps.map((step, index) => (
                                            <linearGradient key={index} id={`progressGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor={step.progressGradient.stop1} />
                                                <stop offset="100%" stopColor={step.progressGradient.stop2} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute top-0 left-0 w-full">
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