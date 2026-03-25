export default function PredictionLoading() {
  return (
    <div className="page-scroll space-y-4 animate-pulse">
      <div className="glass-card rounded-2xl h-10 bg-white/3 w-56" />
      <div className="glass-card rounded-2xl p-5 h-56 bg-white/3" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-4 h-28 bg-white/3" />
        ))}
      </div>
    </div>
  )
}
