import { getCurrentUser } from "@/actions/user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Role } from "@/types/roles"
import { Settings } from "lucide-react"
import { redirect } from "next/navigation"

export default async function CommercialSettingsPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.COMMERCIAL_ADMIN) {
    redirect("/")
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Paramètres de l’espace responsable commercial.</p>
      </div>
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configuration commerciale
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Les préférences commerciales seront ajoutées ici progressivement.
        </CardContent>
      </Card>
    </div>
  )
}
