'use client'
import { ArrowLeft, Printer, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()

  const handleRoute = () => {
    router.back()
  }

    return (
        <header className="border-b bg-white shadow-sm sticky top-0 z-50">
            <div className="flex h-16 items-center px-4 md:px-6 justify-between">
    <Button onClick={handleRoute} className="flex items-center gap-2 text-white hover:text-primary-600 hover:bg-transparent transition-all duration-600">
    <ArrowLeft className="h-4 w-4" />
    <span className="text-lg font-semibold">Retour aux factures</span>
  </Button>
  <div className="flex gap-2">
    <Button
      variant="outline"
      size="sm"
      className="hover:bg-primary-100 hover:text-primary-700 transition-colors"
    >
      <Printer className="h-4 w-4 mr-2" />
      Imprimer
    </Button>
    <Button
      variant="outline"
      size="sm"
      className="hover:bg-primary-100 hover:text-primary-700 transition-colors"
    >
      <Download className="h-4 w-4 mr-2" />
                    Télécharger
                    </Button>
                </div>
            </div>
        </header>
    )
}