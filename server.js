const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); 
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;
const usersFile = path.join(__dirname, "users.json");

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const upload = multer();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// 🔗 Centralized Deployment / Tunnel Configuration 
const N8N_SERVER_BASE = "https://3dzqxw2k-5678.inc1.devtunnels.ms";

const getUsers = () => {
    if (!fs.existsSync(usersFile)) {
        fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
        return [];
    }
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
};

// --- 🔐 AUTHENTICATION API ROUTES ---
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        let users = getUsers(); 
        
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ message: "Email already exists" });
        }
        
        const newUser = { name, email, password, role };
        users.push(newUser);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        res.status(200).json({ message: "Registration successful!" });
    } catch (err) { 
        console.error("Registration Error:", err);
        res.status(500).json({ message: "Registration Error on server side" }); 
    }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const usersList = getUsers(); 
    const user = usersList.find(u => u.email === email && u.password === password);
    
    if (user) {
        let dashboard = "jobseeker-dashboard.html";

        if (user.role === "recruiter") {
            if (user.isApproved === true || user.isApproved === "true") {
                dashboard = "recruiter-dashboard.html";
            } else {
                user.role = "jobseeker"; 
            }
        }
        res.status(200).json({ redirectUrl: dashboard, role: user.role });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
});

app.get('/api/get-profile', (req, res) => {
    const { email } = req.query;
    const user = getUsers().find(u => u.email === email);
    
    if (user) {
        res.status(200).json(user);
    } else {
        res.status(404).json({ message: "User not found" });
    }
});

// --- 📄 UI / PAGE ROUTING ---
app.get('/interview', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'interview.html'));
});

app.get('/jobseeker-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'jobseeker-dashboard.html'));
});


// --- 💼 PROXIED N8N WEBHOOK ROUTES ---

// १. मुख्य जॉब इन्स्टंट अप्लिकेशन प्रॉक्सी (Multipart Form-Data Handling)
app.post('/proxy/job-application', upload.single('data'), async (req, res) => {
    try {
        const n8nFormData = new FormData();
        
        // सर्व टेक्स्ट फिल्ड्स अपेंड करा (Candidate Name, Email Address, etc.)
        for (const key in req.body) {
            n8nFormData.append(key, req.body[key]);
        }
        
        // फ्रंटएंडवरून येणारी फाईल (resume pdf) गोळा करून n8n कडे फॉरवर्ड करणे
        if (req.file) {
            n8nFormData.append('data', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype,
            });
        }

        const response = await fetch(`${N8N_SERVER_BASE}/webhook/Job%20Application`, {
            method: 'POST',
            body: n8nFormData,
            headers: n8nFormData.getHeaders()
        });

        res.status(response.status).send(await response.text());
    } catch (e) {
        console.error("Application Proxy Error:", e);
        res.status(500).send("Proxy Error");
    }
});

// २. AI ATS रेझ्युमे स्कॅनर प्रॉキシ
app.post('/proxy/parse-resume', upload.single('resume'), async (req, res) => {
    try {
        const n8nFormData = new FormData();
        for (const key in req.body) { 
            n8nFormData.append(key, req.body[key]); 
        }
        if (req.file) {
            n8nFormData.append('resume', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype,
            });
        }

        const response = await fetch(`${N8N_SERVER_BASE}/webhook/parse-resume`, {
            method: 'POST', 
            body: n8nFormData, 
            headers: n8nFormData.getHeaders()
        });
        res.status(response.status).send(await response.text());
    } catch (e) { 
        console.error("Resume Parser Proxy Error:", e);
        res.status(500).send("Proxy Error"); 
    }
});

// ३. जॉबसीकर AI चॅटबॉट प्रॉक्सी
app.post('/proxy/jobseeker-chat', async (req, res) => {
    try {
        const response = await fetch(`${N8N_SERVER_BASE}/webhook/jobseeker-chat`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        res.status(response.status).send(await response.text());
    } catch (e) { 
        console.error("Chat Proxy Error:", e);
        res.status(500).send("Proxy Error"); 
    }
});

// ४. प्रोफाईल अपडेट प्रॉक्सी (Google Sheet सेव्हिंगसाठी)
app.post('/proxy/update-profile', async (req, res) => {
    try {
        const response = await fetch(`${N8N_SERVER_BASE}/webhook/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        res.status(response.status).send(await response.text());
    } catch (e) {
        console.error("Profile Update Proxy Error:", e);
        res.status(500).send("Proxy Error");
    }
});

// ५. प्रोफाईल डेटा मिळवण्यासाठी प्रॉक्सी (Auto-Fill Onload)
app.post('/proxy/get-profile', async (req, res) => {
    try {
        const response = await fetch(`${N8N_SERVER_BASE}/webhook/get-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        res.status(response.status).send(await response.text());
    } catch (e) {
        console.error("Fetch Profile Proxy Error:", e);
        res.status(500).send("Proxy Error");
    }
});

// ६. रिक्रूटर्ससाठी अ‍ॅप्लिकेशन्स मिळवणे 
app.get('/proxy/get-applicants', async (req, res) => {
    try {
        const response = await fetch(`${N8N_SERVER_BASE}/webhook/get-applicants`);
        const data = await response.json();
        res.status(200).json(data);
    } catch (e) {
        res.status(500).json({ error: "Proxy route crashed" });
    }
});

// ७. Vapi इंटरव्ह्यू डेटा रेकॉर्ड्स
app.get('/proxy/vapi-interview-data', async (req, res) => {
    try {
        const response = await fetch(`${N8N_SERVER_BASE}/webhook/vapi-interview-data`);
        const data = await response.json();
        res.status(200).json(data);
    } catch (e) {
        res.status(500).json({ error: "Vapi data proxy error" });
    }
});

// Server Initialization
app.listen(PORT, () => {
    console.log(`🚀 Server running flawlessly on port ${PORT}`);
});
