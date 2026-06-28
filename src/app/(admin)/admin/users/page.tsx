import { db } from "@/db";
import { users } from "@/db/schema";
import { count, desc, like } from "drizzle-orm";
import { Users, Search, Shield, Zap } from "lucide-react";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const page = parseInt(searchParams.page || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;
  const query = searchParams.q || "";

  const conditions = query
    ? [like(users.email, `%${query}%`)]
    : [];

  const [allUsers, totalCount] = await Promise.all([
    db
      .select()
      .from(users)
      .where(conditions.length ? conditions[0] : undefined)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(users)
      .where(conditions.length ? conditions[0] : undefined),
  ]);

  const total = totalCount[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            All Users
          </h1>
          <p className="mt-1 text-white/50 text-sm">{total} registered accounts</p>
        </div>

        {/* Search */}
        <form method="GET" className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
          <input
            name="q"
            defaultValue={query}
            type="text"
            placeholder="Search by email..."
            className="glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm placeholder:text-white/20 w-64"
          />
        </form>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Credits</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Verified</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user.name || "—"}</p>
                        <p className="text-xs text-white/40 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.role === "admin"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-white/5 text-white/50 border border-white/10"
                      }`}
                    >
                      {user.role === "admin" && <Shield className="inline-block mr-1" size={10} />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Zap size={12} className="text-yellow-400" />
                      <span className="text-sm font-semibold text-yellow-400">{user.credits}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.isVerified
                          ? "bg-green-500/15 text-green-400"
                          : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {user.isVerified ? "✓ Verified" : "✗ Unverified"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-white/40 whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {allUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-white/30">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`?page=${p}${query ? `&q=${query}` : ""}`}
              className={`h-9 w-9 flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                p === page
                  ? "bg-purple-500/30 border border-purple-500/50 text-white"
                  : "glass-card border border-white/5 text-white/50 hover:text-white"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
