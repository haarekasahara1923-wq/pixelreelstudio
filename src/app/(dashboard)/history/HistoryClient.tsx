"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  History,
  Clock,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

type Generation = {
  id: string;
  type: string;
  prompt: string;
  mediaUrl: string | null;
  aspectRatio: string;
  status: string;
  creditsUsed: number;
  createdAt: Date;
};

type Props = {
  generations: Generation[];
  total: number;
  totalPages: number;
  currentPage: number;
  query: string;
  typeFilter: string;
};

const TYPE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" },
  { label: "Img→Video", value: "image-to-video" },
];

export function HistoryClient({
  generations,
  total,
  totalPages,
  currentPage,
  query,
  typeFilter,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query);
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);

  const navigate = (params: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.type && params.type !== "all") sp.set("type", params.type);
    if (params.page && params.page !== "1") sp.set("page", params.page);
    router.push(`${pathname}?${sp.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ q: search, type: typeFilter, page: "1" });
  };

  const handleDownload = (url: string, type: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `pixelreel-${type}-${Date.now()}.${type === "image" ? "jpg" : "mp4"}`;
    link.target = "_blank";
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <History size={20} className="text-white" />
            </div>
            My Generations
          </h1>
          <p className="mt-1 text-white/50 text-sm">{total} total creations</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
          <input
            id="history-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by prompt..."
            className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm placeholder:text-white/20"
          />
        </form>
        <div className="flex gap-2">
          {TYPE_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => navigate({ q: search, type: value, page: "1" })}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                typeFilter === value
                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-300"
                  : "glass-card border border-white/5 text-white/50 hover:text-white/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {generations.length === 0 ? (
        <div className="glass-card rounded-2xl border border-white/5 p-16 text-center">
          <Sparkles size={40} className="mx-auto mb-3 text-white/15" />
          <p className="text-white/40 font-medium">No generations found</p>
          <p className="text-white/25 text-sm mt-1">
            {query ? "Try a different search term" : "Start creating something amazing!"}
          </p>
          {!query && (
            <Link
              href="/generate/image"
              className="btn-primary-gradient mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            >
              <Sparkles size={14} />
              Create Now
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {generations.map((gen) => (
            <div
              key={gen.id}
              className="glass-card rounded-xl border border-white/5 overflow-hidden group cursor-pointer"
              onClick={() => setSelectedGen(gen)}
            >
              <div className="relative aspect-square bg-white/5">
                {gen.mediaUrl ? (
                  gen.type !== "image" ? (
                    <video
                      src={gen.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gen.mediaUrl}
                      alt={gen.prompt}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Clock size={20} className="text-white/20" />
                  </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {gen.mediaUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(gen.mediaUrl!, gen.type);
                      }}
                      className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-all"
                    >
                      <Download size={14} />
                    </button>
                  )}
                </div>

                {/* Type badge */}
                <div className="absolute top-1.5 left-1.5">
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                      gen.type === "image"
                        ? "bg-purple-500/80 text-white"
                        : "bg-blue-500/80 text-white"
                    }`}
                  >
                    {gen.type === "image" ? "IMG" : "VID"}
                  </span>
                </div>

                {/* Status badge */}
                {gen.status !== "completed" && (
                  <div className="absolute top-1.5 right-1.5">
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        gen.status === "pending"
                          ? "bg-yellow-500/80 text-white"
                          : "bg-red-500/80 text-white"
                      }`}
                    >
                      {gen.status}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-2">
                <p className="text-[10px] text-white/40 truncate">{gen.prompt}</p>
                <p className="text-[9px] text-white/25 mt-0.5">
                  {new Date(gen.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            disabled={currentPage === 1}
            onClick={() => navigate({ q: search, type: typeFilter, page: String(currentPage - 1) })}
            className="flex items-center gap-1 rounded-xl px-4 py-2 text-sm text-white/50 hover:text-white glass-card border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <span className="text-sm text-white/40">
            Page {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => navigate({ q: search, type: typeFilter, page: String(currentPage + 1) })}
            className="flex items-center gap-1 rounded-xl px-4 py-2 text-sm text-white/50 hover:text-white glass-card border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selectedGen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelectedGen(null)}
        >
          <div
            className="glass-panel rounded-3xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span
                    className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                      selectedGen.type === "image"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {selectedGen.type}
                  </span>
                  <p className="mt-2 text-sm text-white/60">{selectedGen.prompt}</p>
                </div>
                <button
                  onClick={() => setSelectedGen(null)}
                  className="text-white/40 hover:text-white text-xl leading-none"
                >
                  ×
                </button>
              </div>

              {selectedGen.mediaUrl && (
                <div className="rounded-2xl overflow-hidden">
                  {selectedGen.type !== "image" ? (
                    <video
                      src={selectedGen.mediaUrl}
                      controls
                      autoPlay
                      loop
                      className="w-full"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedGen.mediaUrl}
                      alt={selectedGen.prompt}
                      className="w-full h-auto"
                    />
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span>{selectedGen.aspectRatio}</span>
                  <span>•</span>
                  <span>{selectedGen.creditsUsed} credit{selectedGen.creditsUsed !== 1 ? "s" : ""} used</span>
                  <span>•</span>
                  <span>{new Date(selectedGen.createdAt).toLocaleString()}</span>
                </div>

                {selectedGen.mediaUrl && (
                  <button
                    onClick={() => handleDownload(selectedGen.mediaUrl!, selectedGen.type)}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 px-4 py-2 text-sm font-medium text-purple-300 hover:bg-purple-500/30 transition-all"
                  >
                    <Download size={14} />
                    Download
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
