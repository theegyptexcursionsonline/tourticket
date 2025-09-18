// app/admin/data-import/page.tsx
"use client";

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, Trash2, Image as ImageIcon, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

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

interface ParsedItem {
  id: string;
  type: 'destination' | 'tour';
  title: string;
  description: string;
  currentImage?: string;
  uploadedImage?: string;
  isUploading?: boolean;
}

export default function DataImportPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [jsonData, setJsonData] = useState<string>('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
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
        "image": "",
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
        "image": ""
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

  const parseJsonAndContinue = () => {
    if (!jsonData.trim()) {
      alert('Please provide JSON data');
      return;
    }

    if (!validateJson()) {
      alert('Invalid JSON format');
      return;
    }

    try {
      const data = JSON.parse(jsonData);
      setParsedData(data);
      
      // Extract items that need images
      const items: ParsedItem[] = [];
      
      // Add destinations
      if (data.destinations) {
        data.destinations.forEach((dest: any, index: number) => {
          items.push({
            id: `dest-${index}`,
            type: 'destination',
            title: dest.name,
            description: dest.description || '',
            currentImage: dest.image || '',
          });
        });
      }

      // Add tours
      if (data.tours) {
        data.tours.forEach((tour: any, index: number) => {
          items.push({
            id: `tour-${index}`,
            type: 'tour',
            title: tour.title,
            description: tour.description || '',
            currentImage: tour.image || '',
          });
        });
      }

      setParsedItems(items);
      setCurrentStep(2);
    } catch (error) {
      alert('Error parsing JSON data');
    }
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    // Set uploading state
    setParsedItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, isUploading: true } : item
      )
    );

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        // Update item with uploaded image URL
        setParsedItems(prev => 
          prev.map(item => 
            item.id === itemId 
              ? { ...item, uploadedImage: data.url, isUploading: false }
              : item
          )
        );
      } else {
        console.error('Upload failed');
        alert('Image upload failed');
        setParsedItems(prev => 
          prev.map(item => 
            item.id === itemId ? { ...item, isUploading: false } : item
          )
        );
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
      setParsedItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, isUploading: false } : item
        )
      );
    }
  };

  const handleFinalImport = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      // Create updated JSON with uploaded images
      const updatedData = { ...parsedData };
      
      // Update destinations with uploaded images
      if (updatedData.destinations) {
        updatedData.destinations = updatedData.destinations.map((dest: any, index: number) => {
          const item = parsedItems.find(item => item.id === `dest-${index}`);
          return {
            ...dest,
            image: item?.uploadedImage || item?.currentImage || dest.image || ''
          };
        });
      }

      // Update tours with uploaded images
      if (updatedData.tours) {
        updatedData.tours = updatedData.tours.map((tour: any, index: number) => {
          const item = parsedItems.find(item => item.id === `tour-${index}`);
          return {
            ...tour,
            image: item?.uploadedImage || item?.currentImage || tour.image || ''
          };
        });
      }

      const response = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
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
    setParsedData(null);
    setParsedItems([]);
    setCurrentStep(1);
  };

  const goBackToStep1 = () => {
    setCurrentStep(1);
    setResult(null);
  };

  if (currentStep === 2) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={goBackToStep1}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Step 1
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Step 2: Upload Images</h1>
              <p className="text-gray-600">Upload images for your destinations and tours</p>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                ✓
              </div>
              <span className="text-green-600 font-medium">JSON Data</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <span className="text-blue-600 font-medium">Upload Images</span>
            </div>
          </div>
        </div>

        {/* Items to upload images for */}
        <div className="space-y-6">
          {parsedItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.type === 'destination' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.type === 'destination' ? 'Destination' : 'Tour'}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  </div>
                  {item.description && (
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current/Default Image */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Current Image</h4>
                  {item.currentImage ? (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <img 
                        src={item.currentImage} 
                        alt={item.title}
                        className="w-full h-32 object-cover rounded mb-2"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <p className="text-xs text-gray-500 truncate">{item.currentImage}</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 border-dashed rounded-lg p-8 text-center">
                      <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No current image</p>
                    </div>
                  )}
                </div>

                {/* Upload New Image */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Upload New Image {item.uploadedImage && <span className="text-green-600">(✓ Uploaded)</span>}
                  </h4>
                  
                  {item.uploadedImage ? (
                    <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                      <img 
                        src={item.uploadedImage} 
                        alt={`Uploaded ${item.title}`}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                      <p className="text-xs text-green-700 truncate">{item.uploadedImage}</p>
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleImageUpload(item.id, file);
                          };
                          input.click();
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Replace image
                      </button>
                    </div>
                  ) : (
                    <div className="border border-gray-200 border-dashed rounded-lg p-8 text-center">
                      {item.isUploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                          <p className="text-sm text-blue-600">Uploading...</p>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(item.id, file);
                            }}
                            className="hidden"
                            id={`image-${item.id}`}
                          />
                          <label
                            htmlFor={`image-${item.id}`}
                            className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            <Upload className="w-4 h-4" />
                            Upload Image
                          </label>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Final Import Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleFinalImport}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importing Data...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Complete Import
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
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
    );
  }

  // Step 1 UI
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Step 1: Upload JSON Data</h1>
        <p className="text-gray-600">Upload or paste your JSON data to get started</p>
        
        {/* Progress indicator */}
        <div className="flex items-center gap-4 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              1
            </div>
            <span className="text-blue-600 font-medium">JSON Data</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center text-sm font-semibold">
              2
            </div>
            <span className="text-gray-500">Upload Images</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
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

          {/* Continue Button */}
          <button
            onClick={parseJsonAndContinue}
            disabled={!jsonData.trim() || !validateJson()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Continue to Images
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Right Column - JSON Editor */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">JSON Data</h3>
            <textarea
              value={jsonData}
              onChange={(e) => {
                setJsonData(e.target.value);
                setResult(null);
              }}
              placeholder="Paste your JSON data here or upload a file..."
              className="w-full h-80 p-3 border rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        </div>
      </div>

      {/* Documentation */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          How It Works
        </h3>
        <div className="text-blue-800 space-y-2 text-sm">
          <p><strong>Step 1:</strong> Upload or paste your JSON data with destinations, categories, and tours</p>
          <p><strong>Step 2:</strong> Upload specific images for each destination and tour from your JSON</p>
          <p><strong>Step 3:</strong> Complete the import with properly mapped images</p>
          <p className="mt-3"><strong>Note:</strong> You can leave image fields empty in your JSON - you'll assign them in Step 2</p>
        </div>
      </div>
    </div>
  );
}