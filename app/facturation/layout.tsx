import Link from "next/link"
import Image from "next/image"
import { FileText, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function FacturationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo CMGA" width={90} height={90} className="h-10 w-auto" />
            <div className="hidden border-l pl-3 md:block">
              <p className="text-sm font-semibold text-slate-950">Service facturation</p>
              <p className="text-xs text-muted-foreground">BC commerciaux</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="default" size="sm" asChild>
              <Link href="/facturation">
                <FileText className="mr-2 h-4 w-4" />
                BC commerciaux
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/logout">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
