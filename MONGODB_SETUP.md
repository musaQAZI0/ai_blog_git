# MongoDB Atlas Setup Guide

Complete guide to set up **free MongoDB Atlas** for file storage (GridFS).

---

## 🆓 MongoDB Atlas Free Tier

- ✅ **512 MB** storage (FREE forever)
- ✅ **No credit card required**
- ✅ Shared cluster
- ✅ Database + File storage (GridFS)
- ✅ Backup & monitoring included

---

## 🚀 Step-by-Step Setup

### Step 1: Create MongoDB Atlas Account

1. **Go to MongoDB Atlas**
   ```
   https://www.mongodb.com/cloud/atlas/register
   ```

2. **Sign up for free account**
   - Use Google account or email
   - No credit card required
   - Choose "Free Shared Cluster"

3. **Answer Setup Questions** (optional)
   - How will you use MongoDB? Select "Learning MongoDB"
   - Preferred language? Select "JavaScript"

---

### Step 2: Create a Free Cluster

1. **Choose Deployment Option**
   - Click "Create" under **M0 (Free)**
   - Keep the default settings

2. **Select Cloud Provider & Region**
   - Provider: **AWS** (or Google Cloud, Azure - all free)
   - Region: Choose closest to Poland (e.g., **Frankfurt (eu-central-1)**)
   - Cluster Tier: **M0 Sandbox (Shared RAM, 512 MB Storage)** ✅ FREE

3. **Cluster Name**
   - Name: `medical-blog-cluster` (or any name)

4. **Click "Create Cluster"**
   - Wait ~3-5 minutes for cluster creation

---

### Step 3: Create Database User

1. **Security → Database Access**
   - Click "Add New Database User"

2. **Authentication Method**
   - Select: **Password**
   - Username: `medical-blog-user` (or any name)
   - **Autogenerate Secure Password** OR create your own
   - **IMPORTANT**: Copy the password immediately!

3. **Database User Privileges**
   - Built-in Role: **Read and write to any database**
   - Click "Add User"

---

### Step 4: Configure Network Access

1. **Security → Network Access**
   - Click "Add IP Address"

2. **Allow Access From**
   - Click **"Allow Access from Anywhere"**
   - IP Address: `0.0.0.0/0` (automatically filled)
   - Comment: "Allow from all IPs"
   - Click "Confirm"

   ⚠️ **Note**: For production, restrict to specific IPs. For development, this is fine.

---

### Step 5: Get Connection String

1. **Go to Clusters**
   - Click your cluster name

2. **Click "Connect"**
   - Choose: **"Connect your application"**

3. **Select Driver and Version**
   - Driver: **Node.js**
   - Version: **5.5 or later**

4. **Copy Connection String**

   You'll see something like:
   ```
   mongodb+srv://medical-blog-user:<password>@medical-blog-cluster.abc123.mongodb.net/?retryWrites=true&w=majority
   ```

5. **Replace `<password>` with your actual password**

   Final connection string:
   ```
   mongodb+srv://medical-blog-user:YourActualPassword123@medical-blog-cluster.abc123.mongodb.net/?retryWrites=true&w=majority
   ```

---

### Step 6: Update `.env.local`

Open your `.env.local` file and update:

```env
# MongoDB GridFS Storage
MONGODB_URI=mongodb+srv://medical-blog-user:YourActualPassword123@medical-blog-cluster.abc123.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=medical-blog
```

---

## 📦 Install MongoDB Package

```bash
npm install mongodb
```

---

## 🧪 Test Your Connection

```bash
# Start development server
npm run dev
```

Try uploading a file in your application. It will be stored in MongoDB GridFS!

---

## 🔍 View Your Files in MongoDB Atlas

1. **Go to Clusters** → Click "Browse Collections"
2. **Database**: `medical-blog`
3. **Collections**:
   - `uploads.files` - File metadata
   - `uploads.chunks` - File data chunks

---

## 📊 Monitor Usage

1. **Go to Metrics** tab in Atlas
2. View:
   - Storage used (out of 512 MB)
   - Operations per second
   - Connections

---

## ⚙️ Best Practices

### Security

```env
# NEVER commit .env.local to Git!
# It's already in .gitignore ✅
```

### Connection Pooling

MongoDB driver automatically pools connections. No configuration needed.

### Backup

Free tier includes:
- ✅ Cloud backup snapshots
- ✅ Point-in-time recovery (last 24 hours)

---

## 🔄 Switch Between Storage Providers

You can easily switch between MongoDB and Firebase:

**Use MongoDB GridFS:**
```env
STORAGE_PROVIDER=mongodb
```

**Use Firebase Storage:**
```env
STORAGE_PROVIDER=firebase
```

(Remember: Firebase Storage requires Blaze plan upgrade)

---

## 📈 When to Upgrade

You'll need a paid cluster if you exceed:
- More than **512 MB** storage
- Need better performance
- Need dedicated resources

**Paid plans start at $9/month** (M10 cluster with 10 GB storage)

---

## 🆘 Troubleshooting

### "MongoServerError: bad auth"

**Solution**: Check password in connection string
- Ensure you replaced `<password>` with actual password
- Check for special characters (may need URL encoding)

### "MongoNetworkError: connection timeout"

**Solution**: Check network access
- Ensure IP `0.0.0.0/0` is added to whitelist
- Check your internet connection

### "Cannot read property 'uploadStream' of null"

**Solution**: MongoDB not connected
- Check `MONGODB_URI` in `.env.local`
- Restart development server: `npm run dev`

---

## 📚 Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [GridFS Documentation](https://docs.mongodb.com/manual/core/gridfs/)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)

---

## ✅ Setup Complete!

Your Medical Blog now uses:
- ✅ **Firebase**: Authentication & Firestore Database
- ✅ **MongoDB GridFS**: File Storage (Images, PDFs)

**All FREE with no credit card required!** 🎉

---

**Last Updated**: January 2026
