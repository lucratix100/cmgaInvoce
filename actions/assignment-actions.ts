'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import axios from 'axios'
interface Assignment {
    id: number
    rootId: number
    userId: number | null
    commercialInitialId: number | null
    pattern: string
    createdAt: string
    updatedAt: string
}

export async function getAssignments(): Promise<Assignment[]> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.get(`${process.env.API_URL}assignments`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        console.log(response.data, "response.data")
        return response.data
    } catch (error) {
        console.error('Erreur:', error)
        throw new Error('Erreur lors de la récupération des affectations')
    }
}

export async function createAssignment(rootId: number, commercialInitialId: number | null, userId: number | null): Promise<Assignment> {
    console.log(rootId, commercialInitialId, userId, "CREATE ASSIGNMENT")
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.post(`${process.env.API_URL}assignments`, {
            rootId,
            commercialInitialId,
            userId
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

export async function updateAssignment(id: number, rootId: number, commercialInitialId: number | null, userId: number | null): Promise<Assignment> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.put(`${process.env.API_URL}assignments/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rootId, commercialInitialId, userId }),
        })


        revalidatePath('/dashboard/assignments')
        return response.data
    } catch (error) {
        console.error('Erreur:', error)
        throw error
    }
}

export async function deleteAssignment(id: number): Promise<void> {
    try {

        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.delete(`${process.env.API_URL}assignments/${id}`, {
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

export async function getAssignmentByRootId(rootId: number): Promise<Assignment | null> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.get(`${process.env.API_URL}assignment/${rootId}/root`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })



        return response.data
    } catch (error) {
        console.error('Erreur:', error)
        throw new Error('Erreur lors de la récupération de l\'affectation')
    }
} 