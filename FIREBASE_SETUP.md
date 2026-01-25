# Firebase Configuration Guide

Complete step-by-step guide to configure Firebase for the Medical Blog System.

---

## 📋 Prerequisites

- Google account
- Node.js and npm installed
- Firebase CLI (optional, but recommended)

---

## 🚀 Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Click "Add project" or "Create a project"

2. **Project Setup**
   - **Project name**: Enter a name (e.g., "medical-blog-skrzypecki")
   - **Google Analytics**: Enable it (recommended for tracking)
   - **Analytics account**: Select or create one
   - Click "Create project"
   - Wait for project creation (takes ~30 seconds)

---

## 🔧 Step 2: Get Firebase Web App Configuration

1. **Register Web App**
   - In Firebase Console, click the **Web icon** (`</>`) to add a web app
   - **App nickname**: "Medical Blog Web App"
   - **Also set up Firebase Hosting**: Uncheck (we're using Vercel)
   - Click "Register app"

2. **Copy Configuration Values**

   You'll see something like this:

   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyC1234567890abcdefghijklmnop",
     authDomain: "medical-blog-skrzypecki.firebaseapp.com",
     projectId: "medical-blog-skrzypecki",
     storageBucket: "medical-blog-skrzypecki.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890"
   };
   ```

3. **Update `.env.local`**

   Open your `.env.local` file and replace the placeholder values:

   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC1234567890abcdefghijklmnop
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=medical-blog-skrzypecki.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=medical-blog-skrzypecki
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=medical-blog-skrzypecki.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
   ```

---

## 🔐 Step 3: Set Up Firebase Admin SDK (Server-side)

1. **Generate Service Account Key**
   - In Firebase Console, go to **Project Settings** (gear icon)
   - Click on **Service accounts** tab
   - Click **Generate new private key**
   - Click **Generate key** - a JSON file will download

2. **Extract Values from JSON**

   Open the downloaded JSON file. It looks like this:

   ```json
   {
     "type": "service_account",
     "project_id": "medical-blog-skrzypecki",
     "private_key_id": "abc123...",
     "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-abc123@medical-blog-skrzypecki.iam.gserviceaccount.com",
     "client_id": "123456789012345678901",
     ...
   }
   ```

3. **Update `.env.local` with Admin SDK Values**

   ```env
   # Firebase Admin (Server-side)
   FIREBASE_ADMIN_PROJECT_ID=medical-blog-skrzypecki
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-abc123@medical-blog-skrzypecki.iam.gserviceaccount.com
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
   ```

   ⚠️ **Important**:
   - Keep the quotes around the private key
   - Keep the `\n` characters - they are necessary
   - Never commit this file to Git (already in `.gitignore`)

---

## 🔑 Step 4: Enable Firebase Authentication

1. **Enable Authentication**
   - In Firebase Console, go to **Authentication**
   - Click **Get started**
   - Go to **Sign-in method** tab

2. **Enable Sign-in Providers**

   Enable the following:

   - ✅ **Email/Password**
     - Click on "Email/Password"
     - Toggle "Enable"
     - Click "Save"

   - ✅ **Google** (Optional but recommended)
     - Click on "Google"
     - Toggle "Enable"
     - Set public-facing name: "Medical Blog"
     - Set support email: your email
     - Click "Save"

3. **Configure Settings** (Optional)
   - Go to **Settings** tab
   - Set **Authorized domains**: Add your production domain (e.g., `skrzypecki.pl`)

---

## 📊 Step 5: Set Up Firestore Database

