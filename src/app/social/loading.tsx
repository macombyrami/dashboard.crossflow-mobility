export default function SocialLoading() {
  return (
    <div className="flex flex-1 h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-text-muted">Chargement du feed social…</p>
      </div>
    </div>
  )
}
