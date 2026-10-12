// survey_db.js
// Centralized state & database manager for Stitch Dynamic Questionnaire

// ==========================================
// DATABASE CONFIGURATION
// ==========================================
// Choose your database mode:
// 'firebase' -> Google Firebase Database (Perfect for serverless/GitHub Pages deployment)
// 'php'      -> XAMPP / Local Web Server (Uses local api.php and server_db.json)
// 'local'    -> Browser LocalStorage only (No sync between devices)
const SURVEY_DB_MODE = 'firebase'; 

// Fill in your Google Firebase Project credentials here (only needed if SURVEY_DB_MODE is 'firebase')
const firebaseConfig = {
    apiKey: "AIzaSyDn9U7CQsjU3eSogjDCsy_Pd7r0z0arGEg",
    authDomain: "presurvey-f0ecd.firebaseapp.com",
    databaseURL: "https://presurvey-f0ecd-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "presurvey-f0ecd",
    storageBucket: "presurvey-f0ecd.firebasestorage.app",
    messagingSenderId: "498948106435",
    appId: "1:498948106435:web:f270fa8e15af10bbec1a76",
    measurementId: "G-LYES6KKG0X"
};

// Helper for dynamic Firebase loading
let fbDb = null;
async function getFbDb() {
    if (fbDb) return fbDb;
    try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
        const { getDatabase } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
        const app = initializeApp(firebaseConfig);
        fbDb = getDatabase(app);
        return fbDb;
    } catch (e) {
        console.error("Failed to load Firebase SDK dynamically:", e);
        return null;
    }
}

