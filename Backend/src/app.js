const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

app.use(express.json())
app.use(cookieParser())

const allowedOrigins = new Set([
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://interview-ai-pink-ten.vercel.app"
])

const isLocalDevOrigin = (origin) => /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
            callback(null, true)
        } else {
            callback(null, false)
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")


/* using all the routes here */
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" })
})

app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

/* Error handling middleware */
app.use((err, req, res, next) => {
    console.error("Error:", err)
    const statusCode = err.statusCode || 500
    const message = err.message || "Internal Server Error"
    
    res.status(statusCode).json({
        message: message,
        error: process.env.NODE_ENV === "development" ? err : {}
    })
})

module.exports = app