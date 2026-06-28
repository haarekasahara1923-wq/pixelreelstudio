import { auth } from "@/auth";
import { db } from "@/db";
import { generations } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import Link from "next/link";
import {
  Image as ImageIcon,
  Video,
  CreditCard,
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  ArrowRight,
  Film,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  // Fetch stats and recent generations
  const [recentGenerations, imageCount, videoCount, totalCreditsUsed] = await Promise.all([
    db
      .select()
      .from(generations)
      .where(eq(generations.userId, userId))
      .orderBy(desc(generations.createdAt))
      .limit(6),
    db
      .select({ count: count() })
      .from(generations)
      .where(and(eq(generations.userId, userId), eq(generations.type, "image"))),
    db
      .select({ count: count() })
      .from(generations)
      .where(and(eq(generations.userId, userId), eq(generations.type, "video"))),
    db
      .select({ count: count() })
      .from(generations)
      .where(eq(generations.userId, userId)),
  ]);

  const stats = [
    {
      label: "Images Created",
      value: imageCount[0]?.count ?? 0,
      icon: ImageIcon,
      color: "from-purple-500 to-violet-600",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      label: "Videos Created",
      value: videoCount[0]?.count ?? 0,
      icon: Film,
      color: "from-blue-500 to-cyan-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Total Generations",
      value: totalCreditsUsed[0]?.count ?? 0,
      icon: TrendingUp,
      color: "from-pink-500 to-rose-500",
      bg: "bg-pink-500/10",
      border: "border-pink-500/20",
    },
    {
      label: "Credits Remaining",
      value: session!.user.credits,
      icon: Zap,
      color: "from-yellow-500 to-orange-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
    },
  ];

  const quickActions = [
    {
      href: "/generate/image",
      label: "Generate Image",
      description: "1 credit • FLUX Schnell",
      icon: ImageIcon,
      gradient: "from-purple-500 to-violet-600",
    },
    {
      href: "/generate/video",
      label: "Text to Video",
      description: "5 credits • Kling v1.6",
      icon: Video,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      href: "/credits",
      label: "Buy Credits",
      description: "Top up your balance",
      icon: CreditCard,
      gradient: "from-green-500 to-emerald-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">
            Welcome back, {session?.user?.name?.split(" ")[0] ?? "Creator"} 👋
          </h1>
          <p className="mt-1 text-white/50 text-sm">
            Let&apos;s create something amazing today.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2.5">
          <Zap size={16} className="text-yellow-400" />
          <span className="text-sm font-bold text-yellow-400">
            {session!.user.credits} credits
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            className={`glass-card rounded-2xl border ${border} p-5`}
          >
            <div className={`inline-flex rounded-xl ${bg} p-2.5 mb-3`}>
              <Icon size={20} className={`bg-gradient-to-br ${color} bg-clip-text text-transparent`} style={{ fill: "none" }} />
            </div>
            <p className="text-2xl font-bold text-white font-display">{value}</p>
            <p className="text-xs text-white/40 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-white font-display mb-4">Quick Create</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(({ href, label, description, icon: Icon, gradient }) => (
            <Link
              key={href}
              href={href}
              className="group glass-card rounded-2xl border border-white/5 p-5 flex items-center gap-4 hover:border-white/10 transition-all"
            >
              <div className={`flex-shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                <Icon size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{label}</p>
                <p className="text-xs text-white/40 mt-0.5">{description}</p>
              </div>
              <ArrowRight
                size={16}
                className="text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Generations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white font-display">Recent Generations</h2>
          <Link
            href="/history"
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {recentGenerations.length === 0 ? (
          <div className="glass-card rounded-2xl border border-white/5 p-12 text-center">
            <Sparkles size={36} className="mx-auto mb-3 text-white/20" />
            <p className="text-white/40 text-sm font-medium">No generations yet</p>
            <p className="text-white/25 text-xs mt-1">
              Start by generating your first image or video!
            </p>
            <Link
              href="/generate/image"
              className="btn-primary-gradient mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Sparkles size={14} />
              Generate Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {recentGenerations.map((gen) => (
              <div
                key={gen.id}
                className="glass-card rounded-xl border border-white/5 overflow-hidden group"
              >
                <div className="relative aspect-square bg-white/5">
                  {gen.mediaUrl ? (
                    gen.type === "video" || gen.type === "image-to-video" ? (
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
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Clock size={20} className="text-white/20" />
                    </div>
                  )}
                  {/* Overlay */}
                  <div className="absolute top-1.5 right-1.5">
                    <span
                      className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                        gen.type === "image"
                          ? "bg-purple-500/80 text-white"
                          : "bg-blue-500/80 text-white"
                      }`}
                    >
                      {gen.type === "image" ? "IMG" : "VID"}
                    </span>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-[10px] text-white/40 truncate">{gen.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
