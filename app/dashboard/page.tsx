"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Check, Clock, Truck } from "lucide-react"
import { BarChart3, FileText } from "lucide-react"


// Statistiques globales
const statistiques = {
  factures: { total: 1248, pourcentage: 5.2, tendance: "hausse" },
  livraisons: { total: 892, pourcentage: 12.4, tendance: "hausse" },
  revenus: { total: "45,782,500", pourcentage: 8.7, tendance: "hausse" },
  depots: { total: 4, pourcentage: 0, tendance: "stable" },
  conducteurs: { total: 12, pourcentage: 20, tendance: "hausse" },
  utilisateurs: { total: 24, pourcentage: 4.5, tendance: "hausse" },
}

// Ajouter cette interface pour typer les props
interface StatCardProps {
  title: string;
  value: string;
  percentage: string;
  trend: "up" | "down" | "stable";
  color?: "primary" | "green" | "amber" | "blue" | "purple" | "rose";
}

export default function DashboardPage() {
  // Les données pour les graphiques
  const chartData = [
    { name: "Jan", total: 1500 },
    { name: "Fév", total: 2300 },
    { name: "Mar", total: 1800 },
    { name: "Avr", total: 2800 },
    { name: "Mai", total: 2400 },
    { name: "Juin", total: 3100 },
    { name: "Juil", total: 2900 },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tableau de bord</h1>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-gradient-to-br from-primary-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2 ">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total des factures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">1,248</div>
              <div className="p-2 bg-primary-100 rounded-full text-primary">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-green-500 font-medium">+5.2%</span> depuis
              le mois dernier
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Factures livrées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">892</div>
              <div className="p-2 bg-green-100 rounded-full text-green-600">
                <Check className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-green-500 font-medium">+12.4%</span> depuis
              le mois dernier
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En attente de livraison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">356</div>
              <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-red-500 font-medium">+2.8%</span> depuis le
              mois dernier
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white border-none shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En cours de livraison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">356</div>
              <div className="p-2 bg-red-100 rounded-full text-red-600">
                <Truck className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-blue-500 font-medium">+2.8%</span> depuis le
              mois dernier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Factures"
          value="1,248"
          percentage="+5.2%"
          trend="up"
          color="primary"
        />
        <StatCard
          title="Factures Livrées"
          value="892"
          percentage="+12.4%"
          trend="up"
          color="green"
        />
        <StatCard
          title="En attente"
          value="356"
          percentage="+2.8%"
          trend="up"
          color="amber"
        />
        <StatCard
          title="Retournées"
          value="43"
          percentage="-1.5%"
          trend="down"
          color="rose"
        />
      </div> */}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aperçu des revenus</CardTitle>
            <CardDescription>Évolution des factures traitées par mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activités récentes</CardTitle>
            <CardDescription>Dernières actions effectuées sur la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-start gap-4 pb-4 border-b last:border-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={`bg-primary-${item * 100} text-white`}>
                      {["MB", "FD", "OS", "AN", "ID"][item - 1]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {
                        ["Mamadou Ba", "Fatou Diop", "Omar Sall", "Aissatou Ndiaye", "Ibrahima Diallo"][
                        item - 1
                        ]
                      }{" "}
                      a{" "}
                      {
                        [
                          "créé une nouvelle facture",
                          "modifié un dépôt",
                          "ajouté un conducteur",
                          "désactivé un utilisateur",
                          "validé une livraison",
                        ][item - 1]
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Il y a {[5, 12, 45, 120, 180][item - 1]} minutes
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Utiliser l'interface dans la déclaration du composant
function StatCard({ title, value, percentage, trend, color = "primary" }: StatCardProps) {
  const getColorClass = (color: StatCardProps["color"]) => {
    const colorMap: Record<string, string> = {
      primary: "bg-primary-100 text-primary",
      green: "bg-green-100 text-green-600",
      amber: "bg-amber-100 text-amber-600",
      blue: "bg-blue-100 text-blue-600",
      purple: "bg-purple-100 text-purple-600",
      rose: "bg-rose-100 text-rose-600",
    }
    return color && colorMap[color] ? colorMap[color] : colorMap.primary
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${getColorClass(color)}`}>
            {/* Ici vous pouvez ajouter une icône selon le type de carte */}
          </div>
        </div>
        <div className="mt-4">
          <p className={`text-xs ${trend === "up" ? "text-green-500" : "text-rose-500"}`}>
            {percentage} par rapport au mois dernier
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

