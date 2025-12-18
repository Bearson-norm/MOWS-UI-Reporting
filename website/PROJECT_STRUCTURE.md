# 📁 Project Structure

Dokumentasi lengkap struktur file dan folder dari MO Receiver Website.

## 📂 Directory Tree

```
mo-receiver-website/
├── server.js                 # Main server file (Express + SQLite)
├── package.json             # Dependencies dan scripts
├── .gitignore              # Git ignore rules
│
├── public/                 # Frontend files
│   └── index.html         # Single-page React app
│
├── mo_receiver.db         # SQLite database (auto-generated)
│
├── test-send-data.js      # Script untuk testing API
├── sample-data.json       # Sample data untuk testing
│
├── setup.sh               # Setup script untuk Linux/Mac
├── setup.bat              # Setup script untuk Windows
│
├── README.md              # Dokumentasi utama
├── QUICK_START.md         # Quick start guide
├── API.md                 # API documentation
└── PROJECT_STRUCTURE.md   # File ini
```

---

## 📄 File Descriptions

### Core Files

#### `server.js`
**Type:** Backend Server  
**Size:** ~350 lines  
**Purpose:** Main application server

**Features:**
- Express.js server setup
- SQLite database initialization
- 4 API endpoints (POST, GET, GET/:id, DELETE/:id)
- CORS configuration
- Bearer token authentication
- Error handling
- Graceful shutdown

**Key Functions:**
```javascript
- initializeDatabase()      // Setup database tables
- POST /api/mo/receive      // Receive MO data
- GET /api/mo-list          // Get list of MOs
- GET /api/mo-receiver/:id  // Get MO detail
- DELETE /api/mo-receiver/:id // Delete MO
```

---

#### `public/index.html`
**Type:** Frontend (React)  
**Size:** ~850 lines  
**Purpose:** Single-page application untuk UI

**Features:**
- React components (via CDN)
- MO list table dengan search & filter
- Detail view dengan report summary
- Print functionality
- Responsive design
- Modern UI dengan Tailwind-inspired styling

**Components:**
```javascript
- <App />                        // Main component
- <WeighingReceiverDetail />     // Detail view component
```

---

#### `package.json`
**Type:** NPM Configuration  
**Purpose:** Project metadata dan dependencies

**Dependencies:**
```json
{
  "express": "^4.18.2",         // Web framework
  "sqlite3": "^5.1.6",          // Database
  "cors": "^2.8.5"              // CORS middleware
}
```

**Scripts:**
```json
{
  "start": "node server.js",    // Production
  "dev": "nodemon server.js"    // Development
}
```

---

### Documentation Files

#### `README.md`
**Type:** Documentation  
**Purpose:** Comprehensive project documentation

**Sections:**
- Features overview
- Installation guide
- API endpoints reference
- Database schema
- Usage instructions
- Integration guide
- Troubleshooting

**Target Audience:** Developers & Users

---

#### `QUICK_START.md`
**Type:** Quick Reference  
**Purpose:** Fast setup guide untuk new users

**Sections:**
- 5-minute quick start
- Setup checklist
- Quick commands reference
- Testing guide
- Deployment quick guide
- Common troubleshooting

**Target Audience:** Quick learners, experienced developers

---

#### `API.md`
**Type:** API Reference  
**Purpose:** Detailed API documentation

**Sections:**
- All endpoints dengan examples
- Authentication guide
- Request/response formats
- Error handling
- Status codes
- Data types & formats
- Security recommendations
- cURL & JavaScript examples

**Target Audience:** API consumers, integrators

---

#### `PROJECT_STRUCTURE.md`
**Type:** Project Overview  
**Purpose:** Explain project structure (file ini)

---

### Testing & Setup Files

#### `test-send-data.js`
**Type:** Test Script  
**Purpose:** Send sample data ke API untuk testing

**Usage:**
```bash
node test-send-data.js
```

**Features:**
- Pre-configured sample data
- Automatic API call
- Success/error reporting
- 3 ingredients dengan multiple sessions
- Multiple exp dates per ingredient

---

#### `sample-data.json`
**Type:** Sample Data  
**Purpose:** JSON file untuk manual testing

**Usage:**
```bash
curl -X POST http://localhost:3000/api/mo/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d @sample-data.json
```

