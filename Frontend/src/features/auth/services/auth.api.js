import axios from "axios"

// Determine API URL based on environment
const getApiUrl = () => {
    // If VITE_API_URL is set (from .env file or Vercel environment variables)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL
    }
    
    // If we're in production (Vercel deployment)
    if (import.meta.env.PROD) {
        return "https://interview-ai-backend-v0wx.onrender.com"
    }
    
    // Default to localhost for development
    return "http://localhost:3000"
}

const API_URL = getApiUrl()

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
})

export async function register({ username, email, password }) {
    try {
        const response = await api.post('/api/auth/register', {
            username, email, password
        })
        return response.data
    } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || "Registration failed"
        console.error("Register Error:", errorMessage)
        throw new Error(errorMessage)
    }
}

export async function login({ email, password }) {
    try {
        const response = await api.post("/api/auth/login", {
            email, password
        })
        return response.data
    } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || "Login failed"
        console.error("Login Error:", errorMessage)
        throw new Error(errorMessage)
    }
}

export async function logout() {
    try {
        const response = await api.get("/api/auth/logout")
        return response.data
    } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || "Logout failed"
        console.error("Logout Error:", errorMessage)
        throw new Error(errorMessage)
    }
}

export async function getMe() {
    try {
        const response = await api.get("/api/auth/get-me")
        return response.data
    } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || "Failed to fetch user"
        console.error("GetMe Error:", errorMessage)
        throw new Error(errorMessage)
    }
}