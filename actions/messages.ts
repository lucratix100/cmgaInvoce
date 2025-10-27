'use server'

import axios from 'axios'
import { cookies } from 'next/headers'

export async function getMessages(conversationId: string) {
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
    console.error('Erreur getMessages:', error)
    throw error
  }
}

export async function sendMessage(data: {
  conversationId: string
  content: string
  type: 'text' | 'image' | 'file'
  fileUrl?: string
}) {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get('accessToken')?.value || '{}').token

    if (!token) {
      throw new Error('Token d\'accès non trouvé')
    }

    const res = await axios.post(`${process.env.API_URL}messages`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    return res.data
  } catch (error) {
    console.error('Erreur sendMessage:', error)
    throw error
  }
} 