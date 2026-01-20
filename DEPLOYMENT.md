# Deploy to Render

## Quick Deploy Steps

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Deploy on Render

#### Option A: Using render.yaml (Blueprint - Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and configure everything
5. Click **"Apply"** to deploy

#### Option B: Manual Setup
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `androrat-admin-dashboard`
   - **Runtime**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `node backend/server.js`
   - **Plan**: Free
5. Add Environment Variable (optional):
   - `NODE_ENV` = `production`
6. Click **"Create Web Service"**

### 3. Access Your Application
After deployment completes (2-3 minutes):
- Your app will be available at: `https://your-app-name.onrender.com`
- Login page: `https://your-app-name.onrender.com/login.html`
- Dashboard: `https://your-app-name.onrender.com/dashboard.html`

## Default Credentials
```
Email: admin@yourapp.com
Password: yourSecurePassword123
```

**⚠️ IMPORTANT**: Change these credentials in `backend/server.js` before deploying!

## Important Notes

### Free Tier Limitations
- App will spin down after 15 minutes of inactivity
- First request after inactivity takes 50+ seconds to wake up
- 750 hours/month free (enough for continuous running)
- No credit card required for free tier

### WebSocket/Socket.IO
- Render supports WebSocket connections
- No additional configuration needed
- Socket.IO will work automatically

### Custom Domain (Optional)
1. Go to your service settings on Render
2. Add custom domain under "Custom Domains"
3. Update DNS records as instructed

### Environment Variables
You can add environment variables in Render dashboard:
- Go to your service → "Environment"
- Add variables like API keys, passwords, etc.

## Updating Your App
1. Push changes to GitHub: `git push`
2. Render will automatically redeploy (Auto-Deploy enabled by default)

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure all dependencies are in `backend/package.json`
- Verify Node.js version compatibility

### App Won't Start
- Check application logs in Render dashboard
- Ensure PORT environment variable is used: `process.env.PORT`
- Verify start command is correct

### Socket.IO Connection Issues
- Check CORS configuration in `backend/server.js`
- Update frontend to use production URL
- Ensure WebSocket connections are allowed

## Monitoring
- View logs: Render Dashboard → Your Service → Logs
- Health check: `https://your-app-name.onrender.com/api/health`
- Bot count: `https://your-app-name.onrender.com/api/bots`

## Support
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com/)
