"use client"

import { useQuery } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRightLeft,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  History,
  LogOut,
  Settings,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react"
import { getCommercialBlEditRequests } from "@/actions/commercial-admin"
import { activePageRefetchOptions, queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  badge?: number
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Pilotage",
    items: [
      { href: "/commercial-dashboard", label: "Tableau de bord", icon: BarChart3, exact: true },
      { href: "/commercial-dashboard/factures", label: "Factures", icon: FileText },
      { href: "/commercial-dashboard/planning", label: "Planning", icon: CalendarDays },
      { href: "/commercial-dashboard/historique-tournees", label: "Historique tournées", icon: History },
    ],
  },
  {
    label: "Opérations",
    items: [
      { href: "/commercial-dashboard/demandes-bl", label: "Demandes BC", icon: ClipboardCheck },
      { href: "/commercial-dashboard/affectations", label: "Portefeuilles", icon: ArrowRightLeft },
      { href: "/commercial-dashboard/facture-affectations", label: "Affectation factures", icon: FileText },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/commercial-dashboard/import", label: "Import clients", icon: Upload },
      { href: "/commercial-dashboard/users", label: "Commerciaux", icon: Users },
    ],
  },
]

export default function CommercialSideBar() {
  const pathname = usePathname()
  const { data: pendingRequests = [] } = useQuery({
    queryKey: queryKeys.commercialBlRequests(),
    queryFn: getCommercialBlEditRequests,
    ...activePageRefetchOptions,
  })
  const pendingBlRequests = pendingRequests.length

  const isActive = (item: Pick<NavItem, "href" | "exact">) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      item.href === "/commercial-dashboard/demandes-bl"
        ? { ...item, badge: pendingBlRequests }
        : item
    ),
  }))

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="flex h-14 justify-center border-b border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="h-10">
              <Link href="/commercial-dashboard">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm">
                  <Image src="/logo.png" alt="CMGA" width={24} height={24} className="object-contain" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">CMGA Commercial</span>
                  <span className="block truncate text-xs text-sidebar-foreground/60">Gestion portefeuille</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-1 py-2">
          {groups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item)} />
                ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <NavLink
            item={{ href: "/commercial-dashboard/parametres", label: "Paramètres", icon: Settings }}
            active={isActive({ href: "/commercial-dashboard/parametres" })}
          />
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Déconnexion" className="text-red-600 hover:bg-red-50 hover:text-red-700">
              <Link href="/logout">
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.label}
        className={cn(
          "h-9 rounded-xl",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Link href={item.href} aria-current={active ? "page" : undefined}>
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
      {Boolean(item.badge) && (
        <SidebarMenuBadge className={active ? "text-sidebar-primary-foreground" : "text-red-700"}>
          {item.badge}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  )
}