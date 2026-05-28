import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const API_BASE = '/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const getToken = () => localStorage.getItem('tf_token')

  const apiFetch = useCallback(async (path, options = {}) => {
    const token = getToken()
    const res = await fetch(API_BASE + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Request failed')
    return data
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    apiFetch('/auth/me')
      .then(d => setUser(d.user))
      .catch(() => localStorage.removeItem('tf_token'))
      .finally(() => setLoading(false))
  }, [apiFetch])

  const login = async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem('tf_token', data.token)
    setUser(data.user)
    return data
  }

  const register = async (name, email, password) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    localStorage.setItem('tf_token', data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('tf_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
