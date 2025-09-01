'use client';
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqData = [
    {
        question: 'Can I reschedule or cancel my tickets?',
        answer: 'Yes, in most cases you can reschedule or cancel your tickets up to 24 hours in advance. Please check the specific conditions for your chosen tour or attraction on its product page. Some special events may have different policies.'
    },
    {
        question: 'How long are open tickets valid?',
        answer: 'Open tickets, which do not require a specific date and time slot, are typically valid for one year from the date of purchase. We always recommend checking the "Details" section on the ticket page for the exact validity period.'
    },
    {
        question: 'What languages do the tour guides speak?',
        answer: 'Our live guided tours are most commonly offered in English and the local language. Many tours also offer audio guides in multiple languages, including Spanish, French, German, Italian, and more. The available languages are always listed on the product page.'
    }
];

const FaqItem = ({ item }: { item: typeof faqData[0] }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-slate-200 py-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left"
            >
                <h3 className="text-lg font-semibold text-slate-800">{item.question}</h3>
                {isOpen ? <Minus className="w-6 h-6 text-red-500" /> : <Plus className="w-6 h-6 text-slate-500" />}
            </button>
            <div
                className={`grid transition-all duration-500 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100 pt-4' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden">
                    <p className="text-slate-600">
                        {item.answer}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default function FAQ() {
    return (
        <section className="bg-white py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-extrabold text-slate-800">
                        FREQUENTLY ASKED QUESTIONS
                    </h2>
                </div>
                <div className="space-y-4">
                    {faqData.map((item, index) => (
                        <FaqItem key={index} item={item} />
                    ))}
                </div>
                <div className="text-center mt-10">
                    <button className="font-bold text-red-600 hover:text-red-700 transition-colors">
                        VIEW ALL
                    </button>
                </div>
            </div>
        </section>
    );
}
