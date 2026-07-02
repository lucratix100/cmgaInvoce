import { getCurrentUser } from "@/actions/user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Role } from "@/types/roles"
import { Settings } from "lucide-react"
import { redirect } from "next/navigation"

export default async function AdminSettingsPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.ADMIN) {
    redirect("/")
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Paramètres généraux de l’espace administrateur.</p>
      </div>
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Les paramètres avancés seront ajoutés ici progressivement.
        </CardContent>
      </Card>
    </div>
  )
}