1. **Create Firestore Database**
   - In Firebase Console, go to **Firestore Database**
   - Click **Create database**
   - **Start in production mode** (we'll deploy security rules later)
   - **Cloud Firestore location**: Choose closest to your users (e.g., `europe-west1` for Poland)
   - Click **Enable**

2. **Create Initial Collections** (Optional)

   The app will create collections automatically, but you can create them manually:

   - `users`
   - `articles`
   - `newsletterSubscriptions`
   - `consentLogs`

3. **Deploy Security Rules**

   From your project directory, run:

   ```bash
   # Install Firebase CLI if not already installed
   npm install -g firebase-tools

   # Login to Firebase
   firebase login

   # Initialize Firebase in your project
   firebase init firestore

   # Deploy Firestore rules
   firebase deploy --only firestore:rules
   ```

   This will deploy the rules from `firestore.rules` file.

---

## 📦 Step 6: Set Up Firebase Storage

1. **Enable Cloud Storage**
   - In Firebase Console, go to **Storage**
   - Click **Get started**
   - **Start in production mode**
   - **Cloud Storage location**: Same as Firestore (e.g., `europe-west1`)
   - Click **Done**

2. **Deploy Storage Security Rules**

   ```bash
   firebase deploy --only storage
   ```

   This will deploy the rules from `storage.rules` file.

3. **Verify Storage Bucket**

   Your storage bucket URL should match the one in `.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=medical-blog-skrzypecki.appspot.com
   ```

---

## 🧪 Step 7: Test Your Configuration

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Run Development Server**

   ```bash
   npm run dev
   ```

3. **Test Firebase Connection**

   - Open browser console (F12)
   - Navigate to http://localhost:3000
   - Look for: `Firebase configured: true`
   - If you see `false`, check your environment variables

4. **Test Authentication**

   - Try to register a new user
   - Check Firebase Console → Authentication → Users
   - You should see the new user

5. **Test Firestore**

   - Create an article (if admin access is available)
   - Check Firebase Console → Firestore Database
   - You should see the `articles` collection

---

## 🔒 Step 8: Configure Security Rules

### Firestore Rules (`firestore.rules`)

The project includes comprehensive security rules. Key points:

- **Users collection**: Users can only read/write their own data
- **Articles collection**:
  - Anyone can read published articles
  - Only authenticated professionals can create
  - Only author or admin can update/delete
- **Newsletter subscriptions**: Public read/write for subscriptions

### Storage Rules (`storage.rules`)

- **Images**: Public read, authenticated write (max 10MB)
- **PDFs**: Authenticated read/write (max 50MB)
- **Avatars**: Public read, owner write (max 5MB)
- **Uploads**: Authenticated only (max 20MB)

---

## 🚀 Step 9: Production Deployment

### For Vercel

1. **Add Environment Variables to Vercel**

   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all variables from `.env.local`:
     - `NEXT_PUBLIC_FIREBASE_API_KEY`
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
     - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
     - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
     - `NEXT_PUBLIC_FIREBASE_APP_ID`
     - `FIREBASE_ADMIN_PROJECT_ID`
     - `FIREBASE_ADMIN_CLIENT_EMAIL`
     - `FIREBASE_ADMIN_PRIVATE_KEY`
     - All other environment variables...

2. **Add Production Domain to Firebase**

   - Firebase Console → Authentication → Settings → Authorized domains
   - Add your production domain (e.g., `skrzypecki.pl`, `www.skrzypecki.pl`)

3. **Update CORS for Storage**

   Create a `cors.json` file:

   ```json
   [
     {
       "origin": ["https://skrzypecki.pl", "https://www.skrzypecki.pl"],
       "method": ["GET", "POST", "PUT", "DELETE"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

   Deploy CORS configuration:

   ```bash
   gsutil cors set cors.json gs://medical-blog-skrzypecki.appspot.com
   ```

---

## 🧪 Verification Checklist

After completing setup, verify:

- [ ] Can register new users
- [ ] Can log in with email/password
- [ ] Can create articles (if admin)
- [ ] Can upload images to Storage
- [ ] Can subscribe to newsletter
- [ ] Firebase Console shows data in Firestore
- [ ] Firebase Console shows files in Storage
- [ ] Security rules are deployed
- [ ] No console errors related to Firebase

---

## 🆘 Troubleshooting

### "Firebase configured: false"

**Problem**: Environment variables not loaded

**Solutions**:
- Restart development server (`npm run dev`)
- Check `.env.local` file exists in root directory
- Verify variable names start with `NEXT_PUBLIC_` for client-side
- Check for typos in variable names

### "Permission denied" errors

**Problem**: Security rules too restrictive

**Solutions**:
- Deploy security rules: `firebase deploy --only firestore:rules`
- Check user is authenticated before operations
- Verify user has required role (admin, professional)

### "Failed to get document" errors

**Problem**: Firestore not initialized or rules blocking

**Solutions**:
- Verify Firestore is enabled in Firebase Console
- Check security rules allow the operation
- Ensure collection names match exactly

### Storage upload fails

**Problem**: Storage rules or CORS issue

**Solutions**:
- Deploy storage rules: `firebase deploy --only storage`
- Configure CORS (see Step 9)
- Verify file size is within limits
- Check file type is allowed

---

## 📚 Additional Resources

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Storage Security](https://firebase.google.com/docs/storage/security)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

---

## 🔐 Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Rotate service account keys** periodically
3. **Use environment-specific projects** (dev, staging, prod)
4. **Enable Firebase App Check** for production (optional but recommended)
5. **Monitor usage** in Firebase Console to detect anomalies
6. **Set up billing alerts** to avoid unexpected charges
7. **Review security rules** regularly

---

**Last Updated**: January 2026
