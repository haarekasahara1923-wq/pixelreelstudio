"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Video,
  Sparkles,
  Download,
  Loader2,
  Zap,
  Upload,
  X,
  RefreshCw,
} from "lucide-react";

const ASPECT_RATIOS = [
  { label: "16:9", value: "16:9", description: "Widescreen" },
  { label: "9:16", value: "9:16", description: "Vertical" },
  { label: "1:1", value: "1:1", description: "Square" },
];

const DURATIONS = [
  { label: "5s", value: "5" },
  { label: "10s", value: "10" },
];

type GenerationMode = "text" | "image";

export default function VideoGeneratorPage() {
  const { data: session, update } = useSession();
  const [mode, setMode] = useState<GenerationMode>("text");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("5");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSourceImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSourceImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    if ((session?.user?.credits ?? 0) < 5) {
      setError("Insufficient credits. Videos cost 5 credits.");
      return;
    }

    setIsLoading(true);
    setError("");
    setGeneratedVideoUrl(null);

    try {
      let endpoint = "/api/generate/video";
      let body: FormData | string;
      const headers: Record<string, string> = {};

      if (mode === "image" && sourceImage) {
        endpoint = "/api/generate/image-to-video";
        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("aspectRatio", aspectRatio);
        formData.append("duration", duration);
        formData.append("image", sourceImage);
        body = formData;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({ prompt, aspectRatio, duration });
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Generation failed. Please try again.");
      } else {
        setGeneratedVideoUrl(data.videoUrl);
        await update();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedVideoUrl) return;
    const link = document.createElement("a");
    link.href = generatedVideoUrl;
    link.download = `pixelreel-video-${Date.now()}.mp4`;
    link.target = "_blank";
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white font-display flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Video size={20} className="text-white" />
          </div>
          Video Creator
        </h1>
        <p className="mt-2 text-white/50 text-sm">
          Powered by Kling v1.6 • 5 credits per video
        </p>
      </div>

      {/* Mode toggle */}
      <div className="glass-card rounded-2xl border border-white/5 p-1.5 inline-flex gap-1">
        <button
          id="text-to-video-mode"
          onClick={() => setMode("text")}
          className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
            mode === "text"
              ? "bg-blue-500/20 border border-blue-500/30 text-blue-300"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Text to Video
        </button>
        <button
          id="image-to-video-mode"
          onClick={() => setMode("image")}
          className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
            mode === "image"
              ? "bg-purple-500/20 border border-purple-500/30 text-purple-300"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Image to Video
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-5">
          {/* Image upload for image-to-video mode */}
          {mode === "image" && (
            <div className="glass-card rounded-2xl border border-white/5 p-5">
              <p className="mb-3 text-sm font-semibold text-white/80">Source Image</p>
              {sourceImagePreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sourceImagePreview}
                    alt="Source"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => {
                      setSourceImage(null);
                      setSourceImagePreview(null);
                    }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500/80 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-white/10 p-8 text-center hover:border-purple-500/40 hover:bg-purple-500/5 transition-all"
                >
                  <Upload size={24} className="mx-auto mb-2 text-white/30" />
                  <p className="text-sm text-white/40 font-medium">Click to upload image</p>
                  <p className="text-xs text-white/25 mt-1">PNG, JPG, WEBP up to 10MB</p>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Prompt */}
          <div className="glass-card rounded-2xl border border-white/5 p-5">
            <label htmlFor="video-prompt" className="mb-2 block text-sm font-semibold text-white/80">
              {mode === "image" ? "Describe the motion" : "Describe your video"}
            </label>
            <textarea
              id="video-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder={
                mode === "image"
                  ? "Gently flowing water, camera slowly panning right..."
                  : "A futuristic city at night with flying cars and neon lights, cinematic..."
              }
              className="glass-input w-full rounded-xl p-3.5 text-sm placeholder:text-white/20 resize-none"
            />
          </div>

          {/* Aspect Ratio & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl border border-white/5 p-5">
              <p className="mb-3 text-sm font-semibold text-white/80">Aspect Ratio</p>
              <div className="space-y-2">
                {ASPECT_RATIOS.map(({ label, value, description }) => (
                  <button
                    key={value}
                    onClick={() => setAspectRatio(value)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all ${
                      aspectRatio === value
                        ? "bg-blue-500/20 border border-blue-500/40 text-blue-300"
                        : "border border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    <span className="font-semibold">{label}</span>
                    <span className="text-xs opacity-60">{description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-white/5 p-5">
              <p className="mb-3 text-sm font-semibold text-white/80">Duration</p>
              <div className="space-y-2">
                {DURATIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setDuration(value)}
                    className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      duration === value
                        ? "bg-blue-500/20 border border-blue-500/40 text-blue-300"
                        : "border border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            id="generate-video-btn"
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim() || (mode === "image" && !sourceImage)}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-[0_0_24px_rgba(59,130,246,0.35)] transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Video
                <span className="ml-auto flex items-center gap-1 text-white/60 text-sm font-normal">
                  <Zap size={13} className="text-yellow-400" />5
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
                <div className="h-16 w-16 rounded-full border-2 border-blue-500/30 animate-spin border-t-blue-500" />
                <Video size={22} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-white/60 font-medium text-sm">Rendering your video</p>
                <p className="text-white/30 text-xs mt-1">This can take 30–90 seconds...</p>
              </div>
            </div>
          ) : generatedVideoUrl ? (
            <div className="relative">
              <video
                src={generatedVideoUrl}
                controls
                autoPlay
                loop
                muted
                className="w-full h-auto"
              />
              <div className="p-4 flex gap-2">
                <button
                  id="download-video-btn"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/20 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-all"
                >
                  <Download size={15} />
                  Download
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-2 rounded-xl bg-blue-500/20 border border-blue-500/30 px-4 py-2.5 text-sm font-medium text-blue-300 hover:bg-blue-500/30 transition-all"
                >
                  <RefreshCw size={15} />
                  Redo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
              <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center">
                <Video size={36} className="text-white/15" />
              </div>
              <div className="text-center">
                <p className="text-white/30 font-medium text-sm">Your video will appear here</p>
                <p className="text-white/20 text-xs mt-1">Enter a prompt and click Generate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
