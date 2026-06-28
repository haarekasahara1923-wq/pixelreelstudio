import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Users, CreditCard, BarChart3, ArrowLeft } from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0a0712] text-white">
      {/* Admin top bar */}
      <header className="sticky top-0 z-40 glass-panel border-b border-red-500/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Link>
              <div className="h-5 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                  <ShieldAlert size={14} className="text-white" />
                </div>
                <span className="font-bold text-white font-display">Admin Panel</span>
              </div>
            </div>

            {/* Right: admin badge */}
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400 uppercase tracking-widest">
              Administrator
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Admin sub-nav */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {adminLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium glass-card border border-white/5 text-white/60 hover:text-white transition-all whitespace-nowrap"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
