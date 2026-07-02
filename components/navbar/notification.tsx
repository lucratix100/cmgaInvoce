'use client'

import { forwardRef, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { user } from "@/types"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet"
import { Button } from "../ui/button"
import { Bell, ChevronRight } from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"
import { InvoiceReminder } from "@/lib/types"
import { formatNotificationTime } from "@/lib/notification-utils"
import { getNotificationTargetHref } from "@/lib/notification-routes"

const NotificationBellButton = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button> & { unreadCount: number }
>(({ unreadCount, className, ...props }, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="outline"
    size="icon"
    className={`relative h-9 w-9 rounded-xl transition-colors hover:bg-primary-50 ${className || ""}`}
    aria-label="Notifications"
    {...props}
  >
    <Bell className="h-5 w-5 text-primary-500 hover:text-primary-700" />
    {unreadCount > 0 && (
      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
        {unreadCount}
      </span>
    )}
  </Button>
))
NotificationBellButton.displayName = "NotificationBellButton"

function NotificationItemContent({ notification }: { notification: InvoiceReminder }) {
  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-words font-semibold text-primary-600">
              {notification.invoice?.invoiceNumber
                ? `Facture #${notification.invoice.invoiceNumber}`
                : "Notification"}
            </span>
            {!notification.read && (
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
            )}
          </div>
          {notification.user?.name && (
            <span className="block text-sm font-medium text-gray-700">{notification.user.name}</span>
          )}
        </div>
        <span className="shrink-0 self-start rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
          {formatNotificationTime(notification.remindAt)}
        </span>
      </div>
      {notification.comment && (
        <p className="break-words rounded bg-gray-50 p-2 text-sm text-gray-600">{notification.comment}</p>
      )}
    </div>
  )
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: InvoiceReminder
  onClick: (notification: InvoiceReminder) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className="w-full border-b p-3 text-left transition-colors last:border-0 hover:bg-gray-50 sm:p-4"
    >
      <NotificationItemContent notification={notification} />
    </button>
  )
}

function NotificationBody({
  error,
  isLoading,
  unreadCount,
  notifications,
  onNotificationClick,
}: {
  error: unknown
  isLoading: boolean
  unreadCount: number
  notifications: InvoiceReminder[]
  onNotificationClick: (notification: InvoiceReminder) => void
}) {
  if (error) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Bell className="mx-auto mb-2 h-8 w-8 text-gray-400" />
        <div className="font-medium text-gray-700">Notifications indisponibles</div>
        <p className="mt-1 text-xs">La liste sera rechargée automatiquement.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        Chargement des notifications...
      </div>
    )
  }

  if (unreadCount === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Bell className="mx-auto mb-2 h-8 w-8 text-gray-400" />
        Aucune notification pour aujourd&apos;hui
      </div>
    )
  }

  return (
    <>
      {notifications.filter((notif) => !notif.read).map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClick={onNotificationClick}
        />
      ))}
    </>
  )
}

function NotificationBodyDesktop({
  error,
  isLoading,
  unreadCount,
  notifications,
  onNotificationClick,
}: {
  error: unknown
  isLoading: boolean
  unreadCount: number
  notifications: InvoiceReminder[]
  onNotificationClick: (notification: InvoiceReminder) => void
}) {
  if (error || isLoading || unreadCount === 0) {
    return (
      <NotificationBody
        error={error}
        isLoading={isLoading}
        unreadCount={unreadCount}
        notifications={notifications}
        onNotificationClick={onNotificationClick}
      />
    )
  }

  return (
    <>
      {notifications.filter((notif) => !notif.read).map((notification) => (
        <DropdownMenuItem
          key={notification.id}
          className="cursor-pointer rounded-none border-b p-3 last:border-0 focus:bg-gray-50 sm:p-4"
          onSelect={() => onNotificationClick(notification)}
        >
          <NotificationItemContent notification={notification} />
        </DropdownMenuItem>
      ))}
    </>
  )
}

function NotificationFooter({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-t bg-white">
      <Link
        href="/notifications"
        onClick={onNavigate}
        className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary-600 transition-colors hover:bg-gray-50 hover:text-primary-700"
      >
        Voir toutes les notifications
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

export default function Notification({ user }: { user: user }) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [bellBadgeHidden, setBellBadgeHidden] = useState(false)
  const previousUnreadCount = useRef(0)
  const hasShownLoadError = useRef(false)

  const {
    todayNotifications,
    isLoading: isLoadingNotifications,
    todayUnreadCount,
    markNotificationAsRead,
    error,
  } = useNotifications(Number(user?.id))

  useEffect(() => {
    if (todayUnreadCount > previousUnreadCount.current) {
      setBellBadgeHidden(false)
    }
    previousUnreadCount.current = todayUnreadCount
  }, [todayUnreadCount])

  const bellBadgeCount = bellBadgeHidden ? 0 : todayUnreadCount

  const handlePanelOpen = (open: boolean) => {
    if (open && todayUnreadCount > 0) {
      setBellBadgeHidden(true)
    }
  }

  useEffect(() => {
    if (error && !hasShownLoadError.current) {
      console.error("Erreur lors du chargement des notifications:", error)
      const message = error instanceof Error ? error.message : ""
      if (message && message !== "Non authentifié") {
        toast.error("Notifications temporairement indisponibles")
      }
      hasShownLoadError.current = true
    }

    if (!error) {
      hasShownLoadError.current = false
    }
  }, [error])

  const handleNotificationClick = async (notification: InvoiceReminder) => {
    try {
      if (!notification.read) {
        markNotificationAsRead(notification.id.toString())
      }
      setMobileOpen(false)
      router.push(getNotificationTargetHref(notification, user?.role))
    } catch (clickError) {
      console.error("Erreur lors du traitement de la notification:", clickError)
      toast.error("Erreur lors du traitement de la notification")
    }
  }

  const bodyProps = {
    error,
    isLoading: isLoadingNotifications,
    unreadCount: todayUnreadCount,
    notifications: todayNotifications,
    onNotificationClick: handleNotificationClick,
  }

  return (
    <>
      {/* Mobile : tiroir bas */}
      <div className="md:hidden">
        <Sheet
          open={mobileOpen}
          onOpenChange={(open) => {
            setMobileOpen(open)
            handlePanelOpen(open)
          }}
        >
          <SheetTrigger asChild>
            <NotificationBellButton unreadCount={bellBadgeCount} />
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="z-[100] flex max-h-[min(85dvh,640px)] flex-col gap-0 rounded-t-2xl p-0 [&>button]:top-3.5"
          >
            <SheetHeader className="shrink-0 border-b bg-gray-50 px-4 py-3 pr-12 text-left">
              <SheetTitle className="text-base font-semibold">Notifications du jour</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <NotificationBody {...bodyProps} />
            </div>
            <div className="shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <NotificationFooter onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop : dropdown */}
      <div className="hidden md:block">
        <DropdownMenu onOpenChange={handlePanelOpen}>
          <DropdownMenuTrigger asChild>
            <NotificationBellButton unreadCount={bellBadgeCount} />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            collisionPadding={16}
            className="z-[100] w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-lg border bg-white p-0 shadow-lg"
          >
            <div className="border-b bg-gray-50 p-4 text-lg font-semibold">Notifications du jour</div>
            <div className="max-h-[min(400px,60vh)] overflow-y-auto">
              <NotificationBodyDesktop {...bodyProps} />
            </div>
            <DropdownMenuSeparator className="m-0" />
            <DropdownMenuItem className="cursor-pointer justify-center rounded-none p-0 focus:bg-gray-50" asChild>
              <NotificationFooter />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
