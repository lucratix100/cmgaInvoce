import { USERS_API } from "@/endpoints";
import axios from "axios";
import { cookies } from "next/headers";

export async function getSession() {
  const cookieStore = await cookies()
  const raw = cookieStore.get("accessToken")?.value

  if (!raw) return null

  try {
    const session = JSON.parse(raw)
    if (!session?.token) return null
    return session
  } catch {
    return null
  }
}

export async function getUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("userId")?.value;

  if (!userId) return null;

  try {
    const user = await axios.get(`${USERS_API}/${userId}`)
    if (!user) return null;
    return user;
  } catch (error) {
    console.log(error);
    return null
  }
}