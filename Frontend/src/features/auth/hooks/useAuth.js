import { useContext } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout } from "../services/auth.api";

export const useAuth = () => {
    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading, error, setError } = context

    const handleLogin = async ({ email, password }) => {
        setLoading(true)
        setError(null)
        try {
            const data = await login({ email, password })
            setUser(data.user)
            return true
        } catch (err) {
            const errorMsg = err.message || "Login failed"
            setError(errorMsg)
            console.error("Login error:", errorMsg)
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async ({ username, email, password }) => {
        setLoading(true)
        setError(null)
        try {
            const data = await register({ username, email, password })
            setUser(data.user)
            return true
        } catch (err) {
            const errorMsg = err.message || "Registration failed"
            setError(errorMsg)
            console.error("Register error:", errorMsg)
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        setLoading(true)
        setError(null)
        try {
            await logout()
            setUser(null)
            return true
        } catch (err) {
            const errorMsg = err.message || "Logout failed"
            setError(errorMsg)
            console.error("Logout error:", errorMsg)
            return false
        } finally {
            setLoading(false)
        }
    }

    return { user, loading, error, handleRegister, handleLogin, handleLogout }
}