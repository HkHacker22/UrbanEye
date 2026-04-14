# 👁️ UrbanEye: Next-Generation Civic Intelligence & Safety Ecosystem

UrbanEye is far beyond a traditional "pothole reporting" application. It is a comprehensive **urban safety, surveillance, and civic intelligence system** built to bridge the gap between citizens and municipal authorities. 

By combining real-time citizen-driven reporting with cutting-edge **AI-powered CCTV anomaly detection** and geospatial triage, UrbanEye serves as a centralized command center for smarter, safer, and highly responsive cities.

---

## 🌟 The Vision

Modern urban management is plagued by fragmented data, slow manual dispatch times, and reactive rather than proactive safety measures. UrbanEye solves this by providing:

1. **A Secure Citizen Portal** where residents can report infrastructural issues and track real-time resolution.
2. **An AI Safety Monitor** capable of analyzing surveillance feeds to detect critical violence and anomalies instantly.
3. **An Executive Admin Dashboard** for authorities to manage dispatches, view risk heatmaps, and track resolution SLAs.

---

## 🚀 Core Platform Features

### 🛡️ 1. Live CCTV Violence & Anomaly Detection
UrbanEye isn't just about waiting for reports—it actively watches over the community.
* **Gemini-Powered Neural Analysis:** Upload video evidence or connect to localized surveillance feeds. The system automatically decodes frames to flag critical anomalies.
* **Threat Detection:** Specifically trained to identify weapons, violent altercations, unusual loitering, and public hazards.
* **Instant Triage:** Anomalies generate immediate, high-priority alerts with exact geospatial data for rapid authority deployment.

### 🧠 2. Instant AI-Powered Issue Sorting (Geospatial Triage)
When a citizen submits a report (e.g., a broken street light or illegal dumping), the system does the paperwork automatically.
* **AI Categorization:** The Gemini model analyzes the report text and imagery to determine severity automatically (Critical, High, Medium, Low).
* **Smart Routing:** Utilizing geospatial algorithms, the platform calculates the exact origin of the incident and automatically routes the ticket to the nearest appropriate Service Center or Authority (e.g., Police, Sanitation Department).

### 🏆 3. The Karma Matrix: Gamified Civic Engagement
To ensure continuous, high-quality data from the community, UrbanEye employs a gamified retention system.
* **Earn Karma Points:** Citizens earn points for submitting verified reports and when their reported issues are successfully resolved by the city.
* **Tier Roadmap:** Users climb ranks from *Novice Reporter* to *Civic Champion*, earning public recognition and fostering a sense of trusted community engagement.
* **Transparent Ledger:** A fully transparent history of karma transactions keeps citizens engaged and informed.

### 🗺️ 4. Dynamic Risk Heatmaps & Executive Dashboard
A military-grade view of the city for municipal stakeholders.
* **Real-time Heatmaps:** Visualize clustering of specific issue types (e.g., localized flooding or crime hotspots) to proactively deploy resources.
* **SLA Monitoring:** Instantly see metrics like *Average Resolution Time*, *Pending Critical Issues*, and *Active Citizen Count*.
* **Map-based Authority Registry:** Manually override AI routing or register new regional authorities directly on the interactive map.

---

## 🔧 Technical Architecture

UrbanEye is a modern, responsive full-stack application built for scale and high performance.

* **Frontend:** React, Vite, Tailwind CSS v4, Lucide Icons.
* **Backend:** Node.js, Express (Serverless Optimized for Vercel).
* **Database:** MongoDB Atlas.
* **Intelligence Layer:** Google Gemini AI API.
* **Deployment:** Vercel (Multi-Service Architecture).

---

## 💻 Running the Project Locally

### Prerequisites
* Node.js (v18+)
* MongoDB Atlas Cluster
* Google Cloud Console Project (Maps API and Gemini API keys)

### Environment Setup

**1. Setup Backend:**
In `backend/.env`:
```env
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_APPLICATION_CREDENTIALS=your_gcp_key.json
```

**2. Setup Frontend:**
In `frontend/.env`:
```env
VITE_API_URL=/api
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Start Development Server
Running from the root directory:
```bash
npm install
npm run dev
```
This will start both the frontend and the backend (via `backend/api/index.js`) concurrently.

---

## 🚀 Deployment (Vercel)

UrbanEye is optimized for Vercel using the `experimentalServices` setup.
1. Push your code to GitHub.
2. Connect the repo to Vercel.
3. Configure environment variables in the Vercel dashboard.

---

## 🔒 Trust & Security
* **Anonymous Reporting:** Citizens can report sensitive hazards entirely anonymously.
* **End-to-End Tracking:** Every ticket transition is logged and timestamped.
* **Secure Auth:** Google OAuth 2.0 ensuring user data privacy.
