"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { CreditCard, Zap, CheckCircle2, Sparkles, Star, Shield, Loader2 } from "lucide-react";

type CreditPack = {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string | null;
};

const PACK_FEATURES: Record<string, string[]> = {
  default: ["No expiry on credits", "All generation types", "Priority support"],
};

const PACK_ICONS = [Zap, Star, Shield];
const PACK_GRADIENTS = [
  "from-purple-500 to-violet-600",
  "from-blue-500 to-cyan-500",
  "from-pink-500 to-rose-500",
];

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: { name: string; email: string };
  theme: { color: string };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export function CreditsClient({ packs }: { packs: CreditPack[] }) {
  const { data: session, update } = useSession();
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  const handlePurchase = async (pack: CreditPack) => {
    setLoadingPackId(pack.id);
    setError("");
    setSuccessMsg("");

    try {
      // Create Razorpay order
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        setError(orderData.error || "Failed to create order.");
        setLoadingPackId(null);
        return;
      }

      // Load Razorpay script dynamically
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay"));
          document.head.appendChild(script);
        });
      }

      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || orderData.keyId,
        amount: orderData.amount,
        currency: "INR",
        name: "PixelReel Studio",
        description: `${pack.name} – ${pack.credits} Credits`,
        order_id: orderData.orderId,
        handler: async (response: RazorpayResponse) => {
          // Verify payment
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();

          if (verifyRes.ok) {
            setSuccessMsg(
              `🎉 Payment successful! ${pack.credits} credits added to your account.`
            );
            await update();
          } else {
            setError(verifyData.error || "Payment verification failed.");
          }

          setLoadingPackId(null);
        },
        prefill: {
          name: session?.user?.name ?? "",
          email: session?.user?.email ?? "",
        },
        theme: { color: "#9333ea" },
      });

      razorpay.open();
      setLoadingPackId(null);
    } catch {
      setError("Payment failed. Please try again.");
      setLoadingPackId(null);
    }
  };

  // Show fallback packs if DB is empty
  const displayPacks: CreditPack[] =
    packs.length > 0
      ? packs
      : [
          { id: "starter", name: "Starter Pack", credits: 100, price: 499, description: "Perfect for trying out AI generation" },
          { id: "creator", name: "Creator Pro", credits: 500, price: 1999, description: "Best value for regular creators" },
          { id: "studio", name: "Studio Master", credits: 1200, price: 3999, description: "For professional studios and teams" },
        ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white font-display flex items-center justify-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <CreditCard size={20} className="text-white" />
          </div>
          Buy Credits
        </h1>
        <p className="mt-2 text-white/50 text-sm">
          Power your AI creations. Credits never expire.
        </p>

        {/* Current balance */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-5 py-2">
          <Zap size={14} className="text-yellow-400" />
          <span className="text-sm font-semibold text-yellow-300">
            Current balance: <strong>{session?.user?.credits ?? 0} credits</strong>
          </span>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="mx-auto max-w-lg rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-300">{successMsg}</p>
        </div>
      )}
      {error && (
        <div className="mx-auto max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {displayPacks.map((pack, index) => {
          const Icon = PACK_ICONS[index % PACK_ICONS.length];
          const gradient = PACK_GRADIENTS[index % PACK_GRADIENTS.length];
          const isPopular = index === 1;
          const isLoading = loadingPackId === pack.id;
          const pricePerCredit = (pack.price / pack.credits).toFixed(2);

          return (
            <div
              key={pack.id}
              className={`relative glass-card rounded-3xl border p-6 flex flex-col ${
                isPopular
                  ? "border-purple-500/40 shadow-[0_0_40px_rgba(147,51,234,0.15)]"
                  : "border-white/5"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="btn-primary-gradient rounded-full px-4 py-1 text-xs font-bold text-white tracking-wide">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {/* Icon & Name */}
              <div className={`mb-4 inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br ${gradient} items-center justify-center`}>
                <Icon size={22} className="text-white" />
              </div>

              <h2 className="text-lg font-bold text-white font-display">{pack.name}</h2>
              <p className="mt-1 text-xs text-white/40">{pack.description}</p>

              {/* Price */}
              <div className="my-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white font-display">
                    ₹{pack.price}
                  </span>
                  <span className="text-white/40 text-sm">one-time</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400" />
                  <span className="text-2xl font-bold text-yellow-400 font-display">
                    {pack.credits.toLocaleString()}
                  </span>
                  <span className="text-white/50 text-sm">credits</span>
                </div>
                <p className="text-xs text-white/30 mt-1">₹{pricePerCredit} per credit</p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {(PACK_FEATURES[pack.id] || PACK_FEATURES.default).map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5 text-sm text-white/60">
                    <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
                <li className="flex items-center gap-2.5 text-sm text-white/60">
                  <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                  {Math.floor(pack.credits)} images or {Math.floor(pack.credits / 5)} videos
                </li>
              </ul>

              {/* Buy button */}
              <button
                id={`buy-pack-${pack.id}`}
                onClick={() => handlePurchase(pack)}
                disabled={isLoading}
                className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPopular
                    ? "btn-primary-gradient"
                    : `bg-gradient-to-r ${gradient} opacity-80 hover:opacity-100 hover:shadow-lg`
                }`}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {isLoading ? "Processing..." : `Get ${pack.credits.toLocaleString()} Credits`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-white/30 text-xs">
        <div className="flex items-center gap-1.5">
          <Shield size={14} />
          Secure payment via Razorpay
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={14} />
          Credits added instantly
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={14} />
          No subscription required
        </div>
      </div>
    </div>
  );
}