**Content:**
- 1 complete work order
- 6 ingredients
- 9 weighing sessions
- Multiple exp dates
- Realistic production data

---

#### `setup.sh`
**Type:** Bash Script  
**Purpose:** Automated setup untuk Linux/Mac

**Usage:**
```bash
chmod +x setup.sh
./setup.sh
```

**Features:**
- Check Node.js & npm installation
- Install dependencies automatically
- Verify port availability
- Create directories
- Display post-setup instructions

---

#### `setup.bat`
**Type:** Batch Script  
**Purpose:** Automated setup untuk Windows

**Usage:**
```batch
setup.bat
```

**Features:**
- Same as setup.sh but for Windows
- Windows-specific commands (netstat, where, etc.)
- Pause at end for user to read results

---

### Configuration Files

#### `.gitignore`
**Type:** Git Configuration  
**Purpose:** Exclude files dari version control

**Excluded:**
- `node_modules/`
- `*.db` (database files)
- `.env` files
- Logs
- OS-specific files
- IDE configurations

---

### Database

#### `mo_receiver.db`
**Type:** SQLite Database  
**Purpose:** Data storage  
**Auto-generated:** Yes (saat pertama kali server dijalankan)

**Tables:**

##### `received_work_orders`
```sql
CREATE TABLE received_work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_order TEXT UNIQUE NOT NULL,
  sku TEXT,
  formulation_name TEXT,
  production_date TEXT,
  planned_quantity REAL,
  status TEXT,
  operator_name TEXT,
  end_time TEXT,
  data_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Indexes:**
- Primary key on `id`
- Unique constraint on `work_order`

---

## 🔄 Data Flow

### 1. Receiving Data Flow

```
External Website (mows.moof-set.web.id)
    ↓
    POST /api/mo/receive
    ↓
server.js (Express)
    ↓
Validate & Extract Data
    ↓
SQLite Database (mo_receiver.db)
    ↓
Response (success/error)
```

### 2. Viewing Data Flow

```
User Browser
    ↓
GET /api/mo-list
    ↓
server.js
    ↓
Query Database
    ↓
Return List of MOs
    ↓
Display in Table (index.html)
```

### 3. Detail View Flow

```
User clicks "View Report"
    ↓
GET /api/mo-receiver/:id
    ↓
server.js
    ↓
Query Database (full JSON)
    ↓
Parse & Transform Data
    ↓
Display Detail Report (WeighingReceiverDetail component)
```

---

## 🏗️ Architecture

### Backend (Node.js)
```
Express Server (Port 3000)
    ├── Middleware
    │   ├── CORS
    │   ├── JSON Parser
    │   └── Static Files
    │
    ├── API Routes
    │   ├── POST /api/mo/receive
    │   ├── GET /api/mo-list
    │   ├── GET /api/mo-receiver/:id
    │   └── DELETE /api/mo-receiver/:id
    │
    └── Database
        └── SQLite (mo_receiver.db)
```

### Frontend (React)
```
Single-Page Application
    ├── App Component
    │   ├── State Management
    │   ├── Data Fetching
    │   ├── List View
    │   └── Navigation
    │
    └── WeighingReceiverDetail Component
        ├── Detail View
        ├── Report Summary
        ├── Print Function
        └── Back Navigation
```

---

## 🔧 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Backend Framework | Express.js | 4.18.2 | Web server |
| Database | SQLite3 | 5.1.6 | Data storage |
| Middleware | CORS | 2.8.5 | Cross-origin requests |
| Frontend | React | 18 | UI library |
| UI Rendering | React DOM | 18 | DOM manipulation |
| Transpiler | Babel Standalone | Latest | JSX to JS |
| Runtime | Node.js | 14+ | JavaScript runtime |
| Package Manager | npm | 6+ | Dependency management |

---

## 📦 Dependencies Graph

```
mo-receiver-website
├── express (Web Framework)
│   ├── body-parser (JSON parsing)
│   ├── cookie-parser
│   └── ...other express deps
│
├── sqlite3 (Database)
│   └── node-pre-gyp
│
├── cors (CORS Middleware)
│   └── ...cors deps
│
└── [devDependencies]
    └── nodemon (Auto-reload)
