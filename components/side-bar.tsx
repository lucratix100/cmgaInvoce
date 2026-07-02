"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
    AlertTriangle,
    ArrowRightLeft,
    BarChart3,
    Building,
    ClipboardCheck,
    FileText,
    Info,
    Package,
    Settings,
    Truck,
    Users,
    type LucideIcon,
} from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type NavItem = {
    href: string
    label: string
    icon: LucideIcon
    exact?: boolean
    tone?: "default" | "danger"
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
    {
        label: "Pilotage",
        items: [
            { href: "/dashboard", label: "Aperçu global", icon: BarChart3, exact: true },
            { href: "/dashboard/activities", label: "Info activités", icon: Info },
        ],
    },
    {
        label: "Gestion",
        items: [
            { href: "/dashboard/users", label: "Utilisateurs", icon: Users },
            { href: "/dashboard/invoices", label: "Factures", icon: FileText },
            { href: "/dashboard/depots", label: "Dépôts", icon: Building },
            { href: "/dashboard/drivers", label: "Chauffeurs", icon: Truck },
            { href: "/dashboard/assignments", label: "Affectations", icon: ArrowRightLeft },
            { href: "/dashboard/produits", label: "Produits", icon: Package },
            { href: "/dashboard/commercial-bls", label: "Validation BC", icon: ClipboardCheck },
        ],
    },
    {
        label: "Recouvrement",
        items: [
            { href: "/dashboard/recovery", label: "Factures urgentes", icon: AlertTriangle, tone: "danger" },
            { href: "/dashboard/recovery/settings", label: "Configuration délais", icon: Settings },
        ],
    },
]

export default function SideBar() {
    const pathname = usePathname()
    const isActive = (item: Pick<NavItem, "href" | "exact">) =>
        item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)

    return (
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">
            <SidebarHeader className="flex h-14 justify-center border-b border-sidebar-border p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="lg" className="h-10">
                            <Link href="/dashboard">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm">
                                    <Image src="/logo.png" alt="CMGA" width={24} height={24} className="object-contain" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-bold">CMGA Admin</span>
                                    <span className="block truncate text-xs text-sidebar-foreground/60">Gestion globale</span>
                                </span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-1 py-2">
                {NAV_GROUPS.map((group) => (
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
            <SidebarRail />
        </Sidebar>
    )
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
    const Icon = item.icon
    const danger = item.tone === "danger"

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={item.label}
                className={cn(
                    "h-9 rounded-xl",
                    active && !danger && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                    active && danger && "bg-red-600 text-white hover:bg-red-600 hover:text-white",
                    !active && danger && "text-red-600 hover:bg-red-50 hover:text-red-700"
                )}
            >
                <Link href={item.href} aria-current={active ? "page" : undefined}>
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    )
}
