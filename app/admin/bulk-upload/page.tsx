'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { UploadCloud, Loader2, FileJson, Package, MapPin, Star } from 'lucide-react';

// A more detailed result display component for combined results
const ResultDisplay = ({ results }: { results: any }) => {
    if (!results) return null;
    
    const renderSection = (title: string, data: any, icon: React.ReactNode) => (
        <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">{icon} {title}</h4>
            <div className="flex gap-4 text-sm">
                <p><span className="font-semibold text-green-600">{data.created}</span> Created</p>
                <p><span className="font-semibold text-blue-600">{data.updated}</span> Updated</p>
                <p><span className="font-semibold text-red-600">{data.errors.length}</span> Errors</p>
            </div>
            {data.errors.length > 0 && (
                 <ul className="text-xs text-red-700 list-disc list-inside mt-2 max-h-32 overflow-y-auto bg-white p-2 rounded-md font-mono">
                    {data.errors.map((error: string, index: number) => <li key={index}>{error}</li>)}
                </ul>
            )}
        </div>
    );

    return (
        <div className="mt-8 p-6 bg-white border border-slate-200 rounded-xl space-y-4">
            <h3 className="text-xl font-bold text-slate-800">Combined Upload Summary</h3>
            {results.destinations && results.destinations.created + results.destinations.updated > 0 && 
                renderSection('Destinations', results.destinations, <MapPin className="h-5 w-5 text-green-500" />)}
            
            {results.categories && results.categories.created + results.categories.updated > 0 && 
                renderSection('Categories', results.categories, <Package className="h-5 w-5 text-blue-500" />)}
            
            {results.attractions && results.attractions.created + results.attractions.updated > 0 && 
                renderSection('Attraction Pages', results.attractions, <Star className="h-5 w-5 text-purple-500" />)}

            {results.tours && results.tours.created + results.tours.updated > 0 && 
                renderSection('Tours', results.tours, <Star className="h-5 w-5 text-amber-500" />)}
        </div>
    );
};


export default function BulkUploadPage() {
    const [jsonInput, setJsonInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<any | null>(null);

    const handleBulkUpload = async () => {
        setIsLoading(true);
        setResults(null);
        let parsedData;

        try {
            parsedData = JSON.parse(jsonInput);
        } catch (error: any) {
            toast.error(`Invalid JSON: ${error.message}`);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/admin/bulk-upload/combined', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsedData), // Send the raw object
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Something went wrong on the server.');

            toast.success('Bulk upload processed successfully!');
            setResults(data.results);

        } catch (error: any) {
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Combined Bulk Uploader</h1>
                <p className="text-slate-600">
                    Create destinations, categories, attractions, and tours from a single JSON file.
                </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
                <label htmlFor="json-input" className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-3">
                    <FileJson className="h-6 w-6 text-indigo-500" />
                    Paste Combined JSON Data
                </label>
                <textarea
                    id="json-input"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='{&#10;  "destinations": [ ... ],&#10;  "categories": [ ... ],&#10;  "attractions": [ ... ],&#10;  "tours": [ ... ]&#10;}'
                    className="w-full h-96 p-4 font-mono text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    disabled={isLoading}
                />
                <button
                    onClick={handleBulkUpload}
                    disabled={isLoading || !jsonInput}
                    className="mt-6 w-full inline-flex justify-center items-center gap-3 px-6 py-4 text-white font-bold bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 transition-all shadow-lg disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
                    Process Combined File
                </button>
            </div>

            {results && <ResultDisplay results={results} />}
        </div>
    );
}