const BASE_URL = 'http://localhost:8080/api'

const getHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

export const authService = {
  register: async (username, email, password) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, email, password }),
    })
    if (!res.ok) throw new Error('Registration failed')
    return res.json()
  },

  login: async (username, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) throw new Error('Invalid credentials')
    return res.json()
  },
}

export const gameService = {
  search: async (query) => {
    const res = await fetch(`${BASE_URL}/games/search?query=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error('Search failed')
    return res.json()
  },
}

export const logService = {
  getLogs: async () => {
    const res = await fetch(`${BASE_URL}/logs`, {
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error('Failed to fetch logs')
    return res.json()
  },

  addLog: async (gameId, status, rating) => {
    const res = await fetch(`${BASE_URL}/logs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ gameId, status, rating }),
    })
    if (!res.ok) throw new Error('Failed to add log')
    return res.json()
  },

  updateLog: async (id, status, rating) => {
    const res = await fetch(`${BASE_URL}/logs/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status, rating }),
    })
    if (!res.ok) throw new Error('Failed to update log')
    return res.json()
  },

  deleteLog: async (id) => {
    const res = await fetch(`${BASE_URL}/logs/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error('Failed to delete log')
  },
}