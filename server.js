const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { franc } = require('franc');
const langs = require('langs');
const path = require('path');


const app = express();
const PORT = 5500;

// Middleware
app.use(cors());                   // ✅ Allow cross-origin requests
app.use(express.json());           // ✅ Parse JSON request bodies


app.use(express.static(path.join(__dirname, 'public')));


// ===== LANGUAGE DETECTION ROUTE =====
app.post('/detect', async (req, res) => {
    try {
        const { text } = req.body;
     console.log("Received text:", text); // ✅ Debug log

        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Please provide valid text for detection'
            });
        }

        const trimmedText = text.trim();
        if (trimmedText.length < 3) {
            return res.status(400).json({
                error: 'Text too short',
                message: 'Please provide at least 3 characters for accurate detection'
            });
        }

        const options = {
            minLength: 3,
            only: ['eng', 'spa', 'fra', 'deu', 'ita', 'por', 'rus', 'jpn', 'kor', 'ara', 'hin']
        };

        const langCode = franc(trimmedText, options);
     
        if (langCode === 'und') {
            return res.status(400).json({
                error: 'Detection failed',
                message: 'Unable to determine language. Try with more text.'
            });
        }

        const languageInfo = langs.where("3", langCode);
        if (!languageInfo) {
            return res.status(400).json({
                error: 'Language not supported',
                message: `Detected language code ${langCode} is not supported`
            });
        }

        // Simple confidence calculation based on text length
        const confidence = Math.min(0.95, 0.5 + (trimmedText.length * 0.01));

        res.json({
            success: true,
            language: languageInfo.name,
            code: langCode,
            confidence: confidence
        });

    } catch (error) {
        console.error('Detection error:', error);
        
        res.status(500).json({
            error: 'Server error',
            message: 'An unexpected error occurred during detection'
        });
    }
});



// ===== START SERVER =====

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
