import { db } from "@/db";
import { payments, users } from "@/db/schema";
import { count, desc, eq, sum } from "drizzle-orm";
import { CreditCard, DollarSign, CheckCircle2, XCircle, Clock } from "lucide-react";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const page = parseInt(searchParams.page || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;
  const statusFilter = searchParams.status || "all";

  const conditions = statusFilter !== "all" ? [eq(payments.status, statusFilter)] : [];

  const [allPayments, totalCount, revenueStat] = await Promise.all([
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        credits: payments.credits,
        status: payments.status,
        razorpayOrderId: payments.razorpayOrderId,
        razorpayPaymentId: payments.razorpayPaymentId,
        createdAt: payments.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .where(conditions.length ? conditions[0] : undefined)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(payments)
      .where(conditions.length ? conditions[0] : undefined),
    db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.status, "success")),
  ]);

  const total = totalCount[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);
  const totalRevenue = (revenueStat[0]?.total ?? 0) as number;

  const STATUS_STYLES: Record<string, string> = {
    success: "bg-green-500/15 text-green-400 border-green-500/30",
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  const STATUS_ICONS: Record<string, React.ReactNode> = {
    success: <CheckCircle2 size={12} />,
    pending: <Clock size={12} />,
    failed: <XCircle size={12} />,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <CreditCard size={20} className="text-white" />
            </div>
            Payments Log
          </h1>
          <p className="mt-1 text-white/50 text-sm">
            {total} transactions •{" "}
            <span className="text-green-400 font-semibold">₹{totalRevenue.toLocaleString()} total revenue</span>
          </p>
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {["all", "success", "pending", "failed"].map((s) => (
            <a
              key={s}
              href={`?status=${s}&page=1`}
              className={`rounded-xl px-3 py-2 text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-300"
                  : "glass-card border border-white/5 text-white/50 hover:text-white"
              }`}
            >
              {s}
            </a>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Credits</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Order ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">{payment.userName || "—"}</p>
                      <p className="text-xs text-white/40">{payment.userEmail}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 text-sm font-semibold text-green-400">
                      <DollarSign size={13} />
                      ₹{payment.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-yellow-400">
                    +{payment.credits}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                        STATUS_STYLES[payment.status] || STATUS_STYLES.pending
                      }`}
                    >
                      {STATUS_ICONS[payment.status]}
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-white/30 font-mono truncate max-w-[120px]">
                    {payment.razorpayOrderId}
                  </td>
                  <td className="px-5 py-4 text-xs text-white/40 whitespace-nowrap">
                    {new Date(payment.createdAt).toLocaleDateString()}
                    <br />
                    <span className="text-white/25">
                      {new Date(payment.createdAt).toLocaleTimeString()}
                    </span>
                  </td>
                </tr>
              ))}
              {allPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-white/30">
                    No payment records found
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
              href={`?page=${p}&status=${statusFilter}`}
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
