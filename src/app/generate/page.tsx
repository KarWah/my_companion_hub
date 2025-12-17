"use client";

import { useState } from "react";
import { generateImage } from "@/app/image-actions";
import { Copy, Download } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

const SAMPLERS = [
  "DPM++ 2M",
  "DPM++ 2M Karras",
  "DPM++ SDE Karras",
  "Euler a",
  "Euler",
  "LMS",
  "Heun",
  "DPM2",
  "DPM2 a",
  "DDIM",
  "PLMS"
];

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("EasyNegative, (worst quality:1.2), 3d, sketch, (bad anatomy), text");
  const [width, setWidth] = useState(832);
  const [height, setHeight] = useState(1216);
  const [steps, setSteps] = useState(28);
  const [cfgScale, setCfgScale] = useState(7);
  const [seed, setSeed] = useState(-1);
  const [sampler, setSampler] = useState("DPM++ 2M");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setGenerating(true);
    setError("");
    setGeneratedImage(null);

    const result = await generateImage({
      prompt,
      negative_prompt: negativePrompt,
      width,
      height,
      steps,
      cfg_scale: cfgScale,
      seed,
      sampler_name: sampler
    });

    setGenerating(false);

    if (result.success && result.data) {
      setGeneratedImage(result.data.imageUrl);
    } else {
      setError(result.error || "Failed to generate image");
    }
  };

  const copyImageToClipboard = async () => {
    if (!generatedImage) return;

    try {
      // For base64 images, we can't directly copy to clipboard easily
      // Instead, we'll show a message that they can right-click and copy
      alert("Right-click on the image and select 'Copy Image' to copy it to your clipboard, or use the Download button to save it.");
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `generated-${Date.now()}.png`;
    link.click();
  };

  return (
    <ErrorBoundary>
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Generate Images</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-6">
          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="(masterpiece), 1girl, blue eyes, long hair..."
            />
          </div>

          {/* Negative Prompt */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Negative Prompt
            </label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              rows={3}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Width
              </label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value))}
                step={64}
                min={256}
                max={2048}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Height
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                step={64}
                min={256}
                max={2048}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sampling Steps */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Sampling Steps: {steps}
            </label>
            <input
              type="range"
              value={steps}
              onChange={(e) => setSteps(parseInt(e.target.value))}
              min={1}
              max={150}
              className="w-full"
            />
          </div>

          {/* CFG Scale */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              CFG Scale: {cfgScale}
            </label>
            <input
              type="range"
              value={cfgScale}
              onChange={(e) => setCfgScale(parseFloat(e.target.value))}
              min={1}
              max={30}
              step={0.5}
              className="w-full"
            />
          </div>

          {/* Seed */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Seed (-1 for random)
            </label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Sampler */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Sampling Method
            </label>
            <select
              value={sampler}
              onChange={(e) => setSampler(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
            >
              {SAMPLERS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors"
          >
            {generating ? "Generating..." : "Generate Image"}
          </button>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Preview</h2>
            {generatedImage && (
              <div className="flex gap-2">
                <button
                  onClick={copyImageToClipboard}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors"
                  title="Copy Image"
                >
                  <Copy size={20} />
                </button>
                <button
                  onClick={downloadImage}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-green-400 rounded-lg transition-colors"
                  title="Download Image"
                >
                  <Download size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="aspect-[832/1216] bg-slate-950 rounded-xl flex items-center justify-center overflow-hidden">
            {generating ? (
              <div className="text-slate-500 text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p>Generating image...</p>
              </div>
            ) : generatedImage ? (
              <img
                src={generatedImage}
                alt="Generated"
                className="w-full h-full object-contain"
              />
            ) : (
              <p className="text-slate-500">Generated image will appear here</p>
            )}
          </div>

          {generatedImage && (
            <p className="text-xs text-slate-500 mt-4 text-center">
              Right-click and "Copy Image" to use as companion header
            </p>
          )}
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
