"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Video,
  CreditCard,
  History,
  LogOut,
  ShieldAlert,
  Zap,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generate/image", label: "Image Creator", icon: ImageIcon },
  { href: "/generate/video", label: "Video Creator", icon: Video },
  { href: "/history", label: "My Generations", icon: History },
  { href: "/credits", label: "Buy Credits", icon: CreditCard },
];

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "admin";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-64 flex-col glass-panel border-r border-white/5 fixed left-0 top-0 z-40">
        {/* Logo */}
        <div className="flex h-16 items-center px-5 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 bg-clip-text text-lg font-extrabold tracking-tight text-transparent font-display">
              PixelReel Studio
            </span>
          </Link>
        </div>

        {/* Credits badge */}
        <div className="mx-4 mt-4">
          <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-xs font-semibold text-white/80">Credits</span>
            </div>
            <span className="text-sm font-bold text-yellow-400">
              {session?.user?.credits ?? 0}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-purple-500/20 text-purple-300 shadow-sm"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  size={17}
                  className={isActive ? "text-purple-400" : "text-white/40 group-hover:text-white/70"}
                />
                <span>{label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto text-purple-400/60" />}
              </Link>
            );
          })}

          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-white/5">
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/20">Admin</p>
              {[
                { href: "/admin", label: "Overview", icon: ShieldAlert },
                { href: "/admin/users", label: "Users", icon: LayoutDashboard },
                { href: "/admin/payments", label: "Payments", icon: CreditCard },
              ].map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-red-500/20 text-red-300"
                        : "text-white/40 hover:bg-white/5 hover:text-white/80"
                    }`}
                  >
                    <Icon size={17} className={isActive ? "text-red-400" : "text-white/30"} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* User profile & sign out */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{session?.user?.name ?? "User"}</p>
              <p className="text-xs text-white/40 truncate">{session?.user?.email}</p>
            </div>
          </div>
          <button
            id="sidebar-signout"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/5">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all ${
                  isActive ? "text-purple-400" : "text-white/30 hover:text-white/60"
                }`}
              >
                <Icon size={20} />
                <span className="text-[9px] font-medium">{label.split(" ")[0]}</span>
              </Link>
            );
          })}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-white/30 hover:text-red-400 transition-all"
          >
            <LogOut size={20} />
            <span className="text-[9px] font-medium">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}
