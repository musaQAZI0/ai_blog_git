# Render Deployment Guide

Complete guide to deploy the Medical Blog System to Render.

---

## 🎯 Why Render?

**Benefits:**
- ✅ Free tier available (750 hours/month)
- ✅ Automatic SSL certificates
- ✅ Easy CI/CD with Git integration
- ✅ Support for environment variables
- ✅ Built-in health checks
- ✅ DDoS protection
- ✅ Global CDN
- ✅ Automatic scaling (paid plans)

**Comparison with Vercel:**
- Render: More control, Docker support, persistent storage
- Vercel: Better Next.js integration, edge functions, faster deployments

---

## 📋 Prerequisites

- Render account (sign up at https://render.com)
- GitHub/GitLab repository with your code
- Firebase project configured (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md))
- Environment variables ready (from [.env.local](.env.local))

---

## 🚀 Deployment Methods

### Method 1: Web Dashboard (Recommended for Beginners)

#### Step 1: Prepare Your Repository

1. **Commit all changes to Git**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Ensure you have a `.gitignore` file**
   ```
   node_modules/
   .next/
   .env.local
   .DS_Store
   ```

#### Step 2: Create Web Service on Render

1. **Log in to Render Dashboard**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Connect your GitHub/GitLab account
   - Select your repository
   - Click "Connect"

3. **Configure Service**

   **Basic Settings:**
   - **Name**: `medical-blog-skrzypecki`
   - **Region**: Choose closest to your users (e.g., `Frankfurt (EU Central)`)
   - **Branch**: `main`
   - **Runtime**: `Node`

   **Build & Deploy:**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: `18` (or add in environment: `NODE_VERSION=18`)

4. **Add Environment Variables**

   Click "Environment" → "Add Environment Variable" and add all from `.env.local`:

   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Firebase Admin
   FIREBASE_ADMIN_PROJECT_ID=your_project_id
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
   FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour_Key_Here\n-----END PRIVATE KEY-----\n

   # AI Providers
   OPENAI_API_KEY=sk-your_openai_key
   ANTHROPIC_API_KEY=sk-ant-your_anthropic_key

   # Email Provider
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.your_sendgrid_key
   SENDGRID_FROM_EMAIL=noreply@skrzypecki.pl

   # Storage
   STORAGE_PROVIDER=firebase

   # App Configuration
   NEXT_PUBLIC_APP_URL=https://medical-blog-skrzypecki.onrender.com
   NEXT_PUBLIC_PATIENT_BLOG_URL=https://okulistykaakademicka.pl
   NEXT_PUBLIC_PROFESSIONAL_BLOG_URL=https://www.skrzypecki.pl
   ADMIN_EMAIL=admin@skrzypecki.pl

   # Security
   EXPORT_API_SECRET=your_secure_random_string
   JWT_SECRET=your_jwt_secret
   ENCRYPTION_KEY=your_32_character_key

   # Analytics
   NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX

   # Node Environment
   NODE_ENV=production
   NODE_VERSION=18
   ```

5. **Create the Service**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Your app will be live at: `https://medical-blog-skrzypecki.onrender.com`

---

### Method 2: Infrastructure as Code (render.yaml)

For more control and easier updates, use a `render.yaml` file.

#### Step 1: Create render.yaml

Create this file in your project root:

```yaml
services:
  # Main Web Service
  - type: web
    name: medical-blog
    env: node
    region: frankfurt  # Choose: oregon, frankfurt, singapore
    plan: free  # or starter, standard, pro
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: NODE_VERSION
        value: 18
      - key: NEXT_PUBLIC_FIREBASE_API_KEY
        sync: false
      - key: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
        sync: false
      - key: NEXT_PUBLIC_FIREBASE_PROJECT_ID
        sync: false
      - key: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
        sync: false
      - key: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
        sync: false
      - key: NEXT_PUBLIC_FIREBASE_APP_ID
        sync: false
      - key: FIREBASE_ADMIN_PROJECT_ID
        sync: false
      - key: FIREBASE_ADMIN_CLIENT_EMAIL
        sync: false
      - key: FIREBASE_ADMIN_PRIVATE_KEY
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: EMAIL_PROVIDER
        value: sendgrid
      - key: SENDGRID_API_KEY
        sync: false
      - key: SENDGRID_FROM_EMAIL
        value: noreply@skrzypecki.pl
      - key: STORAGE_PROVIDER
        value: firebase
      - key: NEXT_PUBLIC_APP_URL
        value: https://medical-blog.onrender.com
      - key: ADMIN_EMAIL
        value: admin@skrzypecki.pl
      - key: EXPORT_API_SECRET
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: ENCRYPTION_KEY
        sync: false
```

**Note**: Variables with `sync: false` need to be set manually in Render Dashboard.

#### Step 2: Deploy with render.yaml

1. Commit the `render.yaml` file
2. Go to Render Dashboard → "New +" → "Blueprint"
3. Connect your repository
4. Render will automatically detect `render.yaml`
5. Add the secret environment variables manually
6. Click "Apply"

---

## 🏥 Health Check Endpoint

Render requires a health check endpoint. Create one:

**File**: `src/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Medical Blog API',
  })
}
```

---

## 🌐 Custom Domain Setup

### Step 1: Add Custom Domain in Render

1. Go to your service → "Settings" → "Custom Domains"
2. Click "Add Custom Domain"
3. Enter your domain: `www.skrzypecki.pl`
4. Render will show you DNS records to add

### Step 2: Configure DNS

Add these records to your domain provider:

