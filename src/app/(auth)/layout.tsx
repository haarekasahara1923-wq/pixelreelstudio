export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0712] flex items-center justify-center">
      {/* Background glows */}
      <div className="glow-purple absolute -top-40 -left-20 animate-pulse" />
      <div
        className="glow-blue absolute bottom-0 -right-40 animate-pulse"
        style={{ animationDelay: "2s" }}
      />
      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
