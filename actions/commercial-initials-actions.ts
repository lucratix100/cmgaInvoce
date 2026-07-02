'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import axios from 'axios'
interface CommercialInitial {
    id: number
    name: string
    rootId: number
    createdAt: string
    updatedAt: string
}

export async function getCommercialInitials(): Promise<CommercialInitial[]> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.get(`${process.env.API_URL}commercial-initials`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })


        return response.data
    } catch (error) {
        console.error('Erreur:', error)
        throw new Error('Erreur lors de la récupération des suffixes')
    }
}

export async function createCommercialInitial(name: string, rootId: number): Promise<CommercialInitial> {
    const data = { name, rootId }

    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.post(`${process.env.API_URL}commercial-initials`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })



        revalidatePath('/dashboard/assignments')
        revalidatePath('/commercial-dashboard/facture-affectations')
        return response.data
    } catch (error: any) {
        const message = error.response?.data?.message || 'Erreur lors de la création du suffixe'
        console.error('Erreur:', error.response?.data || error)
        throw new Error(message)
    }
}

export async function updateCommercialInitial(id: number, name: string): Promise<CommercialInitial> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.put(`${process.env.API_URL}commercial-initials/${id}`,
            { name: name.toUpperCase() },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        )



        revalidatePath('/dashboard/assignments')
        revalidatePath('/commercial-dashboard/facture-affectations')
        return response.data
    } catch (error: any) {
        const message = error.response?.data?.message || 'Erreur lors de la modification du suffixe'
        console.error('Erreur:', error.response?.data || error)
        throw new Error(message)
    }
}

export async function deleteCommercialInitial(id: number): Promise<void> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        await axios.delete(`${process.env.API_URL}commercial-initials/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })

        revalidatePath('/dashboard/assignments')
        revalidatePath('/commercial-dashboard/facture-affectations')
    } catch (error: any) {
        const message = error.response?.data?.message || 'Erreur lors de la suppression du suffixe'
        console.error('Erreur:', error.response?.data || error)
        throw new Error(message)
    }
} 