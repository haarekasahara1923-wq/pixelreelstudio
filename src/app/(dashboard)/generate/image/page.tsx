"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Sparkles,
  Download,
  Loader2,
  Image as ImageIcon,
  Zap,
  RefreshCw,
} from "lucide-react";

const ASPECT_RATIOS = [
  { label: "Square", value: "1:1", description: "1024×1024" },
  { label: "Landscape", value: "16:9", description: "1024×576" },
  { label: "Portrait", value: "9:16", description: "576×1024" },
  { label: "Wide", value: "21:9", description: "1024×440" },
];

const STYLE_PRESETS = [
  "Photorealistic",
  "Digital Art",
  "Anime",
  "Oil Painting",
  "Watercolor",
  "Cyberpunk",
  "Fantasy",
  "Minimalist",
];

export default function ImageGeneratorPage() {
  const { data: session, update } = useSession();
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fullPrompt = selectedStyle ? `${prompt}, ${selectedStyle} style` : prompt;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    if ((session?.user?.credits ?? 0) < 1) {
      setError("Insufficient credits. Please buy more credits.");
      return;
    }

    setIsLoading(true);
    setError("");
    setGeneratedImageUrl(null);

    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, aspectRatio }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Generation failed. Please try again.");
      } else {
        setGeneratedImageUrl(data.imageUrl);
        // Refresh session credits
        await update();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImageUrl) return;
    const link = document.createElement("a");
    link.href = generatedImageUrl;
    link.download = `pixelreel-${Date.now()}.jpg`;
    link.target = "_blank";
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white font-display flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
            <ImageIcon size={20} className="text-white" />
          </div>
          Image Creator
        </h1>
        <p className="mt-2 text-white/50 text-sm">
          Powered by FLUX Schnell • 1 credit per image
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-5">
          {/* Prompt */}
          <div className="glass-card rounded-2xl border border-white/5 p-5">
            <label htmlFor="image-prompt" className="mb-2 block text-sm font-semibold text-white/80">
              Describe your image
            </label>
            <textarea
              id="image-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="A majestic snow leopard perched on a Himalayan cliff at golden hour, photorealistic, 8K..."
              className="glass-input w-full rounded-xl p-3.5 text-sm placeholder:text-white/20 resize-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-white/25">{prompt.length} characters</span>
              <button
                type="button"
                onClick={() => setPrompt("")}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Style Presets */}
          <div className="glass-card rounded-2xl border border-white/5 p-5">
            <p className="mb-3 text-sm font-semibold text-white/80">Style Preset</p>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(selectedStyle === style ? "" : style)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedStyle === style
                      ? "bg-purple-500/30 border border-purple-500/50 text-purple-300"
                      : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="glass-card rounded-2xl border border-white/5 p-5">
            <p className="mb-3 text-sm font-semibold text-white/80">Aspect Ratio</p>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIOS.map(({ label, value, description }) => (
                <button
                  key={value}
                  onClick={() => setAspectRatio(value)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all ${
                    aspectRatio === value
                      ? "border-purple-500/50 bg-purple-500/15 text-white"
                      : "border-white/10 bg-white/3 text-white/50 hover:border-white/20 hover:text-white/80"
                  }`}
                >
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs opacity-60 mt-0.5">{description} • {value}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            id="generate-image-btn"
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="btn-primary-gradient flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Image
                <span className="ml-auto flex items-center gap-1 text-white/60 text-sm font-normal">
                  <Zap size={13} className="text-yellow-400" />1
                </span>
              </>
            )}
          </button>
        </div>

        {/* Right: Output */}
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-2 border-purple-500/30 animate-spin border-t-purple-500" />
                <Sparkles size={22} className="absolute inset-0 m-auto text-purple-400 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-white/60 font-medium text-sm">Creating your image</p>
                <p className="text-white/30 text-xs mt-1">This usually takes 5–15 seconds...</p>
              </div>
            </div>
          ) : generatedImageUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImageUrl}
                alt="Generated"
                className="w-full h-auto object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex gap-2">
                <button
                  id="download-image-btn"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-all"
                >
                  <Download size={15} />
                  Download
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-2 rounded-xl bg-purple-500/20 border border-purple-500/30 px-4 py-2.5 text-sm font-medium text-purple-300 hover:bg-purple-500/30 transition-all"
                >
                  <RefreshCw size={15} />
                  Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
              <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center">
                <ImageIcon size={36} className="text-white/15" />
              </div>
              <div className="text-center">
                <p className="text-white/30 font-medium text-sm">Your image will appear here</p>
                <p className="text-white/20 text-xs mt-1">Enter a prompt and click Generate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
