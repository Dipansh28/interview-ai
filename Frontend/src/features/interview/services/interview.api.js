import axios from "axios";

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
    withCredentials: true,
})


/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */
/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */
export const generateInterviewReport = async ({ jobDescription, selfDescription, resumeFile }) => {

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

}


/**
 * @description Service to get interview report by interviewId.
 */
export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(`/api/interview/report/${interviewId}`)

    return response.data
}


/**
 * @description Service to get all interview reports of logged in user.
 */
export const getAllInterviewReports = async () => {
    const response = await api.get("/api/interview/")

    return response.data
}


/**
 * @description Service to generate resume pdf based on user self description, resume content and job description.
 */
export const generateResumePdf = async ({ interviewReportId }) => {
    const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`, null, {
        responseType: "blob"
    })

    return response.data
}