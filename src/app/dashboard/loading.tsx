export default function DashboardLoading() {
  return (
    <div className="page-scroll space-y-6 animate-pulse">
      {/* KPI skeletons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-4 h-24 bg-white/3" />
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="glass-card rounded-2xl p-5 h-52 bg-white/3" />
      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 h-40 bg-white/3" />
        <div className="glass-card rounded-2xl p-5 h-40 bg-white/3" />
      </div>
    </div>
  )
}
