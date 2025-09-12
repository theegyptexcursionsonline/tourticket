// components/InterestGrid.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";

// The Interest type will now be inferred from the fetched data,
// but we can define it for clarity.
interface Interest {
  name: string;
  products: number;
}

// --- ComingSoonModal (No changes needed, but included for completeness) ---
function ComingSoonModal({
  isOpen,
  onClose,
  interest,
}: {
  isOpen: boolean;
  onClose: () => void;
  interest: Interest | null;
}) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
      setTimeout(() => closeBtnRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
      lastFocusedRef.current?.focus?.();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !interest) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
      aria-label="Coming soon modal"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 max-w-xl w-full mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-start justify-between p-6 border-b">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">
                Coming Soon
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                The <span className="font-semibold">{interest.name}</span>{" "}
                category ( {interest.products} products ) is launching soon.
              </p>
            </div>
            <div className="ml-4">
              <button
                ref={closeBtnRef}
                onClick={onClose}
                aria-label="Close coming soon modal"
                className="inline-flex items-center justify-center rounded-md p-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300"
              >
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>
          </div>
          <div className="p-6">
            <p className="text-slate-600 mb-6 leading-relaxed">
              We're polishing this experience to deliver the best possible
              tours and activities for the selected interest. Want to be
              notified when it launches?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-full text-lg border-2 border-red-600 bg-red-600 text-white hover:opacity-95 transition"
                onClick={() => {
                  alert(`Thanks — we'll notify you when ${interest.name} is live.`);
                  onClose();
                }}
              >
                Notify Me
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 inline-flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-full text-lg border border-slate-200 hover:bg-slate-50 transition"
              >
                Browse Other Interests
              </button>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 text-xs text-slate-500">
            Tip: You can still browse other categories while we finish this one.
          </div>
        </div>
      </div>
    </div>
  );
}

// --- InterestCard (No changes needed) ---
const InterestCard = ({
  interest,
  onClick,
}: {
  interest: Interest;
  onClick: (interest: Interest) => void;
}) => {
  return (
    <button
      onClick={() => onClick(interest)}
      className="block text-left bg-white p-5 shadow-lg border-2 border-transparent hover:border-red-600 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ease-in-out rounded-lg"
      aria-label={`Open ${interest.name} (coming soon)`}
    >
      <h4 className="font-extrabold text-slate-800 text-lg uppercase tracking-wide">
        {interest.name}
      </h4>
      <p className="text-sm text-slate-500 mt-1">{interest.products} products</p>
    </button>
  );
};


// --- InterestGrid Component (Updated to be dynamic) ---
export default function InterestGrid() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openInterest, setOpenInterest] = useState<Interest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await fetch('/api/interests');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (data.success) {
          setInterests(data.data);
        } else {
          throw new Error(data.error || 'Failed to fetch interests');
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInterests();
  }, []);


  function handleOpen(interest: Interest) {
    setOpenInterest(interest);
    setIsModalOpen(true);
  }

  function handleClose() {
    setIsModalOpen(false);
    setOpenInterest(null);
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-pulse">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-lg shadow-lg">
                <div className="h-6 w-3/4 bg-slate-200 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
        return <p className="text-center text-red-500">Error: {error}</p>;
    }
    
    if (interests.length === 0) {
        return <p className="text-center text-slate-500">No interests found.</p>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {interests.map((interest) => (
          <InterestCard key={interest.name} interest={interest} onClick={handleOpen} />
        ))}
      </div>
    );
  };

  return (
    <section className="bg-slate-50 py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Egypt Excursions Online
          </h2>
          <button
            onClick={() => {
              window.scrollTo({ top: document.body.scrollHeight / 2, behavior: "smooth" });
            }}
            className="mt-6 inline-flex items-center gap-3 px-8 py-3 font-bold text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 group rounded-full"
            aria-label="Find the right interest"
          >
            <span>FIND THE RIGHT INTEREST FOR YOU</span>
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
        
        {renderContent()}

      </div>

      <ComingSoonModal
        isOpen={isModalOpen}
        onClose={handleClose}
        interest={openInterest}
      />
    </section>
  );
}