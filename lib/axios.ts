import axios from 'axios'

const api = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:3333/api/',
  headers: {
    'Accept': 'application/json'
  }
})

export default api 