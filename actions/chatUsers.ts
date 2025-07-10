'use server'

import axios from 'axios'
import { cookies } from 'next/headers'

export async function getChatUsers() {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get('accessToken')?.value || '{}').token

    if (!token) {
      throw new Error('Token d\'accès non trouvé')
    }
    const res = await axios.get(`${process.env.API_URL}chat/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })
    return res.data
  } catch (error: any) {
    console.error('Erreur complète:', error)
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Data:', error.response.data)
    } else if (error.request) {
      console.error('Pas de réponse reçue:', error.request)
    } else {
      console.error('Erreur de configuration:', error.message)
    }
    throw error
  }
} 