const SurveyDB = {
    // Initializer
    init() {
        if (!localStorage.getItem('survey_initialized')) {
            localStorage.setItem('survey_submissions', JSON.stringify([]));
            localStorage.setItem('survey_started_count', "0");
            localStorage.setItem('survey_initialized', "true");
        }
        if (!localStorage.getItem('survey_locked')) {
            localStorage.setItem('survey_locked', "false");
        }
    },

    // Hard reset — clears ALL stored data and forces re-init to a clean state
    async resetAllData() {
        localStorage.removeItem('survey_submissions');
        localStorage.removeItem('survey_started_count');
        localStorage.removeItem('survey_initialized');
        localStorage.removeItem('survey_draft');
        localStorage.removeItem('survey_session');
        this.init();

        if (SURVEY_DB_MODE === 'firebase') {
            try {
                const db = await getFbDb();
                if (db) {
                    const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
                    await set(ref(db, 'submissions'), null);
                    await set(ref(db, 'started_count'), 0);
                }
            } catch (e) {
                console.error("Firebase reset failed:", e);
            }
        } else if (SURVEY_DB_MODE === 'php') {
            try {
                const rootPath = window.location.pathname.includes('/code.html') ? '../api.php' : 'api.php';
                await fetch(`${rootPath}?action=reset`);
            } catch (e) {
                console.warn("Failed to reset server data:", e);
            }
        }
    },

    // Session Management
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('survey_session')) || null;
    },

    startStudentSession() {
        localStorage.setItem('survey_session', JSON.stringify({ role: 'student' }));
    },

    loginAdmin(password) {
        if (password === 'densiocute143') {
            localStorage.setItem('survey_session', JSON.stringify({ role: 'admin' }));
            return true;
        }
        return false;
    },

    logout() {
        localStorage.removeItem('survey_session');
    },

    async toggleSurveyLock() {
        const currentLock = localStorage.getItem('survey_locked') === 'true';
        const newLock = !currentLock;
        localStorage.setItem('survey_locked', String(newLock));

        if (SURVEY_DB_MODE === 'firebase') {
            try {
                const db = await getFbDb();
                if (db) {
                    const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
                    await set(ref(db, 'locked'), newLock);
                    return true;
                }
            } catch (e) {
                console.error("Firebase lock toggle failed:", e);
            }
        }
        return true;
    },

    // Draft Management (for persistent multi-page navigation)
    getDraft() {
        return JSON.parse(localStorage.getItem('survey_draft')) || null;
    },

    saveDraft(data) {
        const current = this.getDraft() || {};
        const updated = { ...current, ...data };
        localStorage.setItem('survey_draft', JSON.stringify(updated));
    },

    clearDraft() {
        localStorage.removeItem('survey_draft');
    },

    async syncWithServer() {
        if (SURVEY_DB_MODE === 'firebase') {
            try {
                const db = await getFbDb();
                if (!db) return false;
                
                const { ref, get, child } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
                const dbRef = ref(db);
                
                const subSnapshot = await get(child(dbRef, 'submissions'));
                let submissions = [];
                if (subSnapshot.exists()) {
                    const data = subSnapshot.val();
                    // Firebase object to sorted array conversion (ordered by timestamp/id descending)
                    submissions = Object.values(data).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
                }
                localStorage.setItem('survey_submissions', JSON.stringify(submissions));

                const countSnapshot = await get(child(dbRef, 'started_count'));
                const startedCount = countSnapshot.exists() ? countSnapshot.val() : 0;
                localStorage.setItem('survey_started_count', String(startedCount));

                const lockedSnapshot = await get(child(dbRef, 'locked'));
                const isLocked = lockedSnapshot.exists() ? lockedSnapshot.val() : false;
                localStorage.setItem('survey_locked', String(isLocked));
                
                return true;
            } catch (e) {
                const isPermissionDenied = e && (
                    (e.code && e.code.toString().includes('PERMISSION_DENIED')) ||
                    (e.message && e.message.toLowerCase().includes('permission'))
                );
                if (isPermissionDenied) {
                    console.error(
                        '\n🔴 FIREBASE PERMISSION DENIED\n' +
                        'Your Firebase Realtime Database security rules are blocking all access.\n\n' +
                        'TO FIX: Go to Firebase Console → Realtime Database → Rules tab:\n' +
                        'https://console.firebase.google.com/project/presurvey-f0ecd/database\n\n' +
                        'Then set rules to:\n' +
                        '{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}\n'
                    );
                    window._firebasePermissionDenied = true;
                } else {
                    console.warn("Firebase sync failed, using cached offline data:", e);
                    window._firebasePermissionDenied = false;
                }
                return false;
            }
        }

        if (SURVEY_DB_MODE === 'php') {
            try {
                const rootPath = window.location.pathname.includes('/code.html') ? '../api.php' : 'api.php';
                const response = await fetch(`${rootPath}?action=get_data`);
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('survey_submissions', JSON.stringify(data.submissions || []));
                    localStorage.setItem('survey_started_count', String(data.started_count || 0));
                    return true;
                }
            } catch (e) {
                console.warn("Server sync failed, running in local-only mode:", e);
            }
        }
        return false;
    },

    async subscribeToUpdates(callback) {
        if (SURVEY_DB_MODE === 'firebase') {
            try {
                const db = await getFbDb();
                if (!db) return false;
                const { ref, onValue } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
                
                // Real-time listener for submissions changes
                onValue(ref(db, 'submissions'), (snapshot) => {
                    let submissions = [];
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        submissions = Object.values(data).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
                    }
                    localStorage.setItem('survey_submissions', JSON.stringify(submissions));
                    callback();
                });

                // Real-time listener for started_count changes
                onValue(ref(db, 'started_count'), (snapshot) => {
                    const startedCount = snapshot.exists() ? snapshot.val() : 0;
                    localStorage.setItem('survey_started_count', String(startedCount));
                    callback();
                });

                // Real-time listener for locked changes
                onValue(ref(db, 'locked'), (snapshot) => {
                    const isLocked = snapshot.exists() ? snapshot.val() : false;
                    localStorage.setItem('survey_locked', String(isLocked));
                    callback();
                });
                return true;
            } catch (e) {
                console.error("Firebase real-time subscription failed:", e);
                return false;
            }
        }
        return false;
    },

    // Submissions Management
    getSubmissions() {
        this.init();
        return JSON.parse(localStorage.getItem('survey_submissions')) || [];
    },

    hasSubmitted(name) {
        if (!name || name.trim().toLowerCase() === 'anonymous') return false;
        const submissions = this.getSubmissions();
        const searchName = name.trim().toLowerCase();
        return submissions.some(s => s.name && s.name.trim().toLowerCase() === searchName);
    },

    getStartedCount() {
        this.init();
        return parseInt(localStorage.getItem('survey_started_count')) || 0;
    },

    incrementStartedCount() {
        this.init();
        const current = this.getStartedCount();
        localStorage.setItem('survey_started_count', (current + 1).toString());

        if (SURVEY_DB_MODE === 'firebase') {
            getFbDb().then(async db => {
                if (db) {
                    // Use atomic server-side increment to prevent race conditions
                    // Safe for 200+ concurrent students submitting simultaneously
                    const { ref, increment } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
                    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then(async ({ ref, runTransaction }) => {
                        await runTransaction(ref(db, 'started_count'), (current) => {
                            return (current || 0) + 1;
                        });
                    });
                }
            }).catch(e => console.error("Firebase increment count failed:", e));
        } else if (SURVEY_DB_MODE === 'php') {
            const rootPath = window.location.pathname.includes('/code.html') ? '../api.php' : 'api.php';
            fetch(`${rootPath}?action=increment_started`).catch(e => console.warn("Failed to increment started count on server:", e));
        }
    },

    async submitSurvey() {
        if (localStorage.getItem('survey_locked') === 'true') {
            alert('Survey is locked by the administrator. Submission failed.');
            return false;
        }
        const draft = this.getDraft();
        if (!draft) return false;

        const submissions = this.getSubmissions();
        // Generate a collision-resistant ID using timestamp + random suffix
        // This is safe for 200+ concurrent users
        const newId = `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        
        const newSubmission = {
            id: newId,
            timestamp: new Date().toISOString(),
            name: draft.name || "Anonymous",
            age: parseInt(draft.age),
            sex: draft.sex,
            strand: draft.strand,
            section: draft.section,
            // Part II: ChatGPT Assistance in Academic Tasks (15 questions)
            perceptions: draft.perceptions || {},
            // Part III: Students' Use of ChatGPT
            hasUsedChatGPT: draft.hasUsedChatGPT || "Yes",
            frequency: draft.frequency || "Sometimes",
            usages: draft.usages || [],
            otherUsage: draft.otherUsage || "",
            mostUsedTask: draft.mostUsedTask || "",
            timeSpent: draft.timeSpent || "Less than 30 minutes",
            toolSelect: "ChatGPT",
            otherTool: ""
        };

        submissions.unshift(newSubmission); // Add to local cache first
        localStorage.setItem('survey_submissions', JSON.stringify(submissions));
        this.clearDraft();

        if (SURVEY_DB_MODE === 'firebase') {
            try {
                const db = await getFbDb();
                if (db) {
                    const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
                    await set(ref(db, 'submissions/' + newSubmission.id), newSubmission);
                    return true;
                }
            } catch (e) {
                console.error("Firebase submit failed:", e);
            }
        } else if (SURVEY_DB_MODE === 'php') {
            try {
                const rootPath = window.location.pathname.includes('/code.html') ? '../api.php' : 'api.php';
                const response = await fetch(`${rootPath}?action=submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newSubmission)
                });
                if (response.ok) {
                    return true;
                } else {
                    const err = await response.json();
                    if (err.error === 'Duplicate submission') {
                        await this.syncWithServer();
                        return false;
                    }
                }
            } catch (e) {
                console.warn("Failed to submit to server, using offline local storage:", e);
            }
        }
        return true;
    },

    async deleteSubmission(id) {
        const submissions = this.getSubmissions();
        const updated = submissions.filter(sub => sub.id !== id);
        localStorage.setItem('survey_submissions', JSON.stringify(updated));

        if (SURVEY_DB_MODE === 'firebase') {
            try {
                const db = await getFbDb();
                if (db) {
                    const { ref, remove } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
                    await remove(ref(db, 'submissions/' + id));
                }
            } catch (e) {
                console.error("Firebase delete failed:", e);
            }
        } else if (SURVEY_DB_MODE === 'php') {
            try {
                const rootPath = window.location.pathname.includes('/code.html') ? '../api.php' : 'api.php';
                await fetch(`${rootPath}?action=delete&id=${id}`);
            } catch (e) {
                console.warn("Failed to delete from server:", e);
            }
        }
    },

    // Internal Mock Data Generator
    _generateMockSubmissions(count) {
        const firstNames = ["Juan", "Sarah", "Robert", "Maria", "Jose", "Ana", "Miguel", "Angela", "David", "Jessica", "Daniel", "Christine", "Mark", "Patricia", "James", "Elizabeth", "Elena", "Ronaldo", "Liza", "Ferdinand"];
        const lastNames = ["Manuel", "Aquino", "Diaz", "Santos", "Cruz", "Reyes", "Gonzales", "Ocampo", "Bautista", "Garcia", "dela Cruz", "Ramos", "Torres", "Mendoza", "Villanueva", "Castro", "Santos", "Aquino", "Perez", "Marcos"];
        const sexes = ["male", "female", "prefer_not_to_say"];
        const strands = ["STEM", "HUMSS", "ABM", "GAS", "TVL"];
        const sections = ["12-A", "12-B", "12-C", "12-Archon", "12-Genesis"];
        const tools = ["ChatGPT", "Google Gemini", "Grammarly", "Perplexity AI", "QuillBot", "Canva AI", "Claude", "DeepSeek"];
        const frequencies = ["Rarely", "Sometimes", "Often", "Always"];
        const times = ["Less than 30 minutes", "30 minutes to 1 hour", "1–2 hours", "More than 2 hours"];
        const usagesList = [
            "Answering assignments",
            "Generating ideas",
            "Summarizing information",
            "Explaining lessons",
            "Writing activities",
            "Reviewing lessons",
            "Researching information"
        ];
        const sampleTasks = [
            "Writing essay outlines and drafts",
            "Explaining difficult lessons in Science",
            "Solving math equations and showing steps",
            "Summarizing lengthy reading materials",
            "Brainstorming creative project topics",
            "Reviewing concepts before exams"
        ];

        const generate15Perceptions = (min = 3) => {
            const res = {};
            for (let q = 1; q <= 15; q++) {
                res[`q${q}`] = Math.min(5, Math.max(1, min + Math.floor(Math.random() * (6 - min))));
            }
            return res;
        };

        const list = [];

        list.push({
            id: "SUB-001",
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
            name: "Juan Manuel",
            age: 18,
            sex: "male",
            strand: "STEM",
            section: "12-A",
            toolSelect: "ChatGPT",
            hasUsedChatGPT: "Yes",
            otherTool: "",
            usages: ["Researching information", "Answering assignments", "Explaining lessons"],
            otherUsage: "",
            mostUsedTask: "Explaining coding algorithms and math formulas",
            frequency: "Often",
            timeSpent: "1–2 hours",
            perceptions: generate15Perceptions(4)
        });
        list.push({
            id: "SUB-002",
            timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
            name: "Sarah Aquino",
            age: 17,
            sex: "female",
            strand: "HUMSS",
            section: "12-B",
            toolSelect: "ChatGPT",
            hasUsedChatGPT: "Yes",
            otherTool: "",
            usages: ["Researching information", "Summarizing information", "Writing activities"],
            otherUsage: "",
            mostUsedTask: "Writing drafts for humanities essays",
            frequency: "Often",
            timeSpent: "30 minutes to 1 hour",
            perceptions: generate15Perceptions(4)
        });
        list.push({
            id: "SUB-003",
            timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
            name: "Anonymous",
            age: 18,
            sex: "male",
            strand: "ABM",
            section: "12-A",
            toolSelect: "ChatGPT",
            hasUsedChatGPT: "Yes",
            otherTool: "",
            usages: ["Researching information", "Answering assignments", "Generating ideas"],
            otherUsage: "",
            mostUsedTask: "Brainstorming business marketing ideas",
            frequency: "Sometimes",
            timeSpent: "Less than 30 minutes",
            perceptions: generate15Perceptions(3)
        });

        // Generate the rest procedurally
        for (let i = 4; i <= count; i++) {
            const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
            const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
            const isAnon = Math.random() < 0.25;
            const sex = sexes[Math.floor(Math.random() * sexes.length)];
            const strand = strands[Math.floor(Math.random() * strands.length)];
            const section = sections[Math.floor(Math.random() * sections.length)];
            const frequency = frequencies[Math.floor(Math.random() * frequencies.length)];
            const timeSpent = times[Math.floor(Math.random() * times.length)];
            const mostUsedTask = sampleTasks[Math.floor(Math.random() * sampleTasks.length)];
            
            const numUsages = 2 + Math.floor(Math.random() * 3);
            const usages = [];
            while (usages.length < numUsages) {
                const usage = usagesList[Math.floor(Math.random() * usagesList.length)];
                if (!usages.includes(usage)) usages.push(usage);
            }

            list.push({
                id: `SUB-${String(i).padStart(3, '0')}`,
                timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000).toISOString(),
                name: isAnon ? "Anonymous" : `${fn} ${ln}`,
                age: 16 + Math.floor(Math.random() * 4),
                sex,
                strand,
                section,
                toolSelect: "ChatGPT",
                hasUsedChatGPT: "Yes",
                otherTool: "",
                usages,
                otherUsage: "",
                mostUsedTask,
                frequency,
                timeSpent,
                perceptions: generate15Perceptions(2)
            });
        }

        return list;
    }
};

// Auto initialize database when loaded
SurveyDB.init();

// Automatically sync with server on page load (silent background operation) and guard pages
if (typeof window !== 'undefined') {
    function checkLockedStateAndRedirect() {
        const path = window.location.pathname;
        const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        const studentPages = ['introduction.html', 'profile.html', 'usage.html', 'perceptions.html', 'review.html'];
        
        const isStudentPage = studentPages.includes(page);
        const isLocked = localStorage.getItem('survey_locked') === 'true';
        
        if (isStudentPage && isLocked) {
            const user = SurveyDB.getCurrentUser();
            if (!user || user.role !== 'admin') {
                localStorage.removeItem('survey_session');
                window.location.href = 'index.html?locked=true';
            }
        }
    }

    const runSync = async () => {
        await SurveyDB.syncWithServer();
        checkLockedStateAndRedirect();
        
        // Also subscribe to changes in real-time
        SurveyDB.subscribeToUpdates(() => {
            checkLockedStateAndRedirect();
        });
    };

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', runSync);
    } else {
        runSync();
    }
}
