export default function IncidentsLoading() {
  return (
    <div className="page-scroll space-y-3 animate-pulse">
      <div className="glass-card rounded-2xl h-12 bg-white/3" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-4 h-20 bg-white/3" />
      ))}
    </div>
  )
}
