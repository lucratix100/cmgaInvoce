'use server'

import axios from 'axios'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { toast } from 'sonner'

interface Root {
    id: number
    name: string
    commercialInitials: any[]
    createdAt: string
    updatedAt: string
}

export async function getRoots(): Promise<Root[]> {

    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.get(`${process.env.API_URL}roots`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })



        return response.data
    } catch (error) {
        console.error('Erreur:', error)
        throw new Error('Erreur lors de la récupération des racines')
    }
}

export async function createRoot(name: string): Promise<Root> {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
        const response = await axios.post(`${process.env.API_URL}roots`, { name }, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        revalidatePath('/dashboard/assignments')
        return response.data
    } catch (error) {
        console.error('Erreur:', error)
    }
}

export async function updateRoot(id: number, name: string): Promise<Root> {
    console.log(id, "id", name, "name")
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }
        const response = await axios.put(`${process.env.API_URL}roots/${id}`,
            { name },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }
        )
        revalidatePath('/dashboard/assignments')
        return response.data
    } catch (error) {
        console.error('Erreur:', error)
        throw error
    }
}

export async function deleteRoot(id: number): Promise<void> {
    console.log(id, "id")
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            toast.error('Session expirée, veuillez vous reconnecter')
            return
        }

        await axios.delete(`${process.env.API_URL}roots/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        revalidatePath('/dashboard/assignments')
        toast.success('Racine supprimée avec succès')
        return
    } catch (error: any) {
        // if (error.response?.status === 500) {
        //     toast.error('Erreur serveur lors de la suppression de la racine')
        // } else {
        //     toast.error('Erreur lors de la suppression de la racine')
        // }
        console.error('Erreur détaillée:', error)
    }
} 