import React, { useState, useRef } from 'react';
import { Upload, RefreshCw, Pencil, Type, Share2, Sparkles, ExternalLink, AlertCircle, Key, Copy, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Paper types available for the sketch
type PaperType = 'lined' | 'graph' | 'plain';

const NotebookSketchApp = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customText, setCustomText] = useState("FESTIVAL, LOVE, FUN");
  const [paperType, setPaperType] = useState<PaperType>("lined");
  const [lastPrompt, setLastPrompt] = useState<string>("");
  
  // API Key Management
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("gemini_api_key") || process.env.API_KEY || "";
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    localStorage.setItem("gemini_api_key", newKey);
    // Clear auth errors when user starts typing
    if (error && (error.includes("API key") || error.includes("Authentication"))) {
      setError(null);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setGeneratedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;

    if (!apiKey) {
      setError("Please enter your Gemini API Key first.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    // Construct prompt
    const prompt = `Convert this photo into a creative, hand-drawn colored pencil sketch on ${paperType} notebook paper. 
      
      Style details:
      - The background MUST look like a real sheet of ${paperType} paper.
      - The subjects should be drawn in a loose, artistic colored pencil or ballpoint pen style.
      - Add a slight glowing yellow or neon outline around the main subjects.
      - Add playful, hand-drawn red or blue ink speech bubbles and doodles around the subjects.
      - Inside the speech bubbles/doodles, include these specific words: "${customText}".
      - Add decorative stars, hearts, and squiggles in the empty spaces.
      - The overall vibe should be fun, energetic, and scrapbook-style.`;
    
    setLastPrompt(prompt);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-2.5-flash-image"; 
      
      // Extract base64 data (remove header)
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        },
      });

      let foundImage = false;
      // Iterate through parts to find the image
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
             const imgMime = part.inlineData.mimeType || 'image/png';
             setGeneratedImage(`data:${imgMime};base64,${part.inlineData.data}`);
             foundImage = true;
             break;
          }
        }
      }

      if (!foundImage) {
        const textPart = response.text;
        if (textPart) {
           console.warn("Model returned text instead of image:", textPart);
           throw new Error("The AI returned text instead of an image. It might have misunderstood the prompt or triggered a safety filter.");
        }
        throw new Error("No image was generated. Please try again with a different photo.");
      }

    } catch (err: any) {
      console.error("Generation failed:", err);
      
      const errorString = err.toString();
      const errorMessage = err.message || "";

      // Handle specific Auth/Key errors
      if (errorString.includes("401") || errorString.includes("403") || errorString.includes("API key") || errorMessage.includes("API key")) {
        setError("Authentication failed. Please check your API key.");
      } 
      // Handle known logic errors (Safety, No Image)
      else if (errorMessage.includes("safety filter") || errorMessage.includes("text instead of an image") || errorMessage.includes("No image was generated")) {
         setError(errorMessage);
      }
      // Catch-all for Quota (429), Billing, or messy JSON errors
      else {
        setError("Generation failed. This is often because your API key is not linked to a billing account (required for image generation). Please check Option 1 below or use Option 2.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to convert data URL to File object for sharing
  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const match = arr[0].match(/:(.*?);/);
    if (!match) return null;
    const mime = match[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    if (navigator.share) {
      try {
        const file = dataURLtoFile(generatedImage, 'notebook-sketch.png');
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'My Notebook Sketch',
            text: 'Check out this sketch created by NotebookSketch!'
          });
          return; 
        }
      } catch (error) {
        console.log('Error sharing, falling back to download:', error);
      }
    }

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'notebook-sketch.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(lastPrompt);
  };

  return (
    <div className="min-h-screen font-sans text-slate-800 flex flex-col items-center p-4 sm:p-6" style={{ backgroundColor: '#fdfbf7' }}>
      
      {/* Header */}
      <header className="w-full max-w-2xl mb-8 text-center relative z-10 flex flex-col items-center">
        <div className="absolute -top-6 -left-6 w-16 h-16 bg-yellow-200 rounded-full opacity-50 blur-xl -z-10"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-100 rounded-full opacity-50 blur-xl -z-10"></div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-2 font-handwriting">
          Notebook<span className="text-indigo-600">Sketch</span>
        </h1>
        <p className="text-slate-600 text-lg">Turn photos into doodles ✨</p>
      </header>

      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-slate-100 flex flex-col md:flex-row relative">
        {/* Left Panel: Controls */}
        <div className="w-full md:w-1/3 p-6 bg-slate-50 border-r border-slate-100 flex flex-col gap-6 z-10">
          
          {/* Step 1: Upload */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              Upload Photo
            </h3>
            
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
            />
            
            <button 
              onClick={triggerFileInput}
              className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200
                ${selectedImage ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-100 text-slate-500'}`}
            >
              {selectedImage ? (
                <>
                  <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg shadow-sm" />
                  <span className="text-xs font-medium">Change Image</span>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 opacity-50" />
                  <span className="text-sm font-medium">Click to Upload</span>
                </>
              )}
            </button>
          </div>

          {/* Step 2: Customize */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="bg-pink-100 text-pink-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
              Customize Doodles
            </h3>
            
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Paper Style</label>
              <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                {(['lined', 'graph', 'plain'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPaperType(type)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors
                      ${paperType === type ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Bubble Text (comma separated)</label>
              <div className="relative">
                <Type className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. LOVE, WOW"
                />
              </div>
            </div>
          </div>

          {/* Action Button & API Key */}
          <div className="mt-auto pt-4 border-t border-slate-100">
            
            {/* API Key Input */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block flex items-center justify-between">
                API Key
              </label>
              <div className="relative">
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder="Paste your API key here..."
                  className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="text-right mt-1">
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                >
                  Get API Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedImage || isGenerating}
              className={`w-full py-3.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95
                ${!selectedImage 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : isGenerating 
                    ? 'bg-indigo-500 text-white cursor-wait'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white hover:shadow-xl hover:-translate-y-0.5'}`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Sketching...
                </>
              ) : (
                <>
                  <Pencil className="w-5 h-5" />
                  Sketch It!
                </>
              )}
            </button>
            {error && (
               <div className="mt-3 text-xs text-red-500 text-center bg-red-50 p-2 rounded border border-red-100 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Check result panel for details
               </div>
            )}
          </div>
        </div>

        {/* Right Panel: Result or Error */}
        <div className="w-full md:w-2/3 bg-slate-200 relative min-h-[400px] flex items-center justify-center p-4 md:p-8 overflow-hidden">
          {/* Background Texture Logic */}
          <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" 
               style={{ 
                 backgroundImage: paperType === 'lined' 
                   ? 'linear-gradient(#94a3b8 1px, transparent 1px)' 
                   : paperType === 'graph'
                     ? 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)'
                     : 'none',
                 backgroundSize: '24px 24px'
               }}>
          </div>

          {error ? (
             <div className="relative z-10 bg-white p-6 rounded-2xl shadow-xl border border-red-100 max-w-md w-full">
                <div className="flex items-center gap-2 text-red-600 mb-4">
                    <AlertCircle className="w-6 h-6" />
                    <h3 className="text-lg font-bold">Generation Failed</h3>
                </div>
                
                <p className="text-slate-600 text-sm mb-6 border-b border-slate-100 pb-4">
                    {error} 
                </p>

                <div className="space-y-4">
                    {/* Option 1: Fix API */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <h4 className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-2">
                            <Key className="w-3 h-3 text-indigo-500" /> Option 1: Check Billing
                        </h4>
                        <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                            Image generation often requires a billing account linked to your project in Google AI Studio.
                        </p>
                        <a 
                            href="https://aistudio.google.com/app/apikey" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] bg-white border border-slate-200 text-indigo-600 px-2 py-1 rounded shadow-sm font-medium inline-flex items-center gap-1 hover:bg-indigo-50 transition-colors"
                        >
                            Manage API Keys <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    {/* Option 2: Manual Fallback */}
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                         <h4 className="font-bold text-indigo-900 text-xs mb-2 flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-indigo-600" /> Option 2: Try in Gemini App
                        </h4>
                        
                        <div className="mb-3">
                            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 block">1. Copy Prompt</label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-white border border-indigo-200 text-[10px] p-2 rounded text-slate-600 h-8 overflow-hidden whitespace-nowrap">
                                    {lastPrompt.substring(0, 45)}...
                                </div>
                                <button 
                                    onClick={copyPrompt}
                                    className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition-colors shadow-sm"
                                    title="Copy full prompt"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                         <div>
                            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 block">2. Open Gemini</label>
                            <a 
                                href="https://gemini.google.com" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-full bg-white border border-indigo-200 text-indigo-700 text-xs font-bold py-2 rounded flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all shadow-sm"
                            >
                                Go to gemini.google.com <ArrowRight className="w-3 h-3" />
                            </a>
                            <p className="text-[10px] text-indigo-400 mt-2 text-center">
                                Paste the prompt and upload your image there.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
          ) : generatedImage ? (
            <div className="relative group w-full h-full flex items-center justify-center">
              <div className="relative bg-white p-2 md:p-4 shadow-2xl rotate-1 transform transition-transform duration-500 hover:rotate-0 rounded-sm max-h-full max-w-full">
                {/* Tape effect */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-yellow-100 opacity-60 rotate-2 shadow-sm z-10"></div>
                
                <img 
                  src={generatedImage} 
                  alt="Generated Sketch" 
                  className="max-h-[60vh] max-w-full object-contain shadow-inner"
                />
              </div>
              
              {/* Floating Action Bar */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                <button 
                  onClick={handleDownload}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-700 transition-colors" 
                  title="Share / Save"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <div className="w-px h-4 bg-slate-300"></div>
                <button 
                  onClick={() => setGeneratedImage(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-700 transition-colors"
                  title="Close"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center z-10 max-w-xs">
               <div className="w-24 h-24 bg-white rounded-full shadow-lg mx-auto mb-4 flex items-center justify-center rotate-3">
                  {selectedImage ? (
                    <img src={selectedImage} className="w-full h-full object-cover rounded-full opacity-50" alt="Selected Preview" />
                  ) : (
                    <Sparkles className="w-10 h-10 text-indigo-400" />
                  )}
               </div>
               <h3 className="text-xl font-bold text-slate-700 mb-2">
                 {selectedImage ? "Ready to sketch!" : "Waiting for photo..."}
               </h3>
               <p className="text-slate-500 text-sm">
                 {selectedImage 
                   ? "Hit the 'Sketch It!' button on the left to start the magic." 
                   : "Upload a photo to see it transformed into a notebook masterpiece."}
               </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-slate-400 text-xs font-medium">
        Created by <a href="https://www.mjaisystems.com" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 transition-colors">MJ AI Systems</a>
      </div>
    </div>
  );
};

export default NotebookSketchApp;