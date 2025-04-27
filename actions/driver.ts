'use server'

import axios from 'axios'
import { cookies } from 'next/headers'
import { DriverSchema } from '@/schemas'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

export const getDrivers = async () => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || '{}').token
        
        const response = await axios.get(`${process.env.API_URL}drivers`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        return response.data
    } catch (error) {
        console.error("Erreur lors de la récupération des conducteurs:", error)
        throw error
    }
}

export const createDriver = async (data: z.infer<typeof DriverSchema>) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || '{}').token

        const validatedData = DriverSchema.parse(data)
        
        const response = await axios.post(`${process.env.API_URL}drivers`, validatedData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        revalidatePath('/dashboard/drivers')
        return { success: true, data: response.data }
    } catch (error: any) {
        console.error("Erreur détaillée:", error.response?.data || error.message)
        
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors }
        }
        
        return { 
            success: false, 
            error: error.response?.data?.message || "Erreur lors de la création du conducteur" 
        }
    }

}

export const updateDriver = async (id: number, data: z.infer<typeof DriverSchema>) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || '{}').token
        const validatedData = DriverSchema.parse(data)

        console.log('Données envoyées pour mise à jour:', validatedData)

        const response = await axios.put(`${process.env.API_URL}drivers/${id}`, validatedData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        revalidatePath('/dashboard/drivers')
        return { success: true, data: response.data }
    } catch (error: any) {
        console.error("Erreur détaillée:", error.response?.data || error.message)
        
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors }
        }
        
        return { 
            success: false, 
            error: error.response?.data?.message || "Erreur lors de la modification du conducteur" 
        }
    }
}   

export const deleteDriver = async (id: number) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || '{}').token

        const response = await axios.delete(`${process.env.API_URL}drivers/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        revalidatePath('/dashboard/drivers')
        return { success: true, data: response.data }
    } catch (error: any) {
        return { 
            success: false, 
            error: error.response?.data?.message || "Erreur lors de la suppression du conducteur" 
        }
    }
}