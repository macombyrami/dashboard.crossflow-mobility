export default function TransportLoading() {
  return (
    <div className="page-scroll space-y-4 animate-pulse">
      <div className="glass-card rounded-2xl h-10 bg-white/3 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-4 h-24 bg-white/3" />
        ))}
      </div>
      <div className="glass-card rounded-2xl p-5 h-48 bg-white/3" />
    </div>
  )
}
