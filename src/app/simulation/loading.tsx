export default function SimulationLoading() {
  return (
    <div className="page-scroll space-y-4 animate-pulse">
      <div className="flex gap-3">
        <div className="glass-card rounded-2xl h-10 bg-white/3 w-32" />
        <div className="glass-card rounded-2xl h-10 bg-white/3 w-40" />
      </div>
      <div className="glass-card rounded-2xl p-5 h-64 bg-white/3" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-4 h-20 bg-white/3" />
        ))}
      </div>
    </div>
  )
}
