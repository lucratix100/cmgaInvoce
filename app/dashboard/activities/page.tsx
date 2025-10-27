import ActivitiesClient from "./activitiesClient"

export default function ActivitiesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activités des Utilisateurs de Recouvrement</h1>
          <p className="text-muted-foreground">
            Suivi des activités importantes et récentes des utilisateurs ayant le rôle recouvrement
          </p>
        </div>
      </div>
      
      <ActivitiesClient />
    </div>
  )
} 