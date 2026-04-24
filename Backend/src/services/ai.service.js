const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY?.trim()
})

function normalizeText(value, maxChars) {
    const text = String(value || "").trim()
    if (!maxChars || text.length <= maxChars) return text
    return `${text.slice(0, maxChars)}\n\n[truncated]`
}

function parseJsonSafely(rawText) {
    const text = String(rawText || "").trim()
    if (!text) throw new Error("AI service returned empty response.")

    try {
        return JSON.parse(text)
    } catch (parseError) {
        const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
        if (fencedMatch?.[1]) {
            return JSON.parse(fencedMatch[1])
        }
        throw parseError
    }
}

function isTokenOrSizeError(error) {
    const message = `${error?.message || ""}`.toLowerCase()
    return (
        message.includes("token") ||
        message.includes("context") ||
        message.includes("resource_exhausted") ||
        message.includes("too large") ||
        message.includes("request size")
    )
}

function isSchemaModeError(error) {
    const message = `${error?.message || ""}`.toLowerCase()
    return (
        message.includes("response_schema") ||
        message.includes("response schema") ||
        message.includes("invalid argument") ||
        message.includes("schema")
    )
}

function isTransientProviderError(error) {
    const message = `${error?.message || ""}`.toLowerCase()
    const status = error?.status || error?.statusCode
    return (
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        message.includes("resource_exhausted") ||
        message.includes("rate limit") ||
        message.includes("timed out") ||
        message.includes("timeout") ||
        message.includes("temporarily unavailable")
    )
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function generateWithConfig(prompt, config) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config
    })

    return parseJsonSafely(response.text)
}

async function generateStructuredReport(prompt) {
    const schemaConfig = {
        responseMimeType: "application/json",
        responseSchema: zodToJsonSchema(interviewReportSchema),
    }

    // First preference: schema mode (most stable structure)
    try {
        return await generateWithConfig(prompt, schemaConfig)
    } catch (schemaError) {
        // If schema mode is rejected by provider/runtime, retry without schema constraint.
        if (isSchemaModeError(schemaError)) {
            const noSchemaConfig = { responseMimeType: "application/json" }
            return await generateWithConfig(prompt, noSchemaConfig)
        }
        throw schemaError
    }
}

function toFriendlyAiError(error) {
    const rawMessage = error?.message || "Unknown AI service error"
    const lowerMessage = rawMessage.toLowerCase()

    if (rawMessage.includes("reported as leaked")) {
        const leakedKeyError = new Error("Google AI API key is blocked because it was reported as leaked. Replace GOOGLE_GENAI_API_KEY in Backend/.env with a new valid key.")
        leakedKeyError.statusCode = 503
        return leakedKeyError
    }

    if (rawMessage.includes("PERMISSION_DENIED") || error?.status === 403) {
        const permissionError = new Error("Google AI API key is invalid or does not have permission to use Gemini models.")
        permissionError.statusCode = 503
        return permissionError
    }

    if (rawMessage.includes("API key not valid")) {
        const invalidKeyError = new Error("Google AI API key is not valid. Update GOOGLE_GENAI_API_KEY in Backend/.env.")
        invalidKeyError.statusCode = 503
        return invalidKeyError
    }

    if (lowerMessage.includes("resource_exhausted") || error?.status === 429) {
        const quotaError = new Error("Google AI quota/rate limit reached. Please wait a minute and try again.")
        quotaError.statusCode = 503
        return quotaError
    }

    if (lowerMessage.includes("high demand") || lowerMessage.includes("unavailable") || error?.status === 503) {
        const unavailableError = new Error("Google AI is temporarily under high demand. Please retry in 30-60 seconds.")
        unavailableError.statusCode = 503
        return unavailableError
    }

    const fallbackError = new Error("AI service request failed. Please try again later.")
    fallbackError.statusCode = 502
    return fallbackError
}


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const normalizedResume = normalizeText(resume, 12000)
    const normalizedSelfDescription = normalizeText(selfDescription, 4000)
    const normalizedJobDescription = normalizeText(jobDescription, 8000)


    // const prompt = `Generate an interview report for a candidate with the following details:
    //                     Resume: ${resume}
    //                     Self Description: ${selfDescription}
    //                     Job Description: ${jobDescription}
    //                 `


    const prompt = `
            Generate a detailed interview preparation report for a candidate.
            
            CRITICAL: You MUST return proper JSON objects in arrays, NOT flat arrays with string keys.
            
            WRONG format: ["question", "text", "answer", "text"]
            CORRECT format: [{"question": "text", "intention": "text", "answer": "text"}]
            
            STRICT INSTRUCTIONS:
            - technicalQuestions: array of OBJECTS each with "question", "intention", and "answer" string fields
            - behavioralQuestions: array of OBJECTS each with "question", "intention", and "answer" string fields
            - skillGaps: array of OBJECTS each with "skill" string and "severity" enum ("low"/"medium"/"high")
            - preparationPlan: array of OBJECTS each with "day" number, "focus" string, and "tasks" array of strings
            - Keep responses concise and practical; avoid long paragraphs
            - Generate 3-4 technicalQuestions and 2-3 behavioralQuestions
            - Generate 3-4 skillGaps
            - Generate exactly 5 days in preparationPlan
            - Calculate matchScore as a number between 0 and 100

            Resume: ${normalizedResume}
            Self Description: ${normalizedSelfDescription}
            Job Description: ${normalizedJobDescription}
        `



    const retryPrompt = `
        Generate the same interview report JSON format as instructed earlier.
        Keep output concise but complete.

        Resume: ${normalizeText(normalizedResume, 4000)}
        Self Description: ${normalizeText(normalizedSelfDescription, 2000)}
        Job Description: ${normalizeText(normalizedJobDescription, 4000)}
    `

    // Attempt sequence:
    // 1) full prompt in schema mode (with schema fallback if needed)
    // 2) compact prompt when token/context issues happen
    // 3) transient retries with backoff for provider instability/rate limits
    const attempts = [
        { prompt, label: "full" },
        { prompt: retryPrompt, label: "compact" },
        { prompt: retryPrompt, label: "compact-retry-2" },
    ]

    let lastError
    for (let i = 0; i < attempts.length; i += 1) {
        const attempt = attempts[i]
        try {
            if (i > 0) {
                await sleep(600 * i)
            }
            return await generateStructuredReport(attempt.prompt)
        } catch (error) {
            lastError = error
            const shouldContinue =
                isTokenOrSizeError(error) ||
                isTransientProviderError(error) ||
                isSchemaModeError(error)

            if (!shouldContinue) break

            console.error(`[AI] Attempt "${attempt.label}" failed:`, {
                status: error?.status || error?.statusCode,
                message: error?.message
            })
        }
    }

    throw toFriendlyAiError(lastError)


}



async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(resumePdfSchema),
            }
        })

        const jsonContent = JSON.parse(response.text)
        const pdfBuffer = await generatePdfFromHtml(jsonContent.html)
        return pdfBuffer
    } catch (error) {
        throw toFriendlyAiError(error)
    }

}

module.exports = { generateInterviewReport, generateResumePdf }