const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const usersFile = path.join(__dirname, "users.json");


const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

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

app.post('/webhook/vapi-results', async (req, res) => {
    try {
        
        const n8nWebhookUrl = 'https://3dzqxw2k-5678.inc1.devtunnels.ms/webhook/vapi-results'; 

        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
        
        // Email match check karne
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ message: "Email already exists" });
        }
        
        
        const newUser = { 
            name, 
            email, 
            password, 
            role  
        };

        
        users.push(newUser);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

       
        res.status(200).json({ message: "Registration successful!" });

    } catch (err) { 
        console.error("Registration Error:", err);
        res.status(500).json({ message: "Registration Error on server side" }); 
    }
});

// 2. LOGIN ROUTE (SMART ROLE BASED APPROVAL)
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    const usersList = getUsers(); 
    const user = usersList.find(u => u.email === email && u.password === password);
    
    if (user) {
        let dashboard = "";

       
        if (user.role === "recruiter") {
            if (user.isApproved === true || user.isApproved === "true") {
                dashboard = "recruiter-dashboard.html";
            } else {
                
                dashboard = "jobseeker-dashboard.html";
                user.role = "jobseeker"; 
            }
        } else {
          
            dashboard = "jobseeker-dashboard.html";
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


app.get('/interview', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'interview.html'));
});


app.get('/jobseeker-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'jobseeker-dashboard.html'));
});

const N8N_SERVER_BASE = "https://3dzqxw2k-5678.inc1.devtunnels.ms"; 
const FormData = require('form-data'); // हे एक्सप्रेसमध्ये इन-बिल्ट असतं किंवा इंस्टॉल करावं लागतं

// 📑 १. Job Application Live Proxy (With File Support)
app.post('/proxy/job-application', upload.single('data'), async (req, res) => {
    try {
        const n8nFormData = new FormData();
        
       
        for (const key in req.body) {
            n8nFormData.append(key, req.body[key]);
        }
        
       
        if (req.file) {
            n8nFormData.append('data', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype,
            });
        }

        const response = await fetch(`${N8N_SERVER_BASE}/webhook/Job%20Application`, {
            method: 'POST',
            body: n8nFormData, // फॉर्म डेटा फॉरवर्ड केला
            headers: n8nFormData.getHeaders() // योग्य हेडर ऑटोमॅटिक सेट होतील
        });

        res.status(response.status).send(await response.text());
    } catch (e) {
        console.error("Application Proxy Error:", e);
        res.status(500).send("Proxy Error");
    }
});

// 🧪 २. Job Application Test Proxy (With File Support)
app.post('/proxy/job-application-test', upload.single('data'), async (req, res) => {
    try {
        const n8nFormData = new FormData();
        for (const key in req.body) { n8nFormData.append(key, req.body[key]); }
        if (req.file) {
            n8nFormData.append('data', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype,
            });
        }

        const response = await fetch(`${N8N_SERVER_BASE}/webhook-test/Job%20Application`, {
            method: 'POST', body: n8nFormData, headers: n8nFormData.getHeaders()
        });
        res.status(response.status).send(await response.text());
    } catch (e) { res.status(500).send("Proxy Error"); }
});

// 💬 ३. Jobseeker Chat Proxy (Regular JSON)
app.post('/proxy/jobseeker-chat', async (req, res) => {
    try {
        const response = await fetch(`${N8N_SERVER_BASE}/webhook/jobseeker-chat`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        res.status(response.status).send(await response.text());
    } catch (e) { res.status(500).send("Proxy Error"); }
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
