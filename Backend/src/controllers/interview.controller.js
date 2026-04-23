const pdf = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")




/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res, next) {
    try {
        let resumeContent = ""
        let resumeWarning = null
        
        // Handle optional resume file
        if (req.file && req.file.buffer) {
            if (req.file.mimetype !== "application/pdf") {
                return res.status(400).json({
                    message: "Only PDF resume files are supported right now."
                })
            }

            try {
                const pdfData = await pdf(req.file.buffer)
                resumeContent = (pdfData.text || "").trim()
            } catch (pdfError) {
                resumeWarning = "Uploaded PDF could not be parsed, continuing without resume content."
            }
        }

        const { selfDescription, jobDescription } = req.body
        const normalizedSelfDescription = (selfDescription || "").trim()
        const normalizedJobDescription = (jobDescription || "").trim()

        if (!normalizedJobDescription) {
            return res.status(400).json({
                message: "Please provide jobDescription"
            })
        }

        let interViewReportByAi
        try {
            interViewReportByAi = await generateInterviewReport({
                resume: resumeContent,
                selfDescription: normalizedSelfDescription,
                jobDescription: normalizedJobDescription
            })
        } catch (aiError) {
            aiError.statusCode = aiError.statusCode || 502
            throw aiError
        }

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeContent,
            selfDescription: normalizedSelfDescription,
            jobDescription: normalizedJobDescription,
            ...interViewReportByAi
        })

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport,
            ...(resumeWarning ? { warning: resumeWarning } : {})
        })
    } catch (err) {
        console.error("Generate interview report error:", err)
        next(err)
    }
}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res, next) {
    try {
        const { interviewId } = req.params

        const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })
    } catch (err) {
        console.error("Get interview report error:", err)
        next(err)
    }
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res, next) {
    try {
        const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        })
    } catch (err) {
        console.error("Get all interview reports error:", err)
        next(err)
    }
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findById(interviewReportId)

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }