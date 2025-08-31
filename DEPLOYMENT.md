# 🚀 Social Media App Deployment Guide

## Quick Deploy (5 Minutes)

### Step 1: Deploy Backend (Railway)

1. **Sign up at [Railway.app](https://railway.app)**
2. **Click "Deploy from GitHub"**
3. **Connect your GitHub repo**
4. **Select the `server` folder**
5. **Add Environment Variables:**
   ```
   DATABASE_URL=postgresql://...  (Railway will provide this)
   JWT_SECRET=your-super-secret-64-char-random-string
   CORS_ORIGIN=https://your-app.vercel.app
   PORT=3001
   SOCKET_CORS_ORIGIN=https://your-app.vercel.app
   ```
6. **Deploy** → Railway will give you a URL like `https://yourapp.railway.app`

### Step 2: Deploy Frontend (Vercel)

1. **Sign up at [Vercel.com](https://vercel.com)**
2. **Click "Import Git Repository"**
3. **Select your GitHub repo**
4. **Configure:**
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. **Add Environment Variables:**
   ```
   VITE_API_URL=https://your-backend.railway.app
   VITE_SOCKET_URL=https://your-backend.railway.app
   ```
6. **Deploy** → Vercel gives you `https://your-app.vercel.app`

### Step 3: Update Backend CORS

1. **Go back to Railway**
2. **Update environment variables:**
   ```
   CORS_ORIGIN=https://your-actual-vercel-url.vercel.app
   SOCKET_CORS_ORIGIN=https://your-actual-vercel-url.vercel.app
   ```
3. **Redeploy backend**

## 🎉 Your Social Media App is LIVE!

### Features Available:
- ✅ User Registration & Login
- ✅ Post Creation with Images
- ✅ Like & Comment System
- ✅ Real-time Chat & Notifications
- ✅ Stories (24h expiry)
- ✅ Short Videos (TikTok-style)
- ✅ Hashtags & Search
- ✅ Bookmarks & Achievements
- ✅ User Profiles & Following
- ✅ Dark/Light Mode

### Alternative Deployment Options:

#### Option 2: Netlify + Render
- **Frontend:** [Netlify](https://netlify.com)
- **Backend:** [Render](https://render.com)

#### Option 3: Heroku (Paid)
- **Full Stack:** Deploy both frontend and backend to Heroku

#### Option 4: DigitalOcean App Platform
- **Full Stack:** One-click deployment with auto-scaling

#### Option 5: AWS/Google Cloud (Advanced)
- **Full Control:** Use EC2/Compute Engine with Docker

### Database Options:
1. **Railway PostgreSQL** (Free 500MB)
2. **Supabase** (Free 500MB)
3. **PlanetScale** (Free 5GB)
4. **Neon** (Free 3GB)

### Custom Domain (Optional):
1. **Buy domain:** Namecheap, GoDaddy, etc.
2. **Add to Vercel:** Project Settings → Domains
3. **Update DNS:** Point domain to Vercel

### Monitoring & Analytics:
- **Uptime:** Use Railway/Vercel built-in monitoring
- **Analytics:** Google Analytics, PostHog
- **Error Tracking:** Sentry

## Need Help?
Your social media app is production-ready with all major features! 🎊