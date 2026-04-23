import axios from "axios";

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
    timeout: 20000,
})

const getApiErrorMessage = (err, fallbackMessage) => {
    if (err.code === "ERR_NETWORK") {
        return "Cannot reach backend server. Make sure Backend is running on port 3000."
    }
    return err.response?.data?.message || err.message || fallbackMessage
}


/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */
/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */
export const generateInterviewReport = async ({ jobDescription, selfDescription, resumeFile }) => {
    try {
        const formData = new FormData()
        formData.append("jobDescription", jobDescription)
        formData.append("selfDescription", selfDescription)
        
        // Only append resume if file is provided
        if (resumeFile) {
            formData.append("resume", resumeFile)
        }

        const response = await api.post("/api/interview/", formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        })

        return response.data
    } catch (err) {
        const errorMessage = getApiErrorMessage(err, "Failed to generate interview report")
        console.error("Generate Interview Error:", errorMessage)
        throw new Error(errorMessage)
    }

}


/**
 * @description Service to get interview report by interviewId.
 */
export const getInterviewReportById = async (interviewId) => {
    try {
        const response = await api.get(`/api/interview/report/${interviewId}`)
        return response.data
    } catch (err) {
        const errorMessage = getApiErrorMessage(err, "Failed to fetch interview report")
        console.error("Get Interview By ID Error:", errorMessage)
        throw new Error(errorMessage)
    }
}


/**
 * @description Service to get all interview reports of logged in user.
 */
export const getAllInterviewReports = async () => {
    try {
        const response = await api.get("/api/interview/")
        return response.data
    } catch (err) {
        const errorMessage = getApiErrorMessage(err, "Failed to fetch interview reports")
        console.error("Get All Interviews Error:", errorMessage)
        throw new Error(errorMessage)
    }
}


/**
 * @description Service to generate resume pdf based on user self description, resume content and job description.
 */
export const generateResumePdf = async ({ interviewReportId }) => {
    try {
        const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`, null, {
            responseType: "blob"
        })

        return response.data
    } catch (err) {
        const errorMessage = getApiErrorMessage(err, "Failed to generate resume PDF")
        console.error("Generate Resume PDF Error:", errorMessage)
        throw new Error(errorMessage)
    }
}