# Cloudinary Setup Guide

Complete guide to set up **free Cloudinary** for optimized image storage and delivery.

---

## 🆓 Cloudinary Free Tier

- ✅ **25 GB** storage (FREE forever)
- ✅ **25 GB/month** bandwidth
- ✅ **25,000** transformations/month
- ✅ **No credit card required**
- ✅ Automatic image optimization
- ✅ Global CDN included
- ✅ AI-powered features

**Perfect for:** Medical blog images, automatic WebP conversion, responsive images

---

## 🚀 Step-by-Step Setup

### Step 1: Create Cloudinary Account

1. **Go to Cloudinary**
   ```
   https://cloudinary.com/users/register_free
   ```

2. **Sign Up**
   - Use email or Google/GitHub account
   - **No credit card required** for free tier
   - Fill in your details
   - Verify your email

3. **Complete Setup**
   - Choose use case: "Website" or "App"
   - Click "Get Started"

---

### Step 2: Get Your Credentials

1. **Dashboard**
   - After login, you'll see your Dashboard
   - Look for **"Product Environment Credentials"** section

2. **Copy These Values:**

   ```
   Cloud Name: your-cloud-name
   API Key: 123456789012345
   API Secret: abcdefghijklmnopqrstuvwxyz123
   ```

3. **Update `.env.local`**

   Open your `.env.local` file and update:

   ```env
   # Cloudinary Configuration
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=123456789012345
   CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123
   ```

   **Example:**
   ```env
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=medical-blog-demo
   CLOUDINARY_API_KEY=987654321098765
   CLOUDINARY_API_SECRET=xyzabc123def456ghi789jkl
   ```

---

### Step 3: Test Your Setup

```bash
# Start development server
npm run dev
```

Upload an image in your application - it will be automatically optimized and stored in Cloudinary!

---

## 🖼️ Using Cloudinary Images in Your App

### Option 1: Using CldImage Component (Recommended)

```tsx
import { CldImage } from 'next-cloudinary'

export default function ArticleImage() {
  return (
    <CldImage
      src="medical-blog/sample-image"
      width="800"
      height="600"
      alt="Medical illustration"
      crop={{
        type: 'auto',
        source: true
      }}
    />
  )
}
```

**Benefits:**
- ✅ Automatic responsive images
- ✅ Lazy loading built-in
- ✅ Automatic format optimization (WebP, AVIF)
- ✅ Auto quality adjustment

### Option 2: Dynamic Transformations

```tsx
<CldImage
  src="medical-blog/x-ray-scan"
  width="1200"
  height="800"
  crop="fill"
  gravity="auto" // AI-powered cropping
  quality="auto"
  format="auto"
  alt="X-ray scan"
/>
```

### Option 3: Responsive Sizes

```tsx
<CldImage
  src="medical-blog/article-hero"
  width="1200"
  height="675"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  alt="Hero image"
/>
```

---

## 📁 Folder Organization

Cloudinary automatically organizes files by folder. Your uploads go to:

```
medical-blog/
├── images/          # Article images
├── avatars/         # User avatars
├── pdfs/            # Documents (if under 10MB)
└── uploads/         # General uploads
```

---

## 🎨 Image Transformations

Cloudinary offers powerful transformations:

### Resize & Crop
```tsx
<CldImage
  src="image-id"
  width="400"
  height="400"
  crop="fill" // fill, fit, scale, crop
/>
```

### Quality Optimization
```tsx
<CldImage
  src="image-id"
  width="800"
  height="600"
  quality="auto:best" // auto, auto:best, auto:good, auto:eco, auto:low
/>
```

### Format Conversion
```tsx
<CldImage
  src="image-id"
  width="800"
  height="600"
  format="auto" // Automatically serves WebP or AVIF if supported
/>
```

### Effects
```tsx
<CldImage
  src="image-id"
  width="800"
  height="600"
  effects={[
    {
      background: 'auto', // AI background removal
    }
  ]}
/>
```

---

## 🔍 View Your Images in Cloudinary

1. **Go to Media Library**
   - Dashboard → Media Library
   - Browse all uploaded images
   - Preview transformations
   - Get URLs

2. **Folder Structure**
   - Click "Folders" to see organized files
   - Search by filename or tags

3. **Analytics**
   - Dashboard → Reports
   - View bandwidth usage
   - Track transformations
   - Monitor storage

---

## 📊 Monitor Usage

1. **Dashboard**
   - **Storage**: See GB used out of 25 GB
   - **Bandwidth**: Monthly transfer (25 GB free)
   - **Transformations**: Count out of 25,000

2. **Optimize Usage**
   - Use `format="auto"` for automatic WebP
   - Enable lazy loading
   - Set appropriate quality levels
   - Use responsive images

---

## 🔄 Switch Storage Providers

You can easily switch between providers:

**Use Cloudinary (recommended for images):**
```env
STORAGE_PROVIDER=cloudinary
```

**Use MongoDB GridFS (good for PDFs):**
```env
STORAGE_PROVIDER=mongodb
```

**Use Firebase Storage:**
```env
STORAGE_PROVIDER=firebase
```

---

## 💡 Best Practices

### 1. Image Optimization

```tsx
// ✅ Good - Auto-optimized
<CldImage
  src="image-id"
  width="800"
  height="600"
  quality="auto"
  format="auto"
/>

// ❌ Bad - No optimization
<img src="https://example.com/large-image.jpg" />
```

### 2. Responsive Images

```tsx
// ✅ Good - Responsive
<CldImage
  src="image-id"
  width="1200"
  height="800"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### 3. Lazy Loading

```tsx
// ✅ Good - Lazy loaded by default with CldImage
<CldImage src="image-id" width="800" height="600" />
```

---

## 🆘 Troubleshooting

### "Cloudinary is not configured"

**Solution**: Check environment variables
- Verify `.env.local` has all three Cloudinary vars
- Restart dev server: `npm run dev`
- Check for typos in variable names

### Images not loading

**Solution**: Check Cloud Name
- Go to Cloudinary Dashboard
- Verify `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` matches
- Must be public (starts with `NEXT_PUBLIC_`)

### Upload fails

**Solution**: Check API credentials
- Verify `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`
- Check they're not expired
- Regenerate if needed (Dashboard → Settings → API Keys)

### Exceeded free tier

**Solution**: Monitor usage
- Check Dashboard for current usage
- Optimize images (use `quality="auto:eco"`)
- Consider upgrading ($0/month for free tier)

---

## 📈 When to Upgrade

Free tier is usually enough, but upgrade if:
- Need more than **25 GB** storage
- Need more than **25 GB/month** bandwidth
- Need more than **25,000** transformations/month
- Need advanced features (AI background removal, etc.)

**Paid plans start at $89/month** (but free tier is very generous!)

---

## 📚 Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Next Cloudinary Docs](https://next.cloudinary.dev/)
- [Image Transformations Guide](https://cloudinary.com/documentation/image_transformations)
- [Optimization Best Practices](https://cloudinary.com/documentation/image_optimization)

---

## ✅ Setup Complete!

Your Medical Blog now uses:
- ✅ **Cloudinary**: Optimized image storage & delivery (25 GB FREE)
- ✅ **Firebase**: Authentication & Firestore Database
- ✅ **MongoDB GridFS**: Optional file storage (512 MB FREE)

**All FREE with no credit card required!** 🎉

---

**Last Updated**: January 2026
