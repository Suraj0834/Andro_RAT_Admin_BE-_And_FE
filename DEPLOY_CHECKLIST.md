# Render Deployment Checklist

## ✅ Pre-Deployment Steps

- [x] Created `package.json` in root directory
- [x] Created `render.yaml` for blueprint deployment
- [x] Updated frontend to use dynamic API URLs (production/development)
- [x] Server configured to use `process.env.PORT`
- [ ] **IMPORTANT**: Update credentials in `backend/server.js`

### Update Credentials (Required!)

Open [backend/server.js](backend/server.js) and change the default credentials:

```javascript
const AUTHORIZED_USERS = {
    'admin@yourapp.com': {              // ← Change this email
        password: 'yourSecurePassword123',  // ← Change this password
        name: 'Admin User',
        role: 'admin'
    }
};
```

## 📦 Git Repository Setup

If you haven't already:

```bash
# Initialize git (if not done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Prepare for Render deployment"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 🚀 Deploy to Render

### Method 1: Blueprint (Recommended - Easiest)

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will detect `render.yaml` automatically
5. Click **"Apply"** to deploy
6. Wait 2-3 minutes for deployment

### Method 2: Manual Web Service

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure settings:
   - **Name**: `androrat-admin` (or your choice)
   - **Runtime**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `node backend/server.js`
   - **Instance Type**: Free
5. Click **"Create Web Service"**

## 🌐 After Deployment

Your app will be available at:
```
https://your-app-name.onrender.com
```

Test these endpoints:
- Login: `https://your-app-name.onrender.com/login.html`
- Dashboard: `https://your-app-name.onrender.com/dashboard.html`
- Health Check: `https://your-app-name.onrender.com/api/health`
- Bots API: `https://your-app-name.onrender.com/api/bots`

## 📱 Update Android App

Update your Android app's server configuration to connect to:
```
https://your-app-name.onrender.com
```

## ⚙️ Environment Variables (Optional)

You can add environment variables in Render dashboard:
- Go to your service → **Environment** tab
- Add any sensitive configuration
- Restart service after adding variables

## 🔄 Auto-Deploy

Render will automatically redeploy when you push to GitHub:
```bash
git add .
git commit -m "Your update message"
git push
```

## 📊 Monitoring

- **Logs**: Dashboard → Your Service → Logs tab
- **Metrics**: Dashboard → Your Service → Metrics tab
- **Events**: Dashboard → Your Service → Events tab

## ⚠️ Free Tier Notes

- Service spins down after 15 minutes of inactivity
- First request after inactivity takes 50+ seconds
- 750 hours/month free (enough for always-on if one service)
- WebSocket/Socket.IO fully supported

## 🐛 Troubleshooting

### Build Failed
- Check logs in Render dashboard
- Verify `backend/package.json` has all dependencies
- Ensure Node.js version is compatible

### Can't Connect
- Check if service is active (not sleeping)
- Visit health endpoint: `/api/health`
- Check CORS settings if using custom domain

### Socket.IO Issues
- Verify URL in frontend matches deployment URL
- Check browser console for connection errors
- Ensure WebSocket transport is allowed

## 📚 Resources

- [Render Documentation](https://render.com/docs)
- [Node.js Deployment Guide](https://render.com/docs/deploy-node-express-app)
- [Environment Variables](https://render.com/docs/environment-variables)

---

**Need Help?** Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.
