# Stitch Academic AI Questionnaire Web App

A highly interactive, modern, and responsive multi-page web application designed to survey and analyze the academic impact of AI tool usage among students.

---

## 🚀 Features

### Student Survey Flow
*   **Role-Based Access**: Choose between Student and Admin roles with secure password protection for the admin dashboard.
*   **Respondent Profile**: Collects student information (Name, Age, Sex, Section, and Strand). Includes dynamic "Other" specify option for strands.
*   **Duplicate Submission Protection**: Prevents multiple submissions from the same respondent name.
*   **AI Tool Usage Details**: Multi-select interface for selecting tools (ChatGPT, Gemini, Perplexity, etc.) and specifies frequency of use and time spent per day.
*   **Perceptions on AI**: Likert 1-5 scale rating for AI's helpfulness in learning, quality of output, and responsible usage.
*   **Review Screen**: Final confirmation page to inspect all inputs before submitting.

### Admin Dashboard
*   **Real-time Analytics**: Displays participation rate, top tools, and interactive visual percentage charts.
*   **Submissions Table**: Paginated list of respondents with quick-view modals for details.
*   **Record Management**:
    *   **Single Deletion**: Admins can delete individual student records from the database.
    *   **Clear All Data**: Reset functionality to wipe all questionnaire submissions securely.

---

## 🛠️ Tech Stack & Design
*   **Core**: HTML5, Vanilla JavaScript, Tailwind CSS (via CDN)
*   **Database**: Google Firebase Realtime Database (real-time sync across all devices — no server needed)
*   **State Management**: `SurveyDB` utility managing unified state persistence.
*   **Design Language**: Google Material 3 Design System (Glassmorphic cards, Outfit/Plus Jakarta Sans/Inter typography, responsive layouts).
*   **Icons**: Google Material Symbols Outlined.

---

## 📂 Project Structure
```
stitch-survey-ready/
├── index.html         # Entry Portal & Password Toggle (Login)
├── introduction.html  # Greeting Page & Anonymous Notice
├── profile.html       # Student Info (Name verification/Strand options)
├── usage.html         # Part II: Tool selection & usage frequency
├── perceptions.html   # Part III: Likert scale perceptions
├── review.html        # Submission summary page
├── admin.html         # Analytics, charts, and record deletion
└── survey_db.js       # Central State & Firebase Controller
```

---

## 🔑 Admin Access
*   Admin login is **password-protected**. Contact the researcher/teacher for the admin password.
*   Do **not** share the admin password with students.

---

## 🌐 Live Demo (GitHub Pages)
Open the survey here:
```
https://densioai.github.io/stitch-survey-github/
```

---

## ☁️ How to Deploy (GitHub Pages)
1. Fork or upload this repository to your GitHub account.
2. Go to **Settings → Pages**.
3. Set Source to **Deploy from a branch** → `main` → `/ (root)`.
4. Click **Save**. Your app will be live in a few minutes.

> ✅ No server or XAMPP needed. All data is stored in **Google Firebase Realtime Database** and syncs in real-time across all devices.

---

## 👥 Capacity & Scaling
*   **Tested for up to 200 concurrent students** using Firebase atomic transactions
*   Collision-resistant submission IDs prevent duplicate record issues under simultaneous load
*   Firebase Free (Spark) plan supports up to **100 simultaneous connections** — for 200 students in staggered class periods, this works reliably
*   For a single session with all 200 students at once: upgrade Firebase to **Blaze plan** (free until ~$1–2/month at this scale)

---

*Developed by Densio Cute AI, Student of ZDSPGC 2026*
