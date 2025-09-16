// app/admin/data-import/page.tsx
"use client";

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, Trash2 } from 'lucide-react';

interface ImportReport {
  wipedData: boolean;
  destinationsCreated: number;
  categoriesCreated: number;
  toursCreated: number;
  errors: string[];
}

interface ImportResult {
  success: boolean;
  report?: ImportReport;
  error?: string;
}

export default function DataImportPage() {
  const [jsonData, setJsonData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Sample JSON template
  const sampleTemplate = {
    "wipeData": false,
    "destinations": [
      {
        "name": "Cairo",
        "slug": "cairo",
        "image": "https://images.unsplash.com/photo-1539650116574-75c0c6d73b0e?w=500",
        "description": "Egypt's bustling capital city"
      }
    ],
    "categories": [
      {
        "name": "Historical Tours",
        "slug": "historical"
      }
    ],
    "tours": [
      {
        "title": "Pyramids of Giza Private Tour",
        "slug": "pyramids-giza-private-tour",
        "description": "Explore the last standing wonder of the ancient world",
        "price": 89,
        "discountPrice": 69,
        "duration": "4 hours",
        "maxGroupSize": 8,
        "destinationName": "Cairo",
        "categoryNames": ["Historical Tours"],
        "featured": true,
        "image": "https://images.unsplash.com/photo-1539650116574-75c0c6d73b0e?w=800"
      }
    ]
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonData(content);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));
    
    if (jsonFile) {
      handleFileUpload(jsonFile);
    } else {
      alert('Please drop a valid JSON file');
    }
  };

  const validateJson = (): boolean => {
    try {
      JSON.parse(jsonData);
      return true;
    } catch {
      return false;
    }
  };

  const handleImport = async () => {
    if (!jsonData.trim()) {
      alert('Please provide JSON data');
      return;
    }

    if (!validateJson()) {
      alert('Invalid JSON format');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonData,
      });

      const data: ImportResult = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSample = () => {
    const dataStr = JSON.stringify(sampleTemplate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'sample-tour-data.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const loadSampleData = () => {
    setJsonData(JSON.stringify(sampleTemplate, null, 2));
    setResult(null);
  };

  const clearData = () => {
    setJsonData('');
    setResult(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Import</h1>
        <p className="text-gray-600">Upload JSON data to populate destinations, categories, and tours</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Upload Interface */}
        <div className="space-y-6">
          {/* File Upload Area */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload JSON File
            </h2>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Drag and drop a JSON file here, or click to select
              </p>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select File
              </label>
            </div>
          </div>

          {/* Sample Data Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadSample}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Download Sample
              </button>
              <button
                onClick={loadSampleData}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <FileText className="w-4 h-4" />
                Load Sample Data
              </button>
              <button
                onClick={clearData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={isLoading || !jsonData.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Import Data
              </>
            )}
          </button>
        </div>

        {/* Right Column - JSON Editor & Results */}
        <div className="space-y-6">
          {/* JSON Editor */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">JSON Data</h3>
            <textarea
              value={jsonData}
              onChange={(e) => {
                setJsonData(e.target.value);
                setResult(null);
              }}
              placeholder="Paste your JSON data here or upload a file..."
              className="w-full h-64 p-3 border rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-2 flex items-center gap-2">
              {jsonData && (
                validateJson() ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Valid JSON
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600 text-sm">
                    <XCircle className="w-4 h-4" />
                    Invalid JSON
                  </span>
                )
              )}
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Import Results</h3>
              
              {result.success ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Import Successful!</span>
                  </div>
                  
                  {result.report && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2">Summary:</h4>
                      <ul className="space-y-1 text-green-700">
                        <li>• Destinations: {result.report.destinationsCreated}</li>
                        <li>• Categories: {result.report.categoriesCreated}</li>
                        <li>• Tours: {result.report.toursCreated}</li>
                        {result.report.wipedData && (
                          <li className="text-orange-600">• Existing data was wiped</li>
                        )}
                      </ul>
                      
                      {result.report.errors.length > 0 && (
                        <div className="mt-3">
                          <h5 className="font-semibold text-orange-800">Warnings:</h5>
                          <ul className="mt-1 space-y-1">
                            {result.report.errors.map((error, index) => (
                              <li key={index} className="text-orange-700 text-sm">• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-5 h-5" />
                    <span className="font-semibold">Import Failed</span>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-red-700">{result.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Documentation */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          JSON Structure Guide
        </h3>
        <div className="text-blue-800 space-y-2 text-sm">
          <p><strong>Required fields:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><strong>Destinations:</strong> name, slug, image, description</li>
            <li><strong>Categories:</strong> name, slug</li>
            <li><strong>Tours:</strong> title, slug, description, price, duration, maxGroupSize, destinationName, categoryNames</li>
          </ul>
          <p className="mt-3"><strong>Tips:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Set <code>wipeData: true</code> to clear existing data first (use with caution)</li>
            <li>Use <code>destinationName</code> and <code>categoryNames</code> array to link tours</li>
            <li>Download the sample file to see the complete structure</li>
          </ul>
        </div>
      </div>
    </div>
  );
}