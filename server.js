const express = require('express');
const cors = require('cors');
const { franc } = require('franc');  // This is the correct import
const langs = require('langs');

const app = express();
const PORT = 5500;

// Middleware
app.use(cors());
app.use(express.json());

// Improved language detection endpoint
app.post('/detect', (req, res) => {
    try {
        const { text } = req.body;
        
        // Validate input
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

        // Detect language with options for better accuracy
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

        // Get language name with fallback
        const languageInfo = langs.where("3", langCode);
        if (!languageInfo) {
            return res.status(400).json({ 
                error: 'Language not supported',
                message: `Detected language code ${langCode} is not supported`
            });
        }

        // Calculate confidence score (simplified)
        const confidence = calculateConfidence(trimmedText, langCode);
        
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

// Helper function to calculate confidence score
function calculateConfidence(text, langCode) {
    // Simple confidence calculation - in a real app you might use more sophisticated logic
    const lengthFactor = Math.min(1, text.length / 20); // More text = higher confidence
    const baseConfidence = 0.7 + (0.3 * lengthFactor);
    
    // Add some randomness to simulate real detection variance
    return Math.min(0.99, baseConfidence + (Math.random() * 0.1 - 0.05));
}

// Serve static files
app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});