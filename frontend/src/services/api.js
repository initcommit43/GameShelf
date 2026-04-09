const BASE_URL = 'http://localhost:8080/api'

const getHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

const parseError = async (res) => {
  try {
    const data = await res.json()
    return data.message || data.error || 'Something went wrong'
  } catch {
    return 'Something went wrong'
  }
}

export const authService = {
  register: async (username, email, password) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, email, password }),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  },

  login: async (username, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) throw new Error(await parseError(res))
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

  getTrending: async () => {
    const res = await fetch(`${BASE_URL}/games/trending`)
    if (!res.ok) throw new Error('Failed to fetch trending games')
    return res.json()
  },

  getDetails: async (igdbId) => {
    const res = await fetch(`${BASE_URL}/games/${igdbId}`, { headers: getHeaders() })
    if (!res.ok) throw new Error('Failed to fetch game details')
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

  addLog: async ({ igdbId, title, coverUrl, status, rating }) => {
    const res = await fetch(`${BASE_URL}/logs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ igdbId, title, coverUrl, status, rating }),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  },

  updateLog: async (id, status, rating) => {
    const res = await fetch(`${BASE_URL}/logs/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status, rating: rating ?? null }),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  },

  deleteLog: async (id) => {
    const res = await fetch(`${BASE_URL}/logs/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!res.ok) throw new Error(await parseError(res))
  },
}
