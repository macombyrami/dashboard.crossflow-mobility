/**
 * CrossFlow export utilities — CSV + PDF
 */

/** Download a CSV file */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
): void {
  const escape = (v: string | number | undefined | null) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const lines = [headers, ...rows].map(row => row.map(escape).join(','))
  const csv   = '\uFEFF' + lines.join('\r\n') // BOM for Excel UTF-8
  const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename.endsWith('.csv') ? filename : filename + '.csv')
}

/** Open browser print dialog (relies on @media print CSS hiding chrome) */
export async function exportToPdf(pageTitle?: string): Promise<void> {
  const prev = document.title
  if (pageTitle) document.title = pageTitle
  
  // ─── SAFE EXPORT MODE (Staff Engineer Implementation) ─────────────
  // 1. Force the layout into a static/standard flow for print
  document.body.setAttribute('data-export-mode', 'true')
  
  // 2. 🚀 Rendering Stabilization Delay
  // High-density dashboards with dynamic Recharts / MapLibre need a micro-task
  // cycle to settle layout after title changes or print-media query triggers.
  // Especially critical when disabling transitions/absolute positioning.
  await new Promise(resolve => setTimeout(resolve, 800))
  
  try {
    window.print()
  } catch (err) {
    console.error('[CrossFlow Export] Print failed:', err)
  } finally {
    // 3. ─── CLEANUP ──────────────────────────────────────────────────
    document.body.removeAttribute('data-export-mode')
    if (pageTitle) document.title = prev
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
