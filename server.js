const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { franc } = require('franc');
const langs = require('langs');
const path = require('path');

// Simple translation function with basic mappings and fallback
async function translateText(text, targetLang, sourceLang = 'auto') {
    try {
        // Simple translation mappings for common phrases (demo purposes)
        const translations = {
            'en': {
                'es': {
                    'Hello': 'Hola',
                    'world': 'mundo',
                    'Hello world': 'Hola mundo',
                    'How are you': '¿Cómo estás?',
                    'Thank you': 'Gracias',
                    'Goodbye': 'Adiós'
                },
                'fr': {
                    'Hello': 'Bonjour',
                    'world': 'monde',
                    'Hello world': 'Bonjour le monde',
                    'How are you': 'Comment ça va?',
                    'Thank you': 'Merci',
                    'Goodbye': 'Au revoir'
                },
                'de': {
                    'Hello': 'Hallo',
                    'world': 'Welt',
                    'Hello world': 'Hallo Welt',
                    'How are you': 'Wie geht es dir?',
                    'Thank you': 'Danke',
                    'Goodbye': 'Auf Wiedersehen'
                },
                'ur': {
                    'Hello': 'ہیلو',
                    'world': 'دنیا',
                    'Hello world': 'ہیلو دنیا',
                    'How are you': 'آپ کیسے ہیں؟',
                    'Thank you': 'شکریہ',
                    'Goodbye': 'خدا حافظ'
                }
            }
        };

        // Check if we have a direct translation
        const sourceTranslations = translations[sourceLang] || translations['en'];
        const targetTranslations = sourceTranslations ? sourceTranslations[targetLang] : null;

        if (targetTranslations && targetTranslations[text]) {
            return targetTranslations[text];
        }

        // Try to translate word by word for simple cases
        const words = text.split(' ');
        const translatedWords = words.map(word => {
            const lowerWord = word.toLowerCase();
            if (targetTranslations && targetTranslations[word]) {
                return targetTranslations[word];
            }
            // Return original word if no translation found
            return word;
        });

        const result = translatedWords.join(' ');

        // If no translation was found, try using Google Translate API directly
        if (result === text) {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

            const response = await axios.get(url, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.data && response.data[0]) {
                const translatedText = response.data[0]
                    .filter(item => item[0])
                    .map(item => item[0])
                    .join('');
                return translatedText || text;
            }
        }

        return result || text;

    } catch (error) {
        console.error('Translation function error:', error.message);
        // Return original text if translation fails
        return text;
    }
}


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



// ===== TRANSLATION ROUTE =====
app.post('/translate', async (req, res) => {
    try {
        const { text, from, to } = req.body;
        console.log("Translation request:", { text: text.substring(0, 50) + "...", from, to });

        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Please provide valid text for translation'
            });
        }

        const trimmedText = text.trim();
        if (trimmedText.length < 1) {
            return res.status(400).json({
                error: 'Empty text',
                message: 'Please provide text to translate'
            });
        }

        if (!to || typeof to !== 'string') {
            return res.status(400).json({
                error: 'Invalid target language',
                message: 'Please specify target language'
            });
        }

        // Try multiple translation methods
        let translatedText;
        try {
            console.log('Attempting translation with custom function...');
            translatedText = await translateText(trimmedText, to, from);
            console.log('Translation successful:', translatedText);
        } catch (error) {
            console.log('Custom translation failed, trying translate package...', error.message);
            try {
                // Fallback to translate package
                const translate = require('translate');
                translate.engine = 'google';
                translatedText = await translate(trimmedText, {
                    from: from || 'auto',
                    to: to
                });
                console.log('Translate package successful:', translatedText);
            } catch (fallbackError) {
                console.log('All translation methods failed:', fallbackError.message);
                // If everything fails, return a mock translation
                translatedText = `[Translation Service Unavailable] ${trimmedText}`;
            }
        }

        res.json({
            success: true,
            originalText: trimmedText,
            translatedText: translatedText,
            from: from || 'auto',
            to: to
        });

    } catch (error) {
        console.error('Translation error:', error);

        res.status(500).json({
            error: 'Translation failed',
            message: 'An error occurred during translation. Please try again.'
        });
    }
});



// ===== CONTACT FORM ROUTE =====
app.post('/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Please provide name, email, and message'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
        }

        // Prepare contact data
        const contactData = {
            timestamp: new Date().toISOString(),
            name: name.trim(),
            email: email.trim(),
            phone: phone ? phone.trim() : 'Not provided',
            message: message.trim()
        };

        // Save to index.txt file
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, 'public', 'index.txt');

        const entry = `--- Contact Entry ---\nTimestamp: ${contactData.timestamp}\nName: ${contactData.name}\nEmail: ${contactData.email}\nPhone: ${contactData.phone}\nMessage: ${contactData.message}\n\n`;

        // Append to file (create if doesn't exist)
        fs.appendFileSync(filePath, entry, 'utf8');

        console.log('Contact form submitted and saved:', contactData.name);

        res.json({
            success: true,
            message: 'Thank you for your message! We will get back to you soon.'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to process your request. Please try again later.'
        });
    }
});



// ===== START SERVER =====

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
