import axios from "axios"

// Determine API URL based on environment
const getApiUrl = () => {
    // If VITE_API_URL is set (from .env file or Vercel environment variables)
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace(/\/+$/, "")
    }
    
    // If we're in production (Vercel deployment)
    if (import.meta.env.PROD) {
        return "https://interview-ai-backend-v0wx.onrender.com"
    }
    
    // Default to the same host machine on port 3000 for development
    const host = window.location.hostname || "localhost"
    return `http://${host}:3000`
}

const API_URL = getApiUrl()

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    timeout: 15000
})

function getApiErrorMessage(err, fallbackMessage) {
    if (err.code === "ERR_NETWORK") {
        return "Cannot reach backend server. Make sure Backend is running on port 3000."
    }
    return err.response?.data?.message || err.message || fallbackMessage
}

export async function register({ username, email, password }) {
    try {
        const response = await api.post('/api/auth/register', {
            username, email, password
        })
        return response.data
    } catch (err) {
        const errorMessage = getApiErrorMessage(err, "Registration failed")
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
        const errorMessage = getApiErrorMessage(err, "Login failed")
        console.error("Login Error:", errorMessage)
        throw new Error(errorMessage)
    }
}

export async function logout() {
    try {
        const response = await api.get("/api/auth/logout")
        return response.data
    } catch (err) {
        const errorMessage = getApiErrorMessage(err, "Logout failed")
        console.error("Logout Error:", errorMessage)
        throw new Error(errorMessage)
    }
}

export async function getMe() {
    try {
        const response = await api.get("/api/auth/get-me")
        return response.data
    } catch (err) {
        const errorMessage = getApiErrorMessage(err, "Failed to fetch user")
        console.error("GetMe Error:", errorMessage)
        throw new Error(errorMessage)
    }
}