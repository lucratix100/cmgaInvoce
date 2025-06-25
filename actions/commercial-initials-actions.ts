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
        return response.data
    } catch (error) {
        console.error('Erreur:', error)
        throw error
    }
}

export async function updateCommercialInitial(id: number, name: string): Promise<CommercialInitial> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.put(`${process.env.API_URL}commercial-initials/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: name.toUpperCase() }),
        })



        revalidatePath('/dashboard/assignments')
        return response.data
    } catch (error) {
        console.error('Erreur:', error)
        throw error
    }
}

export async function deleteCommercialInitial(id: number): Promise<void> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.delete(`${process.env.API_URL}commercial-initials/${id}`, {
            method: 'DELETE',
        })



        revalidatePath('/dashboard/assignments')
    } catch (error) {
        console.error('Erreur:', error)
        throw error
    }
} 