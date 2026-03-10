# 📖 Scholarly

An AI-powered learning app that builds personalized roadmaps for any subject, teaches each concept from scratch, and uses spaced repetition to make sure you never forget it.

## Setup

1. Get a free API key at [console.groq.com](https://console.groq.com)
2. In `main.js`, find line ~952 and replace the empty string with your key:
   ```js
   const GROQ_API_KEY = process.env.GROQ_API_KEY || "your_key_here";
   ```
   Or set `GROQ_API_KEY` as an environment variable if using a build tool.
3. Open `index.html` in a browser (or serve with any static file server)

## Stack

- Vanilla React (via CDN) + KaTeX for math rendering  
- [Groq](https://groq.com) + Llama 3.3-70b for AI  
- [Puter.js](https://puter.com) for cloud key-value storage  
- No build step required
