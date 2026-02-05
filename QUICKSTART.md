# 🚀 Quick Start Guide

## Fastest Way to Get Started (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up MongoDB
**Option A - MongoDB Atlas (Easiest, Cloud-based, Free)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster (free tier)
4. Get connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/climate-analyzer`)

**Option B - Local MongoDB**
```bash
# Ubuntu/Debian
sudo apt install mongodb
sudo systemctl start mongodb
# Connection string: mongodb://localhost:27017/climate-analyzer
```

### 3. Get Anthropic API Key
1. Go to https://console.anthropic.com/
2. Sign up / Log in
3. Get API key from Settings
4. You'll need credits ($5+ recommended)

### 4. Install Ollama (for manual analysis feature)
```bash
# Linux/Mac
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model
ollama pull gemma:2b

# Start Ollama (in separate terminal)
ollama serve
```

### 5. Configure Environment
```bash
# Create .env file
cp .env.example .env

# Edit .env with your values:
# - MONGODB_URI (from step 2)
# - ANTHROPIC_API_KEY (from step 3)
```

### 6. Run!
```bash
npm start
```

### 7. Open Browser
- Dashboard: http://localhost:3000
- Manual Analysis: http://localhost:3000/manual.html

## First Time Usage

### Trigger Initial Analysis
Since the cron job runs weekly (Sundays at 2 AM), you'll want to manually trigger it the first time:

```bash
# Using curl
curl -X POST http://localhost:3000/api/trigger-analysis

# Or visit the API endpoint in browser:
# http://localhost:3000/api/trigger-analysis
```

This will scrape recent articles and analyze them. Wait ~5 minutes, then refresh the dashboard to see results.

### Test Manual Analysis
1. Go to http://localhost:3000/manual.html
2. Copy any climate news article
3. Paste title and full text
4. Click "Analyze Article"
5. Wait 30-60 seconds for results

## Common Issues

### "Cannot connect to MongoDB"
- Check MONGODB_URI in .env
- For local: ensure `sudo systemctl status mongodb` shows "active"
- For Atlas: check connection string includes password

### "Ollama connection failed"
- Run `ollama serve` in separate terminal
- Verify with: `ollama list`

### "Claude API error"
- Verify ANTHROPIC_API_KEY in .env
- Check you have credits at https://console.anthropic.com/

### "No articles showing"
- Run manual trigger: `curl -X POST http://localhost:3000/api/trigger-analysis`
- Check logs for errors
- Verify RSS feeds are accessible

## Next Steps

1. **Deploy to production** (see README.md for Render/Railway/Fly.io instructions)
2. **Customize scraping schedule** in server.js
3. **Add more RSS feeds** to NEWS_FEEDS array
4. **Customize analysis prompts** in PROMPTS object

## Need Help?

Check the full README.md for detailed documentation!
