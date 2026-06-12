# MongoDB Setup Guide for CardioSense AI

## Option A — MongoDB Atlas (Free Cloud, Recommended)
No installation needed. Works from anywhere.

### Step 1 — Create Free Account
1. Go to → https://www.mongodb.com/atlas
2. Click "Try Free" → Sign up
3. Choose Free plan (M0 Sandbox — 512MB)

### Step 2 — Create Cluster
1. Click "Build a Database"
2. Select FREE (M0)
3. Choose any region (closest to you)
4. Cluster name: `cardiosense-cluster`
5. Click "Create"

### Step 3 — Create Database User
1. Go to "Database Access" (left menu)
2. Click "Add New Database User"
3. Username: `cardiosense`
4. Password: create a strong password (copy it!)
5. Role: "Read and write to any database"
6. Click "Add User"

### Step 4 — Allow Network Access
1. Go to "Network Access" (left menu)
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### Step 5 — Get Connection String
1. Go to "Database" → Click "Connect"
2. Choose "Drivers"
3. Driver: Node.js, Version: 5.5+
4. Copy the connection string — looks like:
   mongodb+srv://cardiosense:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority

### Step 6 — Update .env file
Open `backend/.env` and update:
```
MONGODB_URI=mongodb+srv://cardiosense:YOUR_PASSWORD@cluster0.abc123.mongodb.net/cardiosense?retryWrites=true&w=majority
```
Replace YOUR_PASSWORD with the password you created in Step 3.
Replace cluster0.abc123 with your actual cluster address.

---

## Option B — Local MongoDB (Install on your computer)
### Windows Installation
1. Go to → https://www.mongodb.com/try/download/community
2. Download MongoDB Community Server (Windows, .msi installer)
3. Run installer → Complete setup → Install as Windows Service
4. MongoDB will start automatically

Your .env stays as:
```
MONGODB_URI=mongodb://127.0.0.1:27017/cardiosense
```

---

## After Setup — Restart Backend
```bash
cd backend
node server.js
```
You should see:
✅  MongoDB connected -> mongodb+srv://...
