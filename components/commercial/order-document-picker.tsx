"use client"

import { useRef } from "react"
import { Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

const MAX_FILES = 5
const MAX_SIZE = 8 * 1024 * 1024
const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp"]

export function buildOrderDocumentsFormData(files: File[]) {
  const formData = new FormData()
  for (const file of files) {
    formData.append("documents", file)
  }
  return formData
}

export function OrderDocumentPicker({
  files,
  onChange,
  disabled = false,
}: {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return

    const accepted: File[] = []
    let rejected = false
    for (const file of Array.from(list)) {
      const extension = file.name.split(".").pop()?.toLowerCase() || ""
      if (!ALLOWED_EXTENSIONS.includes(extension) || file.size <= 0 || file.size > MAX_SIZE) {
        rejected = true
        continue
      }
      accepted.push(file)
    }

    if (rejected || files.length + accepted.length > MAX_FILES) {
      toast({
        title: "Fichier non ajouté",
        description: "PDF, JPG, PNG ou WEBP, 8 Mo maximum, 5 fichiers.",
        variant: "destructive",
      })
    }

    onChange([...files, ...accepted].slice(0, MAX_FILES))
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="rounded-lg border border-dashed border-blue-200 bg-white p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800">Bon de commande</p>
          <p className="text-[11px] text-muted-foreground">PDF ou photo, facultatif</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 text-xs"
          disabled={disabled || files.length >= MAX_FILES}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="mr-1 h-3.5 w-3.5" />
          Joindre
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(event) => addFiles(event.target.files)}
      />
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                className="text-red-600 disabled:opacity-50"
                onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
                disabled={disabled}
                aria-label={`Retirer ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
