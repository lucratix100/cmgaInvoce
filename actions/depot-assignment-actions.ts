'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import axios from 'axios'

interface DepotAssignment {
    id: number
    userId: number
    depotId: number
    isActive: boolean
    createdAt: string
    updatedAt: string
    user?: {
        id: number
        firstname: string
        lastname: string
        email: string
        role: string
    }
    depot?: {
        id: number
        name: string
        isActive: boolean
    }
}

export async function getDepotAssignments(): Promise<DepotAssignment[]> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.get(`${process.env.API_URL}depot-assignments`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        return response.data
    } catch (error) {
        console.error('Erreur:', error)
        throw new Error('Erreur lors de la récupération des affectations par dépôt')
    }
}

export async function createDepotAssignment(userId: number, depotId: number): Promise<DepotAssignment> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.post(`${process.env.API_URL}depot-assignments`, {
            userId,
            depotId
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
        })
        revalidatePath('/dashboard/assignments')
        return response.data
    } catch (error) {
        console.error('Erreur:', error)
        throw error
    }
}

export async function deleteDepotAssignment(id: number): Promise<void> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        await axios.delete(`${process.env.API_URL}depot-assignments/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        revalidatePath('/dashboard/assignments')
    } catch (error) {
        console.error('Erreur:', error)
        throw error
    }
}

export async function getDepotAssignmentsByDepot(depotId: number): Promise<DepotAssignment[]> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.get(`${process.env.API_URL}depot-assignments/depot/${depotId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        return response.data
    } catch (error) {
        console.error('Erreur:', error)
        throw new Error('Erreur lors de la récupération des affectations du dépôt')
    }
}

export async function getDepotAssignmentsByUser(userId: number): Promise<DepotAssignment[]> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.get(`${process.env.API_URL}depot-assignments/user/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        return response.data
    } catch (error) {
        console.error('Erreur:', error)
        throw new Error('Erreur lors de la récupération des affectations de l\'utilisateur')
    }
} 