import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChangePasswordProps {
  user: any
}

export default function ChangePassword({ user }: ChangePasswordProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Modifier le mot de passe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">
              <Lock className="h-4 w-4 inline mr-2" />
              Mot de passe actuel
            </Label>
            <Input id="current-password" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">
              <Lock className="h-4 w-4 inline mr-2" />
              Nouveau mot de passe
            </Label>
            <Input id="new-password" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              <Lock className="h-4 w-4 inline mr-2" />
              Confirmer le mot de passe
            </Label>
            <Input id="confirm-password" type="password" />
          </div>
        </div>
        <Button>Modifier le mot de passe</Button>
      </CardContent>
    </Card>
  )
}