# 🚀 Running PowerPlay Stream Locally - Setup Complete!

## ✅ What's Been Done

1. ✅ Fixed backend dependencies (removed non-existent packages)
2. ✅ Installed backend npm modules (589 packages)
3. ✅ Installed frontend npm modules (1327 packages)
4. ✅ Created `.env` file with development defaults

---

## 🎬 How to Run the Application

You have **two options** to run the application:

### **Option 1: Run Backend & Frontend Separately (RECOMMENDED)**

**Terminal 1 - Start the Backend API Server:**
```powershell
cd backend
npm run dev
```

Backend will start at: **http://localhost:5000**

**Terminal 2 - Start the Frontend React App:**
```powershell
cd frontend
npm start
```

Frontend will start at: **http://localhost:3000**

---

### **Option 2: Install Docker & Use Docker Compose**

First, install [Docker Desktop](https://www.docker.com/products/docker-desktop) for Windows.

Then run:
```powershell
docker-compose up
```

This will:
- Start MySQL database on port 3306
- Start backend on port 5000
- Start frontend on port 3000

---

## 📝 Important Notes

### Database Setup

The application expects a MySQL database. For local development, you have options:

#### **Option A: Using Docker (Easiest)**
If you install Docker, the `docker-compose up` command will automatically create a MySQL container.

#### **Option B: Install MySQL Locally**
1. Download [MySQL Server 8.0](https://dev.mysql.com/downloads/mysql/)
2. Install and remember your root password
3. Create database and user:
```sql
CREATE DATABASE powerplay_stream;
CREATE USER 'powerplay'@'localhost' IDENTIFIED BY 'powerplay';
GRANT ALL PRIVILEGES ON powerplay_stream.* TO 'powerplay'@'localhost';
FLUSH PRIVILEGES;
```

4. Update backend `.env` file:
```
CLOUD_SQL_HOST=localhost
CLOUD_SQL_USER=powerplay
CLOUD_SQL_PASSWORD=powerplay
CLOUD_SQL_DATABASE=powerplay_stream
```

#### **Option C: Use SQLite (Quick Dev Setup)**
For rapid local testing without MySQL:
1. The backend can be modified to use SQLite instead
2. This requires minimal changes to database config

---

## 🔄 Database Schema Setup

When the backend starts, it will automatically:
1. Connect to the database
2. Sync models (User, Video, Caption tables)

**First run** will create all tables automatically (Sequelize auto-sync enabled in development).

---

## 🎯 Quick Start Checklist

- [ ] Backend dependencies installed ✅
- [ ] Frontend dependencies installed ✅
- [ ] `.env` file created ✅
- [ ] MySQL ready (choose Option A, B, or C above)
- [ ] Terminal 1: `cd backend && npm run dev`
- [ ] Terminal 2: `cd frontend && npm start`
- [ ] Open http://localhost:3000 in browser
- [ ] Ready to test! 🎉

---

## 🔗 Access Points

Once running:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | React SPA - Main app |
| **Backend API** | http://localhost:5000/api | REST API endpoints |
| **Database** | localhost:3306 | MySQL (if using local/Docker) |

---

## 🧪 Test the Application

### Login
- The app uses Google IAP authentication
- For local development, you might see authentication redirects
- Check browser console for auth errors

### Upload a Video
1. Click "Upload" button
2. Select video file
3. Add title, description, tags
4. Upload thumbnails and captions (5 languages)
5. Submit

### Search Videos
1. Use search bar with auto-suggestions
2. Type to see suggestions
3. Click or submit to search

### Manage Videos
- Toggle privacy (public/private)
- Download videos
- Delete videos (soft delete = hide, permanent = admin only)

---

## 🐛 Troubleshooting

### Error: "Cannot find module express"
**Solution:** Make sure you ran `npm install` in the backend directory

### Error: "Connection refused on port 3306"
**Solution:** MySQL not running. Either:
- Install MySQL locally and start it, OR
- Use `docker-compose up` to start MySQL in Docker

### Error: "Port 3000 already in use"
**Solution:** Another app is using port 3000. Either:
- Kill the process using port 3000, OR
- Change port in frontend package.json

### Error: "Port 5000 already in use"
**Solution:** Another app is using port 5000. Change in backend `.env`: `PORT=5001`

### Frontend shows "Failed to fetch from API"
**Solution:** 
- Make sure backend is running on port 5000
- Check `.env` has correct `REACT_APP_API_URL`
- Check browser console for CORS errors

---

## 📚 Documentation

Full guides available:

- **README.md** - Overview and setup
- **QUICK_REFERENCE.md** - Common commands
- **API.md** - All API endpoints
- **ARCHITECTURE.md** - System design
- **DEPLOYMENT.md** - Production setup

---

## 🎯 Next Steps

1. **Get it running** → Follow the Quick Start Checklist
2. **Explore features** → Upload videos, search, manage
3. **Check logs** → Terminal output shows app activity
4. **Deploy** → When ready, follow DEPLOYMENT.md for Google Cloud

---

## 💡 Tips

- Keep both terminals open while developing
- Use `Ctrl+C` to stop either backend or frontend
- Backend auto-reloads on code changes (nodemon)
- Frontend auto-reloads on code changes (React)
- Check `.env` file if things aren't connecting

---

**Happy streaming! 🎬✨**

For any issues, check the troubleshooting section or review the documentation files.
