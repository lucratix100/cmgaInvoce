'use server'

import axios from 'axios'
import { z } from 'zod'
import { UserSchema } from '@/schemas'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'


export async function getUser() {
    try {
        const response = await axios.get(`${process.env.API_URL}users`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })
        return response.data
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error)
        return null
    }
}

export async function getUserById(id: string) {
    try {
        const response = await axios.get(`${process.env.API_URL}users/${id}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })
        return response.data
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error)
        return null
    }
}

// Définir le type de retour
type ApiResponse = {
    success: boolean;
    data?: any;
    error?: string | any;
}

export const createUser = async (data: z.infer<typeof UserSchema>): Promise<ApiResponse> => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        try {
            const validatedData = UserSchema.parse(data)
            console.log("Données envoyées:", validatedData)

            const response = await axios.post(`${process.env.API_URL}users`, validatedData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            })

            revalidatePath('/dashboard/users')
            return { success: true, data: response.data }
        } catch (zodError) {
            if (zodError instanceof z.ZodError) {
                // Transformer les erreurs Zod en format compatible avec notre interface FormErrors
                const formattedErrors = zodError.errors.reduce((acc, error) => {
                    const path = error.path[0] as string
                    if (!acc[path]) {
                        acc[path] = []
                    }
                    acc[path].push(error.message)
                    return acc
                }, {} as Record<string, string[]>)

                return {
                    success: false,
                    error: formattedErrors
                }
            }
            throw zodError
        }
    } catch (error: any) {
        console.error("Erreur détaillée:", error.response?.data || error)

        // Gestion des erreurs de l'API
        if (error.response?.data?.errors) {
            return {
                success: false,
                error: error.response.data.errors
            }
        }

        return {
            success: false,
            error: {
                general: [error.response?.data?.message || "Erreur lors de la création de l'utilisateur"]
            }
        }
    }
}

export const updateUser = async (id: number, data: z.infer<typeof UserSchema>): Promise<ApiResponse> => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
        const validatedData = UserSchema.parse(data)

        const response = await axios.put(`${process.env.API_URL}users/${id}`, validatedData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        revalidatePath('/dashboard/users')
        return { success: true, data: response.data }
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors }
        }
        return {
            success: false,
            error: error.response?.data?.message || "Erreur lors de la modification de l'utilisateur"
        }
    }
}

export const getUsers = async () => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        const response = await axios.get(`${process.env.API_URL}users`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            },
            params: {
                include: 'depot'
            }
        })
        console.log('Données utilisateurs:', response.data)
        return response.data
    } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs:", error)
        throw error
    }
}

export const deleteUser = async (id: number) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        const response = await axios.delete(`${process.env.API_URL}users/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        revalidatePath('/dashboard/users')
        return { success: true, data: response.data }
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.message || "Erreur lors de la suppression de l'utilisateur"
        }
    }
}

export const getCurrentUser = async () => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
        const userId = JSON.parse(cookieStore.get("user")?.value || "{}").id

        const response = await axios.get(`${process.env.API_URL}users/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })

        return response.data
    } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error)
        throw error
    }
}