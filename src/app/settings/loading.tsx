export default function SettingsLoading() {
  return (
    <div className="page-scroll space-y-5 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
          <div className="h-4 bg-white/3 rounded-full w-32" />
          <div className="h-3 bg-white/3 rounded-full w-full" />
          <div className="h-3 bg-white/3 rounded-full w-3/4" />
        </div>
      ))}
    </div>
  )
}
