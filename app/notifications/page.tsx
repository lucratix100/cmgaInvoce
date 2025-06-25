import { getCurrentUser } from "@/actions/user"
import NotificationClient from "./notificationClient"
import { Role } from "@/types/roles"

export default async function Notification() {
    const user = await getCurrentUser()
    return (
        <div className="w-full">
            {/* <Navbar user={user} /> */}
            {(user?.role === Role.ADMIN || user?.role === Role.RECOUVREMENT) && <NotificationClient user={user} />}
        </div>
    )

}