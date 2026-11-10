import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="badge">
        <Icon size={28} aria-hidden />
      </span>
      <h2>{title}</h2>
      {children}
    </div>
  )
}
