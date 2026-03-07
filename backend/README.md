# NGO Asset App — Backend API

A Node.js + Express + MongoDB REST API for the NGO Asset Management frontend.

## Tech Stack
- **Node.js** + **Express** — REST API
- **MongoDB** + **Mongoose** — Database & ODM
- **JWT** — Authentication
- **bcryptjs** — Password hashing

## Project Structure
```
backend/
├── models/
│   ├── User.js
│   ├── Asset.js
│   ├── Assignment.js
│   ├── Maintenance.js
│   └── Category.js
├── routes/
│   ├── auth.js
│   ├── assets.js
│   ├── assignments.js
│   ├── maintenance.js
│   ├── categories.js
│   └── reports.js
├── middleware/
│   └── auth.js
├── server.js
├── seed.js
└── .env.example
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### 3. Seed the database (optional)
```bash
node seed.js
```
This populates the DB with sample data matching the frontend mock data.

Default credentials after seeding:
- **Admin**: `admin@ngo.org` / `admin123`
- **Staff**: `staff@ngo.org` / `staff123`

### 4. Start the server
```bash
npm run dev      # development (nodemon)
npm start        # production
```

Server runs on `http://localhost:5000`

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/auth/me` | Get current user (protected) |

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List all assets (filter: `?search=&category=&status=`) |
| GET | `/api/assets/:id` | Get single asset |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete asset (Admin only) |

### Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assignments` | List all assignments (filter: `?status=&assetId=`) |
| GET | `/api/assignments/:id` | Get single assignment |
| POST | `/api/assignments` | Create assignment (also updates asset status) |
| PUT | `/api/assignments/:id` | Update assignment (returning sets asset to Available) |

### Maintenance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/maintenance` | List all records (filter: `?assetId=&status=`) |
| GET | `/api/maintenance/:id` | Get single record |
| POST | `/api/maintenance` | Log new maintenance |
| PUT | `/api/maintenance/:id` | Update record (Completed → sets asset to Available) |
| DELETE | `/api/maintenance/:id` | Delete record |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories with asset counts |
| POST | `/api/categories` | Create category (Admin only) |
| PUT | `/api/categories/:id` | Update category (Admin only) |
| DELETE | `/api/categories/:id` | Delete category (Admin only) |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/summary` | Dashboard stats (total/available/assigned/etc.) |
| GET | `/api/reports/assets-by-category` | Asset counts per category |
| GET | `/api/reports/assets-by-status` | Asset counts per status |
| GET | `/api/reports/monthly-assignments` | Assignments per month (current year) |
| GET | `/api/reports/top-assigned-assets` | Top 5 most assigned assets |
| GET | `/api/reports/maintenance-costs` | Maintenance cost per asset |

---

## Authentication

All routes (except `/api/auth/login` and `/api/auth/register`) require a Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

## Connecting the Frontend

In your React app, replace mock data calls with API calls. Example:

```js
// Login
const res = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const { token, user } = await res.json();

// Fetch assets
const res = await fetch('http://localhost:5000/api/assets', {
  headers: { Authorization: `Bearer ${token}` },
});
const { data } = await res.json();
```
