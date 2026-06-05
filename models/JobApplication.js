// models/JobApplication.js
const mongoose = require('mongoose');

const JobApplicationSchema = new mongoose.Schema({
    candidateId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    jobId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Job',  
        required: true 
    },
    appliedAt: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' } 
});

module.exports = mongoose.model('JobApplication', JobApplicationSchema);