const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); 
const pdf = require('pdf-parse');
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

const N8N_SERVER_BASE = "https://3dzqxw2k-5678.inc1.devtunnels.ms"; 

app.post('/webhook/vapi-results', async (req, res) => {
    try {
        const n8nWebhookUrl = `${N8N_SERVER_BASE}/webhook/vapi-results`; 

        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        res.status(response.status).send("Data forwarded successfully");
    } catch (error) {
        console.error("Error forwarding to n8n:", error);
        res.status(500).send("Internal Server Error");
    }
});

const getUsers = () => {
    if (!fs.existsSync(usersFile)) {
        fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
        return [];
    }
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
};

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

// --- 📄 PAGE ROUTING ---
app.get('/interview', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'interview.html'));
});

app.get('/jobseeker-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'jobseeker-dashboard.html'));
});

// 💼 १. मुख्य जॉब अप्लिकेशन प्रॉक्सी (दुरुस्त केलेला)
app.post('/proxy/job-application', upload.single('resume_file'), async (req, res) => {
    try {
        const n8nFormData = new FormData();
        
        for (const key in req.body) {
            n8nFormData.append(key, req.body[key]);
        }
        
        if (req.file) {
            // n8n मधील 'Extract from File' नोडला 'resume_file' याच नावाने डेटा पाठवणे गरजेचे आहे
            n8nFormData.append('resume_file', req.file.buffer, {
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

// 🧪 २. जॉब अप्लिकेशन टेस्ट प्रॉキシ (दुरुस्त केलेला)
app.post('/proxy/job-application-test', upload.single('resume_file'), async (req, res) => {
    try {
        const n8nFormData = new FormData();
        for (const key in req.body) { n8nFormData.append(key, req.body[key]); }
        if (req.file) {
            n8nFormData.append('resume_file', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype,
            });
        }

        const response = await fetch(`${N8N_SERVER_BASE}/webhook-test/Job%20Application`, {
            method: 'POST', body: n8nFormData, headers: n8nFormData.getHeaders()
        });
        res.status(response.status).send(await response.text());
    } catch (e) { 
        console.error("Test Proxy Error:", e);
        res.status(500).send("Proxy Error"); 
    }
});

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

// 👤 ३. प्रोफाईल अपडेट प्रॉキシ ('ा' अक्षर काढून फिक्स केलेला)
app.post('/proxy/update-profile', async (req, res) => {
    try {
        const targetPath = req.body.action === "fetch" ? 'get-profile' : 'update-profile';
        
        const response = await fetch(`${N8N_SERVER_BASE}/webhook/${targetPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        res.status(response.status).send(await response.text());
    } catch (e) {
        console.error("Profile Proxy Error:", e);
        res.status(500).send("Proxy Error");
    }
});

app.get('/proxy/get-applicants', async (req, res) => {
    try {
        const response = await fetch(`${N8N_SERVER_BASE}/webhook/get-applicants`);
        const data = await response.json();
        res.status(200).json(data);
    } catch (e) {
        res.status(500).json({ error: "Proxy route crashed" });
    }
});

app.get('/proxy/vapi-interview-data', async (req, res) => {
    try {
        const response = await fetch(`${N8N_SERVER_BASE}/webhook/vapi-interview-data`);
        const data = await response.json();
        res.status(200).json(data);
    } catch (e) {
        res.status(500).json({ error: "Vapi data proxy error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
