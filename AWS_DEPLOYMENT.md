# AWS Deployment Guide (Frontend + Backend)

This guide deploys:
- `Backend` on AWS Elastic Beanstalk (Docker)
- `Frontend` on S3 + CloudFront

## 1) Prerequisites

- Install AWS CLI v2: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- Configure credentials:
  - `aws configure`
- Install zip utility (or use Windows "Send to ZIP")

## 2) Deploy Backend (Elastic Beanstalk)

### A. Create deployment zip from `Backend`

From `Backend` folder, include:
- `Dockerfile`
- `package.json`, `package-lock.json`
- `server.js`
- `src/`

Do not include:
- `.env`
- `node_modules/`

### B. Create Elastic Beanstalk app/environment

In AWS Console:
- Open Elastic Beanstalk
- Create application: `interview-ai-backend`
- Platform: `Docker`
- Environment tier: `Web server`

### C. Set environment variables in Elastic Beanstalk

Configuration -> Software -> Environment properties:

- `PORT=3000`
- `NODE_ENV=production`
- `MONGO_URI=<your mongodb uri>`
- `JWT_SECRET=<your jwt secret>`
- `GOOGLE_GENAI_API_KEY=<your google ai api key>`
- `CORS_ALLOWED_ORIGINS=https://<your-cloudfront-domain-or-custom-frontend-domain>`

You can add multiple origins comma-separated:
`https://site1.com,https://site2.com`

### D. Upload backend zip and deploy

Use "Upload and deploy" in Elastic Beanstalk console.

After deploy, test:
- `https://<your-eb-domain>/api/health`

It should return:
`{ "status": "ok" }`

## 3) Deploy Frontend (S3 + CloudFront)

### A. Build frontend

Inside `Frontend`:

1. Create `.env.production`:
   - `VITE_API_URL=https://<your-eb-domain>`
2. Run:
   - `npm install`
   - `npm run build`

Build output is `Frontend/dist`.

### B. S3 static hosting

In AWS Console:
- Create S3 bucket (unique name), for example `interview-ai-frontend-prod`
- Keep "Block all public access" ON (recommended with CloudFront OAC)

### C. CloudFront distribution

- Origin: your S3 bucket
- Default root object: `index.html`
- Enable SPA fallback:
  - Custom error response for 403 and 404 -> `/index.html` with 200

### D. Upload frontend files

Upload contents of `Frontend/dist` to S3 bucket root.

### E. Invalidate CloudFront cache

Create invalidation:
- Path: `/*`

## 4) Final wiring

1. Copy CloudFront domain: `https://<cloudfront-domain>`
2. Add it to backend `CORS_ALLOWED_ORIGINS` in Elastic Beanstalk
3. Redeploy backend
4. Open frontend URL and test login/register/report generation

## 5) Quick troubleshooting

- Browser says network error:
  - Check backend URL in frontend `VITE_API_URL`
  - Check backend CORS (`CORS_ALLOWED_ORIGINS`)
  - Check backend health endpoint
- Login fails with cookies:
  - Ensure frontend and backend are both HTTPS
  - Ensure backend CORS has `credentials: true` (already configured)
