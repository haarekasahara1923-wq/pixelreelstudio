import { auth } from "@/auth";
import Link from "next/link";
import {
  Sparkles,
  Video,
  Image as ImageIcon,
  Zap,
  ShieldCheck,
  ArrowRight,
  Layers,
  Heart,
} from "lucide-react";

export default async function LandingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  const showcases = [
    {
      title: "Cyberpunk Samurai",
      type: "Image",
      url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop",
      aspect: "1:1",
    },
    {
      title: "Future Tokyo Highway",
      type: "Video",
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop",
      aspect: "16:9",
    },
    {
      title: "Ancient Ruins In Nebula",
      type: "Image",
      url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop",
      aspect: "9:16",
    },
    {
      title: "Neon Dreamscape",
      type: "Video",
      url: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop",
      aspect: "16:9",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0712] text-white">
      {/* Background Glows */}
      <div className="glow-purple -top-40 -left-20 animate-pulse" />
      <div className="glow-blue top-1/2 -right-40 animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0712]/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent font-display">
              PixelReel Studio
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-white/5 border border-white/10 px-5 py-2 text-sm font-medium transition hover:bg-white/10"
                >
                  Dashboard
                </Link>
                {session?.user.role === "admin" && (
                  <Link
                    href="/admin"
                    className="rounded-full bg-red-500/10 border border-red-500/20 px-5 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
                  >
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium hover:text-purple-400 transition">
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-full btn-primary-gradient px-5 py-2 text-sm font-semibold transition"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-6 pt-24 pb-20 text-center z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs text-purple-300 backdrop-blur-md mb-8">
          <Sparkles className="h-3.5 w-3.5" /> Powered by FLUX & Kling 1.6
        </div>

        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight sm:text-7xl font-display leading-[1.1] mb-6">
          Generate Stunning{" "}
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            AI Images & Videos
          </span>{" "}
          Instantly
        </h1>

        <p className="mx-auto max-w-2xl text-lg text-gray-400 leading-relaxed mb-10">
          Unlock state-of-the-art text-to-image and text-to-video capabilities. Create
          cinematic clips and hyper-realistic art in seconds. Start with 20 free credits.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={isLoggedIn ? "/dashboard" : "/register"}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full btn-primary-gradient px-8 py-4 font-semibold text-lg hover:shadow-purple transition-all"
          >
            Create Now <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="#pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white/5 border border-white/10 px-8 py-4 font-semibold text-lg hover:bg-white/10 transition"
          >
            View Pricing
          </a>
        </div>
      </section>

      {/* Showcase Showcase Carousel/Grid */}
      <section className="mx-auto max-w-7xl px-6 py-16 z-10 relative">
        <h2 className="text-center text-3xl font-bold tracking-tight font-display mb-12">
          Made in <span className="text-purple-400">PixelReel Studio</span>
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {showcases.map((item, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-2xl glass-card aspect-[4/5] flex flex-col justify-end"
            >
              <img
                src={item.url}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:scale-105 group-hover:opacity-80 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="relative p-6 z-10">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 text-xs font-semibold text-purple-300 mb-2">
                  {item.type === "Video" ? (
                    <Video className="h-3 w-3" />
                  ) : (
                    <ImageIcon className="h-3 w-3" />
                  )}
                  {item.type}
                </span>
                <h3 className="text-lg font-bold text-white leading-snug">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-1">Aspect Ratio: {item.aspect}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-6 py-20 border-t border-white/5 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-extrabold font-display mb-4">
            Advanced Creative Features
          </h2>
          <p className="text-gray-400">
            Designed for modern creators who demand control, speed, and uncompromising quality.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="p-8 rounded-2xl glass-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 mb-6">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold font-display mb-3">FLUX.1 Schnell Images</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Ultra-fast generation using FLUX.1 Schnell. Produces highly realistic textures,
              sharp details, and superior prompt adherence in under 3 seconds.
            </p>
          </div>

          <div className="p-8 rounded-2xl glass-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 mb-6">
              <Video className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold font-display mb-3">Kling v1.6 Standard Videos</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Generate 5-second cinematic standard definitions using Kling. Handles complex
              movements, camera transitions, and photorealistic environments.
            </p>
          </div>

          <div className="p-8 rounded-2xl glass-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 mb-6">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold font-display mb-3">Flexible Aspect Ratios</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Generate media optimized for any social platform. Instantly choose between
              16:9 widescreen, 9:16 vertical shorts, or 1:1 square layouts.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing / Packages Catalog */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20 border-t border-white/5 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-extrabold font-display mb-4">Simple Credit Packs</h2>
          <p className="text-gray-400">
            No monthly subscriptions. Pay only for what you generate. Credits never expire.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {/* Card 1 */}
          <div className="p-8 rounded-2xl glass-card flex flex-col justify-between border border-white/5 relative overflow-hidden">
            <div>
              <h3 className="text-lg font-bold text-gray-300 font-display mb-2">Starter Pack</h3>
              <div className="flex items-baseline gap-1 my-4">
                <span className="text-4xl font-extrabold font-display">₹499</span>
                <span className="text-gray-400 text-sm">one-time</span>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Perfect for hobbyists trying out AI image and video creation.
              </p>
              <div className="h-px bg-white/5 mb-6" />
              <ul className="space-y-3.5 text-sm text-gray-300 mb-8">
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  <strong>100</strong> Credits
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  100 Image generations
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  Or 20 Video generations
                </li>
                <li className="flex items-center gap-2.5 text-gray-400">
                  <ShieldCheck className="h-4 w-4 text-gray-500" />
                  Standard support
                </li>
              </ul>
            </div>
            <Link
              href={isLoggedIn ? "/credits" : "/login"}
              className="w-full text-center rounded-xl bg-white/5 border border-white/10 py-3 text-sm font-semibold hover:bg-white/10 transition"
            >
              Buy Starter
            </Link>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-2xl glass-card flex flex-col justify-between border-2 border-purple-500/50 relative overflow-hidden bg-purple-950/10">
            <div className="absolute -top-3 -right-3 rotate-12 bg-purple-500 text-white font-extrabold text-[10px] tracking-wide uppercase px-4 py-1.5">
              Popular
            </div>
            <div>
              <h3 className="text-lg font-bold text-purple-400 font-display mb-2">Creator Pro</h3>
              <div className="flex items-baseline gap-1 my-4">
                <span className="text-4xl font-extrabold font-display text-white">₹1,999</span>
                <span className="text-gray-400 text-sm">one-time</span>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Optimized for content creators, digital marketers, and artists.
              </p>
              <div className="h-px bg-white/5 mb-6" />
              <ul className="space-y-3.5 text-sm text-gray-300 mb-8">
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  <strong>500</strong> Credits
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  500 Image generations
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  Or 100 Video generations
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  Priority processing speed
                </li>
              </ul>
            </div>
            <Link
              href={isLoggedIn ? "/credits" : "/login"}
              className="w-full text-center rounded-xl btn-primary-gradient py-3 text-sm font-semibold hover:shadow-purple transition"
            >
              Buy Pro
            </Link>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-2xl glass-card flex flex-col justify-between border border-white/5 relative overflow-hidden">
            <div>
              <h3 className="text-lg font-bold text-gray-300 font-display mb-2">Studio Master</h3>
              <div className="flex items-baseline gap-1 my-4">
                <span className="text-4xl font-extrabold font-display">₹3,999</span>
                <span className="text-gray-400 text-sm">one-time</span>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Designed for agencies and studios demanding volume.
              </p>
              <div className="h-px bg-white/5 mb-6" />
              <ul className="space-y-3.5 text-sm text-gray-300 mb-8">
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  <strong>1,200</strong> Credits
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  1,200 Image generations
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  Or 240 Video generations
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  24/7 dedicated support
                </li>
              </ul>
            </div>
            <Link
              href={isLoggedIn ? "/credits" : "/login"}
              className="w-full text-center rounded-xl bg-white/5 border border-white/10 py-3 text-sm font-semibold hover:bg-white/10 transition"
            >
              Buy Master
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black/40 py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} PixelReel Studio. All rights reserved.</p>
          <div className="flex items-center gap-2">
            Made with <Heart className="h-4.5 w-4.5 text-pink-500 fill-pink-500" /> for creators.
          </div>
        </div>
      </footer>
    </div>
  );
}