**For apex domain (`skrzypecki.pl`):**
```
Type: A
Name: @
Value: 216.24.57.1 (Render's IP)
```

**For www subdomain (`www.skrzypecki.pl`):**
```
Type: CNAME
Name: www
Value: medical-blog-skrzypecki.onrender.com
```

### Step 3: Enable SSL

- Render automatically provisions SSL certificates via Let's Encrypt
- Wait 5-10 minutes for certificate activation
- Your site will be accessible via HTTPS

---

## 🔄 Automatic Deployments

**Auto-deploy on Git push:**
1. Go to service → "Settings" → "Build & Deploy"
2. Enable "Auto-Deploy"
3. Select branch: `main`
4. Every push to `main` triggers automatic deployment

**Manual deploy:**
- Click "Manual Deploy" → "Deploy latest commit"

**Rollback:**
- Go to "Events" tab
- Find previous successful deployment
- Click "Rollback to this version"

---

## 📊 Monitoring & Logs

### View Logs

1. Go to your service dashboard
2. Click "Logs" tab
3. View real-time logs
4. Filter by date/severity

### Metrics

1. Click "Metrics" tab
2. View:
   - CPU usage
   - Memory usage
   - Request rate
   - Response time

### Alerts

1. Go to "Settings" → "Alerts"
2. Configure alerts for:
   - Service failures
   - High CPU/memory usage
   - Deploy failures

---

## ⚙️ Render-Specific Configuration

### Environment-Specific Settings

**Update `.env.local` vs Render:**
- `.env.local`: For local development
- Render Dashboard: For production

**Update `NEXT_PUBLIC_APP_URL`:**
```env
# Development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Render Production
NEXT_PUBLIC_APP_URL=https://medical-blog-skrzypecki.onrender.com
```

### Performance Optimization

**Enable HTTP/2:**
- Automatically enabled on Render

**Enable Compression:**
Already configured in `next.config.js`:
```javascript
compress: true
```

**CDN:**
- Render includes built-in CDN
- Static assets automatically cached

---

## 💰 Pricing Considerations

### Free Plan
- **Compute**: 750 hours/month
- **Bandwidth**: 100 GB/month
- **Build Minutes**: 500 minutes/month
- **Spins down after 15 min inactivity** ⚠️
- **Spin-up time**: ~30 seconds

⚠️ **Free Plan Limitation**: Service sleeps after inactivity. First request after sleep takes 30+ seconds.

### Starter Plan ($7/month)
- Always-on (no spin down)
- Faster deployments
- Better for production

### Standard Plan ($25/month)
- More CPU/memory
- Faster performance
- Suitable for high traffic

---

## 🔧 Troubleshooting

### Build Failures

**Problem**: Build fails with memory error

**Solution**: Increase instance size or optimize build
```bash
# In package.json, add:
"build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
```

### Slow Cold Starts (Free Plan)

**Problem**: First request takes 30+ seconds

**Solutions**:
1. Upgrade to Starter plan (no sleep)
2. Set up uptime monitoring to ping periodically
3. Use external cron job to keep service warm

### Environment Variables Not Loading

**Problem**: App can't find environment variables

**Solutions**:
1. Check spelling of variable names
2. Ensure `NEXT_PUBLIC_` prefix for client-side vars
3. Redeploy after adding variables
4. Check Render dashboard for saved values

### Firebase Connection Issues

**Problem**: "Firebase is not configured"

**Solutions**:
1. Verify all Firebase env vars are set
2. Check `FIREBASE_ADMIN_PRIVATE_KEY` has correct format
3. Add Firebase domain to authorized domains
4. Test connection in logs

---

## 🚀 Post-Deployment Checklist

After deploying to Render:

- [ ] Service deployed successfully
- [ ] Health check endpoint returns 200
- [ ] Environment variables configured
- [ ] Firebase connection working
- [ ] Can register new users
- [ ] Can create articles
- [ ] Images upload to Firebase Storage
- [ ] Newsletter subscription works
- [ ] SEO metadata generated
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Auto-deploy enabled
- [ ] Monitoring alerts configured

---

## 🆚 Render vs Vercel Comparison

| Feature | Render | Vercel |
|---------|--------|--------|
| **Free Tier** | 750 hrs, sleeps after 15 min | Unlimited, no sleep |
| **Next.js Support** | Good | Excellent (made by Vercel) |
| **Cold Start** | ~30s (free), instant (paid) | Instant |
| **Docker Support** | ✅ Yes | ❌ No |
| **Persistent Storage** | ✅ Yes (paid) | ❌ No |
| **Databases** | PostgreSQL, Redis included | External only |
| **Custom Domains** | Unlimited | Unlimited |
| **Build Time** | ~5-10 min | ~2-5 min |
| **Edge Functions** | ❌ No | ✅ Yes |
| **Best For** | Full-stack apps, microservices | JAMstack, Next.js apps |

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Render Next.js Guide](https://render.com/docs/deploy-nextjs-app)
- [Render Community](https://community.render.com/)
- [Status Page](https://status.render.com/)

---

## 🎯 Recommendation

**For this project:**

1. **Development**: Local (`npm run dev`)
2. **Staging**: Render Free Tier
3. **Production**:
   - **Best**: Vercel (optimized for Next.js)
   - **Good**: Render Starter Plan ($7/month)
   - **Budget**: Render Free + Uptime monitoring

**Choose Render if:**
- Need Docker support
- Want integrated databases
- Prefer single platform for all services

**Choose Vercel if:**
- Want fastest Next.js performance
- Need edge functions
- Want instant deployments

---

**Last Updated**: January 2026
