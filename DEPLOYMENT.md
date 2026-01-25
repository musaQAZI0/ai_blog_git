# Deployment Guide

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the easiest deployment option for Next.js applications.

#### Steps:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables**
   Go to your Vercel project dashboard → Settings → Environment Variables
   Add all variables from `.env.local`

#### GitHub Integration:

1. Import your repository at [vercel.com](https://vercel.com)
2. Configure environment variables
3. Every push to `main` branch will auto-deploy

---

### Option 2: Render

Render is a modern cloud platform with excellent Next.js support and free tier.

#### Steps:

1. **Create Account**
   - Sign up at [render.com](https://render.com)
   - Connect your GitHub/GitLab account

2. **Deploy via Dashboard**
   - Click "New +" → "Web Service"
   - Select your repository
   - Configure:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Node Version**: 18

3. **Set Environment Variables**
   - Add all variables from `.env.local` in Render dashboard
   - See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for detailed guide

4. **Deploy**
   - Click "Create Web Service"
   - Your app will be live at: `https://your-app.onrender.com`

#### Using render.yaml (Infrastructure as Code):

1. The project includes a `render.yaml` file
2. Go to Render → "New +" → "Blueprint"
3. Connect repository - Render auto-detects `render.yaml`
4. Add secret environment variables
5. Click "Apply"

**Full guide**: See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)

**Pricing**: Free tier with 750 hours/month (service sleeps after 15 min inactivity)

---

### Option 3: AWS (Elastic Beanstalk or ECS)

#### AWS Elastic Beanstalk:

1. **Install AWS CLI & EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB**
   ```bash
   eb init -p node.js medical-blog --region us-east-1
   ```

3. **Create Environment**
   ```bash
   eb create medical-blog-prod
   ```

4. **Deploy**
   ```bash
   eb deploy
   ```

5. **Set Environment Variables**
   ```bash
   eb setenv NEXT_PUBLIC_FIREBASE_API_KEY=your_key \
             OPENAI_API_KEY=your_key \
             # ... other variables
   ```

#### AWS ECS (Docker):

1. **Build Docker Image**
   ```bash
   docker build -t medical-blog .
   ```

2. **Push to ECR**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com
   docker tag medical-blog:latest your-account.dkr.ecr.us-east-1.amazonaws.com/medical-blog:latest
   docker push your-account.dkr.ecr.us-east-1.amazonaws.com/medical-blog:latest
   ```

3. **Deploy to ECS**
   - Create ECS cluster
   - Create task definition
   - Create service
   - Configure load balancer

---

### Option 4: Google Cloud Platform

#### Cloud Run:

1. **Build and Push Container**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT-ID/medical-blog
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy medical-blog \
     --image gcr.io/PROJECT-ID/medical-blog \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

3. **Set Environment Variables**
   ```bash
   gcloud run services update medical-blog \
     --set-env-vars "NEXT_PUBLIC_FIREBASE_API_KEY=your_key,OPENAI_API_KEY=your_key"
   ```

---

### Option 5: Azure

#### Azure App Service:

1. **Create App Service**
   ```bash
   az webapp create --resource-group medical-blog-rg \
     --plan medical-blog-plan \
     --name medical-blog \
     --runtime "NODE|18-lts"
   ```

2. **Deploy**
   ```bash
   az webapp deployment source config-zip \
     --resource-group medical-blog-rg \
     --name medical-blog \
     --src build.zip
   ```

3. **Set Environment Variables**
   ```bash
   az webapp config appsettings set \
     --resource-group medical-blog-rg \
     --name medical-blog \
     --settings NEXT_PUBLIC_FIREBASE_API_KEY=your_key
   ```

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables
- [ ] All `.env.local` variables set in production
- [ ] Firebase credentials configured
- [ ] OpenAI/Anthropic API keys added
- [ ] Email service (SendGrid/Mailchimp/SES) configured
- [ ] Storage provider (Firebase/S3/Azure) configured
- [ ] Analytics (GA4) configured

### 2. Database & Services
- [ ] Firebase project created and configured
- [ ] Firestore security rules deployed
- [ ] Firebase Authentication enabled
- [ ] Cloud Storage bucket created
- [ ] Email service tested

### 3. Security
- [ ] SSL/TLS certificate installed
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] CSP policy set

### 4. Performance
- [ ] Image optimization enabled
- [ ] CDN configured (CloudFlare)
- [ ] Caching strategy implemented
- [ ] Code splitting verified
- [ ] Bundle size optimized

### 5. Monitoring
- [ ] Sentry error tracking configured
- [ ] Google Analytics 4 installed
- [ ] Uptime monitoring set up
- [ ] Log aggregation configured

### 6. Testing
- [ ] All API endpoints tested
- [ ] User registration/login works
- [ ] Content generation works
- [ ] Newsletter system tested
- [ ] GDPR features tested
- [ ] Mobile responsiveness verified

---

## 🔧 Production Configuration

### Next.js Build Optimization

Add to `next.config.js`:

```javascript
module.exports = {
  // ... existing config

  // Production optimizations
  poweredByHeader: false,
  compress: true,

  // Image optimization
  images: {
    domains: ['firebasestorage.googleapis.com', 'your-cdn.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

### Firestore Security Rules

Deploy security rules:

```bash
firebase deploy --only firestore:rules
```

Example rules in `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Articles
    match /articles/{articleId} {
      allow read: if resource.data.status == 'published' || request.auth != null;
      allow create: if request.auth != null && request.auth.token.role == 'professional';
      allow update, delete: if request.auth.uid == resource.data.authorId || request.auth.token.role == 'admin';
    }

    // Newsletter subscriptions
    match /newsletterSubscriptions/{subId} {
      allow read, write: if true; // Public access for subscriptions
    }
  }
}
```

### Firebase Storage Security Rules

Deploy storage rules:

```bash
firebase deploy --only storage
```

Example rules in `storage.rules`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Images folder - public read, authenticated write
    match /images/{imageId} {
      allow read: if true;
      allow write: if request.auth != null &&
                      request.resource.size < 10 * 1024 * 1024 && // Max 10MB
                      request.resource.contentType.matches('image/.*');
    }

    // PDFs folder - authenticated read/write
    match /pdfs/{pdfId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      request.resource.size < 50 * 1024 * 1024 && // Max 50MB
                      request.resource.contentType == 'application/pdf';
    }

    // Avatars folder - public read, owner write
    match /avatars/{userId} {
      allow read: if true;
      allow write: if request.auth != null &&
                      request.auth.uid == userId &&
                      request.resource.size < 5 * 1024 * 1024 && // Max 5MB
                      request.resource.contentType.matches('image/.*');
    }

    // Default uploads - authenticated users only
    match /uploads/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                      request.resource.size < 20 * 1024 * 1024; // Max 20MB
    }
  }
}
```

### Storage Provider Configuration

The application supports multiple storage providers:

1. **Firebase Storage (Recommended)**
   - Set `STORAGE_PROVIDER=firebase` in `.env.local`
   - Already configured if Firebase is set up
   - No additional packages needed
   - Benefits: Integrated with Firebase ecosystem, easy setup, generous free tier

2. **AWS S3**
   - Set `STORAGE_PROVIDER=s3`
   - Requires: `@aws-sdk/client-s3` and `@aws-sdk/lib-storage` packages
   - Configure AWS credentials in `.env.local`

3. **Azure Blob Storage**
   - Set `STORAGE_PROVIDER=azure`
   - Requires: `@azure/storage-blob` package
   - Configure Azure connection string in `.env.local`

---

## 🔄 CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automates:

1. **Test**: Runs linter and type checking
2. **Build**: Creates production build
3. **Deploy**: Deploys to production

### Required GitHub Secrets:

Add these in GitHub repo → Settings → Secrets:

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
OPENAI_API_KEY
ANTHROPIC_API_KEY
SENDGRID_API_KEY
EXPORT_API_SECRET
```

---

## 🌐 Domain Configuration

### Custom Domain Setup:

1. **Add Domain to Vercel**
   - Go to Project Settings → Domains
   - Add your domain (e.g., `skrzypecki.pl`)

2. **Configure DNS**
   Add these records to your DNS provider:

   ```
   Type    Name    Value
   A       @       76.76.21.21
   CNAME   www     cname.vercel-dns.com
   ```

3. **SSL Certificate**
   - Automatically provided by Vercel
   - Or use Let's Encrypt for other platforms

---

## 📊 Post-Deployment Tasks

1. **Verify Deployment**
   - [ ] Site loads correctly
   - [ ] All pages accessible
   - [ ] API endpoints working
   - [ ] Authentication functional

2. **Configure Newsletter Cron Job**
   Set up a cron job to send newsletters:

   ```bash
   # Using Vercel Cron Jobs (vercel.json)
   {
     "crons": [{
       "path": "/api/newsletter/send",
       "schedule": "0 8 * * 1"
     }]
   }
   ```

3. **Set Up Monitoring**
   - Configure uptime monitoring (UptimeRobot, Pingdom)
   - Set up alerts for errors
   - Configure backup strategy

4. **Performance Testing**
   - Run Lighthouse audit
   - Test with PageSpeed Insights
   - Verify Core Web Vitals

---

## 🆘 Troubleshooting

### Build Failures

- Check all environment variables are set
- Verify Node.js version (18.x required)
- Clear `.next` cache: `rm -rf .next`

### Database Connection Issues

- Verify Firebase credentials
- Check Firestore security rules
- Ensure IP whitelist configured (if applicable)

### Email Not Sending

- Verify SendGrid API key
- Check sender email verification
- Review email service logs

---

## 📞 Support

For deployment issues, check:
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)

---

**Last Updated**: ${new Date().toLocaleDateString()}
