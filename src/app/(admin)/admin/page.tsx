import { db } from "@/db";
import { users, payments, generations } from "@/db/schema";
import { count, sum, eq } from "drizzle-orm";
import { Users, CreditCard, Image as ImageIcon, Video, TrendingUp, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [
    totalUsers,
    totalRevenue,
    totalGenerations,
    imageCount,
    videoCount,
    successfulPayments,
    recentUsers,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ total: sum(payments.amount) }).from(payments).where(eq(payments.status, "success")),
    db.select({ count: count() }).from(generations),
    db.select({ count: count() }).from(generations).where(eq(generations.type, "image")),
    db.select({ count: count() }).from(generations).where(eq(generations.type, "video")),
    db.select({ count: count() }).from(payments).where(eq(payments.status, "success")),
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, credits: users.credits, createdAt: users.createdAt })
      .from(users)
      .orderBy(users.createdAt)
      .limit(5),
  ]);

  const stats = [
    {
      label: "Total Users",
      value: totalUsers[0]?.count ?? 0,
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Total Revenue",
      value: `₹${((totalRevenue[0]?.total ?? 0) as number).toLocaleString()}`,
      icon: DollarSign,
      color: "from-green-500 to-emerald-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      label: "Successful Payments",
      value: successfulPayments[0]?.count ?? 0,
      icon: CreditCard,
      color: "from-yellow-500 to-orange-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
    },
    {
      label: "Total Generations",
      value: totalGenerations[0]?.count ?? 0,
      icon: TrendingUp,
      color: "from-purple-500 to-violet-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      label: "Images Created",
      value: imageCount[0]?.count ?? 0,
      icon: ImageIcon,
      color: "from-pink-500 to-rose-500",
      bg: "bg-pink-500/10",
      border: "border-pink-500/20",
    },
    {
      label: "Videos Created",
      value: videoCount[0]?.count ?? 0,
      icon: Video,
      color: "from-indigo-500 to-blue-500",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Admin Overview</h1>
        <p className="mt-1 text-white/50 text-sm">PixelReel Studio platform metrics</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, bg, border }) => (
          <div
            key={label}
            className={`glass-card rounded-2xl border ${border} p-5`}
          >
            <div className={`inline-flex rounded-xl ${bg} p-2.5 mb-3`}>
              <Icon size={20} className="text-white/70" />
            </div>
            <p className="text-2xl font-bold text-white font-display">{value}</p>
            <p className="text-xs text-white/40 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent users */}
      <div>
        <h2 className="text-lg font-bold text-white font-display mb-4">Recent Users</h2>
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Credits</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                          {user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-xs text-white/40">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.role === "admin"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-yellow-400 font-semibold">
                      {user.credits}
                    </td>
                    <td className="px-5 py-4 text-xs text-white/40">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-white/30">
                      No users yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
