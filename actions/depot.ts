'use server'

import { DepotSchema } from '@/schemas'
import axios from 'axios'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'



export const getDepots = async () => {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('token')?.value

        if (!token) {
            console.log('No token found')
            throw new Error('Non authentifié')
        }

        console.log('Token found:', token.substring(0, 10) + '...')
        console.log('API URL:', process.env.API_URL)
        
        const response = await axios.get(`${process.env.API_URL}depots`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })

        return response.data
    } catch (error: any) {
        console.error('Erreur lors de la récupération des dépôts:', error.response?.data || error.message)
        return []
    }
}

export const createDepot = async (data: z.infer<typeof DepotSchema>) => {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get("token")?.value
        const validatedData = DepotSchema.parse(data)
        
        // Conversion des noms de champs pour correspondre au backend
        const payload = {
            name: validatedData.name,
            needDoubleCheck: validatedData.needDoubleCheck,
            isActive: validatedData.isActive
        }
        
        console.log('Données envoyées à l\'API:', payload)
       
        const response = await axios.post(`${process.env.API_URL}depots`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })

        revalidatePath('/dashboard/depots')
        return { success: true, data: response.data }
    } catch (error: any) {
        console.error('Erreur complète:', error)
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors }
        }
        return { 
            success: false, 
            error: error.response?.data?.message || "Erreur lors de la création du dépôt" 
        }
    }
}

export const updateDepot = async (id: number, data: z.infer<typeof DepotSchema>) => {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get("token")?.value
        const validatedData = DepotSchema.parse(data)
       
        const response = await axios.put(`${process.env.API_URL}depots/${id}`, validatedData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        
        revalidatePath('/dashboard/depots')
        return { success: true, data: response.data }
    } catch (error: any) {
        console.error("Erreur détaillée:", error.response?.data || error.message)
        
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors }
        }
        
        return { 
            success: false, 
            error: error.response?.data?.message || "Erreur lors de la modification du dépôt" 
        }
    }
}

export const deleteDepot = async (id: number) => {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get("token")?.value
        const response = await axios.delete(`${process.env.API_URL}depots/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        revalidatePath('/dashboard/depots')
        return { success: true, data: response.data }
    } catch (error) {
        console.error("Erreur lors de la suppression du dépôt:", error)
        throw error
    }
}
