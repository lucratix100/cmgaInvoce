import { FileText } from "lucide-react"

export interface OrderDocumentLink {
  id: string
  originalName: string
  mimeType?: string
  size?: number
}

function formatFileSize(size?: number) {
  if (!size || size <= 0) return null
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`
}

export function OrderDocumentList({
  documents,
  emptyLabel,
}: {
  documents?: OrderDocumentLink[] | null
  emptyLabel?: string
}) {
  if (!documents?.length) {
    if (!emptyLabel) return null
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="space-y-1.5">
      {documents.map((document) => {
        const sizeLabel = formatFileSize(document.size)
        return (
          <li key={document.id}>
            <a
              href={`/api/commercial-bl-documents/${document.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-slate-50"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{document.originalName}</span>
              {sizeLabel && <span className="shrink-0 text-xs font-normal text-muted-foreground">{sizeLabel}</span>}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
