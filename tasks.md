# Smart Civic Issue & Safety Platform

## Architecture Overview
- **Frontend**: React (Vite-powered for rapid development).
- **Backend**: Node.js & Express.
- **Database**: MongoDB (managed via Mongoose) for flexible JSON-like document storage.
- **Communication**: REST APIs.
- **Authentication**: JWT-based auth (future phases).

## Database Schemas

### Users Collection (`User`)
- `_id`: ObjectId
- `name`: String (Required)
- `email`: String (Required, Unique)
- `password`: String (Hashed)
- `role`: Enum `['citizen', 'authority']` default `'citizen'`
- `createdAt` & `updatedAt`: Timestamps

### Issues Collection (`Issue`)
- `_id`: ObjectId
- `title`: String (Required)
- `description`: String (Required)
- `category`: Enum `['Infrastructure', 'Sanitation', 'Safety', 'Noise', 'Other']`
- `status`: Enum `['Pending', 'In-Progress', 'Resolved']` default `'Pending'`
- `location`:
  - `type`: String (enum: `['Point']`)
  - `coordinates`: [Number, Number] (Longitude, Latitude)
- `author`: ObjectId (ref: 'User')
- `upvotes`: Array of ObjectIds (ref: 'User')
- `imageUrl`: String (Optional)
- `createdAt` & `updatedAt`: Timestamps

## API Endpoints

### Auth
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate & obtain token

### Issues
- `GET /api/issues` - Fetch list of issues (supports filtering/sorting)
- `GET /api/issues/:id` - Fetch details of a specific issue
- `POST /api/issues` - Report a new issue
- `PUT /api/issues/:id` - Update an issue (e.g., status updates by authority)
- `POST /api/issues/:id/upvote` - Upvote an issue (citizen action)

## Project Phasing

### Phase 1 (Core MVP)
- [x] Set up minimal React frontend and Express backend scaffold.
- [x] Connect Node server to MongoDB.
- [x] Database Schemas: Create `User` and `Issue` Mongoose models.
- [x] Backend Core APIs: Implement foundational API routes for creating, listing, updating, and upvoting issues.
- [x] Frontend Prep: Established `.env` management and secured CORS.
- [x] UI Components: Implemented premium social UI (Twitter/X style) with `lucide-react` icons and responsive Tailwind layout.
- [x] Feed UI Redesign: Created `CitizenLayout` and modernized the feed into a dashboard 3-column widget grid.
- [x] Report Issue Redesign: Implement Google Maps locator, drag-drop placeholders, and high-fidelity form UI.
- [x] Full-Stack Data Diagnostics: Executed robust AI fallback routines and server payload scaling resolving POST bottlenecks.
- [x] Refactored Axios using `import.meta.env.VITE_API_URL`
- [x] Run client and server concurrently locally via root configurations.

### Phase 2 (Map/Admin)
- [x] Integrate MapBox or Leaflet on the React front end to visualize issues.
- [x] Embed geospatial queries in MongoDB to fetch nearest issues efficiently.
- [x] Build an Admin Dashboard UI for 'Authorities' to log in and change issue status.
- [x] Full-Stack Data Integration: Connect Admin Dashboard KPIs and Table to MongoDB dynamically.
- [ ] Add Cloudinary or S3 for handling issue image uploads securely.
- [x] Dynamic Infrastructure Management is live.

### Phase 3 (AI/Smart Layer)
- [x] Integrate Gemini AI to auto-classify and assign priority rankings.
- [x] Automated Multi-Dept Dispatch mapping connects Gemini AI outcomes dynamically with localized Service Center infrastructure.
- [ ] Implement NLP for hazard detection and emergency flagging.
- [ ] Analytics aggregation for heatmaps showing repeated issues.
- [ ] Implement smart alerts to notify authorities directly via webhooks or SMS when critical thresholds are met.
