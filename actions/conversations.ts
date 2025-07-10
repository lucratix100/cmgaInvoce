'use server'

import axios from 'axios'
import { cookies } from 'next/headers'

export async function getConversations() {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get('accessToken')?.value || '{}').token

    if (!token) {
      throw new Error('Token d\'accès non trouvé')
    }

    const res = await axios.get(`${process.env.API_URL}conversations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })
    return res.data
  } catch (error) {
    console.error('Erreur getConversations:', error)
    throw error
  }
}

export async function createConversation(data: {
  type: 'private' | 'group'
  name?: string
  participantIds: string[]
}) {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get('accessToken')?.value || '{}').token

    if (!token) {
      throw new Error('Token d\'accès non trouvé')
    }

    // Convertir les participantIds en nombres
    const dataToSend = {
      ...data,
      participantIds: data.participantIds.map(id => Number(id))
    }

    const res = await axios.post(`${process.env.API_URL}conversations`, dataToSend, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    return res.data
  } catch (error: any) {

    console.error('Erreur complète:', error)
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Headers:', error.response.headers)
      console.error('Data:', error.response.data)
    } else if (error.request) {
      console.error('Pas de réponse reçue:', error.request)
    } else {
      console.error('Erreur de configuration:', error.message)
    }

    throw error
  }
}

export async function getConversationMessages(conversationId: string) {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get('accessToken')?.value || '{}').token

    if (!token) {
      throw new Error('Token d\'accès non trouvé')
    }

    const res = await axios.get(`${process.env.API_URL}conversations/${conversationId}/messages`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })
    return res.data
  } catch (error) {
    console.error('Erreur getConversationMessages:', error)
    throw error
  }
} 