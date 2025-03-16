'use server'

import axios from "axios"
import { cookies } from "next/headers"

export const getBls = async (invoiceNumber: string) => {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    try {
        const response = await axios.get(`${process.env.API_URL}invoices/${invoiceNumber}/bls`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        return response.data
    } catch (error) {
        console.error('Erreur lors de la récupération des BLs:', error)
        return []
    }
}