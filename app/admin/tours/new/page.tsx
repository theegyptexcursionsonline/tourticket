// app/admin/tours/new/page.tsx
import TourForm from '@/components/TourForm';
import Link from 'next/link';
import { ArrowLeft, Plus, Sparkles } from 'lucide-react';

export default function NewTourPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Enhanced Header */}
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                        <Link
                            href="/admin/tours"
                            className="flex items-center justify-center w-12 h-12 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group shadow-sm"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
                            <span className="sr-only">Back to Tours</span>
                        </Link>
                        
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                                    <Plus className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                                        Create a New Tour
                                    </h1>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Sparkles className="h-4 w-4 text-indigo-500" />
                                        <p className="text-slate-600 font-medium">Build your perfect tour experience</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Bar */}
                    <div className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span>New Tour Creation</span>
                        </div>
                        <div className="w-px h-4 bg-slate-300"></div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Plus className="h-4 w-4" />
                            <span>All fields are ready for input</span>
                        </div>
                    </div>
                </div>

                <TourForm />
            </div>
        </div>
    );
}