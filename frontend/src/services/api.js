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

// Any 401 clears auth state and redirects to login (expired / invalid token)
const guardAuth = (res) => {
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    window.location.href = '/login'
    throw new Error('Session expired. Please log in again.')
  }
  return res
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
    const res = guardAuth(await fetch(`${BASE_URL}/games/search?query=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    }))
    if (!res.ok) throw new Error('Search failed')
    return res.json()
  },

  getTrending: async () => {
    const res = await fetch(`${BASE_URL}/games/trending`)
    if (!res.ok) throw new Error('Failed to fetch trending games')
    return res.json()
  },

  getRecommendations: async () => {
    const res = guardAuth(await fetch(`${BASE_URL}/games/recommendations`, { headers: getHeaders() }))
    if (!res.ok) throw new Error('Failed to fetch recommendations')
    return res.json()
  },

  browse: async (sort = 'rating', offset = 0, filters = {}) => {
    const params = new URLSearchParams({ sort, offset })
    if (filters.genreId    != null) params.set('genreId',    filters.genreId)
    if (filters.platformId != null) params.set('platformId', filters.platformId)
    if (filters.minRating  != null) params.set('minRating',  filters.minRating)
    if (filters.yearFrom   != null) params.set('yearFrom',   filters.yearFrom)
    if (filters.yearTo     != null) params.set('yearTo',     filters.yearTo)
    const res = guardAuth(await fetch(`${BASE_URL}/games/browse?${params}`, { headers: getHeaders() }))
    if (!res.ok) throw new Error('Failed to fetch games')
    return res.json()
  },

  getDetails: async (igdbId) => {
    const res = guardAuth(await fetch(`${BASE_URL}/games/${igdbId}`, { headers: getHeaders() }))
    if (!res.ok) throw new Error('Failed to fetch game details')
    return res.json()
  },

  getPrices: async (igdbId) => {
    const res = guardAuth(await fetch(`${BASE_URL}/games/${igdbId}/prices`, { headers: getHeaders() }))
    if (!res.ok) throw new Error('Failed to fetch prices')
    return res.json()
  },
}

export const userService = {
  getProfile: async () => {
    const res = guardAuth(await fetch(`${BASE_URL}/profile/me`, { headers: getHeaders() }))
    if (!res.ok) throw new Error('Failed to fetch profile')
    return res.json()
  },

  getFullProfile: async () => {
    const res = guardAuth(await fetch(`${BASE_URL}/profile/full`, { headers: getHeaders() }))
    if (!res.ok) throw new Error('Failed to fetch profile')
    return res.json()
  },

  uploadProfilePicture: async (file) => {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)
    const res = guardAuth(await fetch(`${BASE_URL}/profile/picture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }))
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  },
}

export const reviewService = {
  createOrUpdateReview: async (igdbId, { rating, reviewText, spoiler }) => {
    const res = guardAuth(await fetch(`${BASE_URL}/games/${igdbId}/review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rating, reviewText: reviewText || null, spoiler }),
    }))
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  },

  getGameReviews: async (igdbId, sort = 'newest') => {
    const res = guardAuth(await fetch(`${BASE_URL}/games/${igdbId}/reviews?sort=${sort}`, {
      headers: getHeaders(),
    }))
    if (!res.ok) throw new Error('Failed to fetch reviews')
    return res.json()
  },

  deleteReview: async (id) => {
    const res = guardAuth(await fetch(`${BASE_URL}/reviews/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }))
    if (!res.ok) throw new Error(await parseError(res))
  },

  getUserReviews: async (userId) => {
    const res = guardAuth(await fetch(`${BASE_URL}/users/${userId}/reviews`, {
      headers: getHeaders(),
    }))
    if (!res.ok) throw new Error('Failed to fetch reviews')
    return res.json()
  },
}

export const logService = {
  getLogs: async () => {
    const res = guardAuth(await fetch(`${BASE_URL}/logs`, { headers: getHeaders() }))
    if (!res.ok) throw new Error('Failed to fetch logs')
    return res.json()
  },

  addLog: async ({ igdbId, title, coverUrl, releaseYear, igdbRating, status, rating }) => {
    const res = guardAuth(await fetch(`${BASE_URL}/logs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ igdbId, title, coverUrl, releaseYear, igdbRating, status, rating }),
    }))
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  },

  updateLog: async (id, status, rating) => {
    const res = guardAuth(await fetch(`${BASE_URL}/logs/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status, rating: rating ?? null }),
    }))
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  },

  deleteLog: async (id) => {
    const res = guardAuth(await fetch(`${BASE_URL}/logs/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }))
    if (!res.ok) throw new Error(await parseError(res))
  },
}