```

---

## 🚀 Deployment Structure

### Development
```
Local Machine (localhost:3000)
├── node server.js
├── SQLite Database (local file)
└── Frontend served from /public
```

### Production (Recommended)
```
VPS/Server
├── PM2 Process Manager
│   └── node server.js
├── Nginx (Reverse Proxy)
│   ├── SSL/TLS (HTTPS)
│   └── Port 80/443 → localhost:3000
├── SQLite Database
│   └── Regular Backups
└── Firewall Rules
```

---

## 📊 File Size Overview

| File | Approx. Size | Type |
|------|-------------|------|
| server.js | ~12 KB | JavaScript |
| public/index.html | ~32 KB | HTML/React |
| package.json | ~0.5 KB | JSON |
| test-send-data.js | ~3 KB | JavaScript |
| sample-data.json | ~4 KB | JSON |
| README.md | ~15 KB | Markdown |
| API.md | ~12 KB | Markdown |
| QUICK_START.md | ~5 KB | Markdown |
| setup.sh | ~2 KB | Bash |
| setup.bat | ~2 KB | Batch |
| node_modules/ | ~50 MB | Dependencies |
| mo_receiver.db | Variable | SQLite |

**Total Project Size:** ~50 MB (dengan node_modules)  
**Total Project Size:** ~100 KB (tanpa node_modules)

---

## 🔐 Security Considerations

### Current Implementation
- ✅ Bearer token authentication untuk POST endpoint
- ✅ CORS enabled
- ✅ JSON body parsing dengan size limits
- ✅ SQL injection prevention (prepared statements)
- ✅ Input validation

### Recommended for Production
- ⚠️ Implement proper token verification
- ⚠️ Add HTTPS/SSL
- ⚠️ Restrict CORS origins
- ⚠️ Add rate limiting
- ⚠️ Implement request logging
- ⚠️ Add authentication for DELETE endpoint
- ⚠️ Use environment variables for secrets
- ⚠️ Regular security updates

---

## 🧪 Testing Strategy

### Manual Testing
1. Run `node test-send-data.js`
2. Check browser at http://localhost:3000
3. Click "View Report" to verify detail view
4. Test print functionality

### cURL Testing
```bash
# Test receiving data
curl -X POST http://localhost:3000/api/mo/receive \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d @sample-data.json

# Test list
curl http://localhost:3000/api/mo-list

# Test detail
curl http://localhost:3000/api/mo-receiver/1

# Test delete
curl -X DELETE http://localhost:3000/api/mo-receiver/1
```

---

## 📝 Development Workflow

### Adding New Features

1. **Backend Changes:**
   - Edit `server.js`
   - Add new routes if needed
   - Update database schema if needed
   - Test dengan Postman/cURL

2. **Frontend Changes:**
   - Edit `public/index.html`
   - Update React components
   - Test di browser
   - Check responsive design

3. **Documentation:**
   - Update README.md
   - Update API.md if API changes
   - Update this file if structure changes

---

## 🔄 Version Control

### Git Workflow

```bash
# Initialize (jika belum)
git init

# Add files
git add .

# Commit
git commit -m "Initial commit: MO Receiver Website"

# Push to remote
git remote add origin <your-repo-url>
git push -u origin main
```

### Branching Strategy

```
main (production)
    ├── develop (development)
    ├── feature/* (new features)
    └── hotfix/* (urgent fixes)
```

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks

- [ ] Backup database weekly
- [ ] Check server logs
- [ ] Update dependencies monthly
- [ ] Monitor disk space (database growth)
- [ ] Review security patches
- [ ] Test backup restoration
- [ ] Update documentation

### Monitoring

Consider adding:
- Server uptime monitoring
- Error logging (Winston, Morgan)
- Performance monitoring
- Database size monitoring

---

## 🎯 Future Enhancements

### Planned Features
- [ ] User authentication system
- [ ] Role-based access control
- [ ] Export data to Excel/PDF
- [ ] Search and filter in list view
- [ ] Data analytics dashboard
- [ ] Email notifications
- [ ] Webhook configuration UI
- [ ] API key management
- [ ] Audit log viewer

### Technical Improvements
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Implement caching (Redis)
- [ ] Database migrations system
- [ ] API versioning
- [ ] GraphQL support
- [ ] WebSocket for real-time updates
- [ ] Multi-database support (PostgreSQL, MySQL)

---

**Last Updated:** December 19, 2024  
**Project Version:** 1.0.0  
**Node.js Version:** 14.x or higher  
**Database:** SQLite 3

