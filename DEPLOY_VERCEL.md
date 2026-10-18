# Deploying AI Safety Sentinel 360 to Vercel 🚀

This guide explains how to deploy **AI Safety Sentinel 360** to **Vercel** with full Single-Page Application (SPA) routing, interactive CCTV monitoring, and live camera helmet compliance checking.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          Vercel Edge Network           │
                      │   (React + Vite + Tailwind + SCADA)    │
                      └──────────────────┬─────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│       Mode 1: Standalone Demo        │     │       Mode 2: Cloud Full-Stack       │
│  - Edge-resilient fallback data      │     │  - FastAPI backend on Render/Railway │
│  - Client-side cranial ROI analysis  │     │  - YOLOv8 inference & SQLite audit   │
│  - Red indication signal operational │     │  - Configured via VITE_API_URL       │
│  - No external backend required      │     │  - Full live pipeline streaming      │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

---

## Option 1: Deploy via GitHub (Recommended — 2 Minutes)

This is the fastest, standard method to deploy to Vercel:

### Step 1: Push your code to GitHub
Run the following in PowerShell / terminal inside `micro.dev`:

```powershell
git add .
git commit -m "feat: complete industrial safety monitoring system with vercel deployment config"
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
git branch -M main
git push -u origin main
```

### Step 2: Import into Vercel
1. Go to **[https://vercel.com/new](https://vercel.com/new)**.
2. Sign in with GitHub and select your newly created repository.
3. Vercel automatically detects the root `vercel.json` configuration:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm --prefix frontend run build`
   - **Output Directory**: `frontend/dist`
4. Click **Deploy**.
5. In ~45 seconds, your live production application will be live at `https://<your-project>.vercel.app`!

---

## Option 2: Deploy Directly via Vercel CLI

If you prefer to deploy directly from your local terminal:

1. Open PowerShell in `c:\Users\Deepika v\micro.dev\frontend`.
2. Run:
   ```powershell
   npx vercel
   ```
3. Follow the one-time interactive prompts:
   - **Log in to Vercel**: Choose GitHub or Email to authenticate in your browser.
   - **Set up and deploy?**: `Y`
   - **Which scope?**: Select your account.
   - **Link to existing project?**: `N`
   - **Project name**: `ai-safety-sentinel-360`
   - **Directory**: `./` (current directory)
4. To deploy directly to production:
   ```powershell
   npx vercel --prod
   ```

---

## Connecting a Cloud Python Backend (Optional)

If you wish to host the Python FastAPI + YOLOv8 backend on the cloud (e.g. [Render](https://render.com), [Railway](https://railway.app), [Fly.io](https://fly.io), or [Hugging Face Spaces](https://huggingface.co/spaces)):

1. Deploy the `backend/` folder as a Python web service (Command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`).
2. In your Vercel Project Dashboard:
   - Go to **Settings** > **Environment Variables**.
   - Add `VITE_API_URL` with your backend URL (e.g., `https://sentinel-api.onrender.com/api`).
   - Click **Save** and trigger a **Redeploy**.

---

## Key Features Included in this Vercel Deployment

- ✅ **Automatic SPA Rewrites**: Deep links like `/monitoring`, `/zones`, `/ppe`, `/incidents`, `/analytics`, and `/settings` reload cleanly without 404 errors.
- ✅ **CAM-LIVE Helmet Verification**: Works instantly using the user's webcam or high-contrast synthetic camera fallback.
- ✅ **Red Indication Signal**: Immediately flashes when safety helmet non-compliance is detected.
- ✅ **Interactive Toggles**: Evaluators can toggle `NO_HELMET`, `WEARING_HELMET`, or `AUTO AI SCAN` on the fly.
- ✅ **Zero White Screen Guarantee**: If the backend is not connected, the edge fallback gracefully populates realistic telemetry, zone envelopes, and OSHA audit metrics.
