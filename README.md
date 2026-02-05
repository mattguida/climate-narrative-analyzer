# 🌍 Climate Narrative Analyzer

AI-powered analysis of climate news through narrative frameworks, featuring automated weekly scraping, Claude API analysis, and interactive dashboard.

## Features

### 🤖 Automated Analysis
- Weekly scraping of climate news from major sources (The Guardian, BBC, Reuters, Climate & Capitalism)
- Analysis using Claude API (Anthropic)
- Automatic storage in MongoDB
- Scheduled via cron jobs

### 📊 Dashboard
- Real-time statistics and visualizations
- Weekly trend analysis
- Distribution charts for heroes, villains, victims, conflict types, and cultural stories
- Sample article display

### ✍️ Manual Analysis
- Paste any article for instant analysis
- Uses Ollama (free, local LLM)
- Results displayed immediately (not saved)

## Narrative Frameworks

### 1. Narrative Characters
- **Hero**: Who's solving the problem?
- **Villain**: Who's causing the problem?
- **Victim**: Who's suffering?

Categories: Governments, Industry, Activists, Scientists, General Public, Nature, etc.

### 2. Conflict Type
- **Fuel Resolution**: Proposes climate solutions
- **Fuel Conflict**: Worsens the crisis
- **Prevent Resolution**: Blocks solutions
- **Prevent Conflict**: Opposes harmful actions

### 3. Cultural Story
- **Hierarchical**: Nature controlled by institutions/experts
- **Individualistic**: Nature resilient; market solutions
- **Egalitarian**: Nature fragile; needs collective action

## Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Ollama (for manual analysis)
- Anthropic API key

### Setup

1. **Clone and Install Dependencies**
```bash
npm install
```

2. **Set Up MongoDB**

Local MongoDB:
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt install mongodb

# Start MongoDB
sudo systemctl start mongodb
```

Or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (cloud, free tier available)

3. **Install Ollama** (for manual analysis)
```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model
ollama pull gemma:2b
```

4. **Configure Environment Variables**
```bash
cp .env.example .env
```

Edit `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/climate-analyzer
ANTHROPIC_API_KEY=your_api_key_here
OLLAMA_MODEL=gemma:2b
PORT=3000
```

Get your Anthropic API key: https://console.anthropic.com/

5. **Run the Application**
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

6. **Access the Application**
- Dashboard: http://localhost:3000
- Manual Analysis: http://localhost:3000/manual.html

## Deployment

### Option 1: Render (Recommended)

1. **Prepare for Deployment**
   - Push code to GitHub
   - Set up MongoDB Atlas (free tier)

2. **Deploy on Render**
   - Go to [Render Dashboard](https://render.com)
   - New → Web Service
   - Connect GitHub repository
   - Configure:
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment Variables**:
       ```
       MONGODB_URI=mongodb+srv://...
       ANTHROPIC_API_KEY=sk-ant-...
       OLLAMA_MODEL=gemma:2b
       ```

3. **Cron Job Notes**
   - Free tier: Cron runs within web service (less reliable)
   - Paid tier ($7/month): Dedicated background worker (recommended)
   - Alternative: Use external cron service (EasyCron, cron-job.org)

### Option 2: Railway

1. **Deploy to Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

2. **Add Environment Variables** in Railway dashboard

3. **MongoDB**: Use Railway's MongoDB plugin or MongoDB Atlas

### Option 3: Fly.io

1. **Install Fly CLI**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Deploy**
```bash
fly launch
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly secrets set MONGODB_URI=mongodb+srv://...
```

### Ollama for Manual Analysis

**Note**: Ollama requires a server with GPU/CPU resources. For deployment:

**Options**:
1. **Keep Ollama local**: Users access via public URL but manual analysis works only if you keep local Ollama running
2. **Deploy Ollama separately**: Use a VPS with Docker
3. **Remove manual analysis feature**: Only use automated analysis with Claude API

## Scheduled Analysis

The app runs weekly analysis every Sunday at 2 AM.

**For testing**, modify `server.js`:
```javascript
// Change this line:
cron.schedule('0 2 * * 0', () => {  // Every Sunday 2 AM

// To this for testing (every 5 minutes):
cron.schedule('*/5 * * * *', () => {
```

**Manual trigger** (for testing):
```bash
curl -X POST http://localhost:3000/api/trigger-analysis
```

## API Endpoints

### GET /api/articles
Get recent analyzed articles
```bash
GET /api/articles?limit=10
```

### GET /api/statistics
Get aggregate statistics
```bash
GET /api/statistics
GET /api/statistics?year=2024
GET /api/statistics?weeks=1,2,3
```

### GET /api/trends
Get weekly trends
```bash
GET /api/trends?weeks=12
```

### POST /api/analyze-manual
Analyze user-pasted article (uses Ollama)
```bash
POST /api/analyze-manual
Content-Type: application/json

{
  "title": "Article title",
  "source": "Source name",
  "excerpt": "Full article text..."
}
```

### POST /api/trigger-analysis
Manually trigger weekly analysis
```bash
POST /api/trigger-analysis
```

## Project Structure

```
climate-analyzer/
├── models/
│   └── ArticleAnalysis.js    # MongoDB schema
├── public/
│   ├── index.html             # Dashboard
│   └── manual.html            # Manual analysis page
├── server.js                  # Main server
├── package.json
├── .env                       # Environment variables (create from .env.example)
└── README.md
```

## Technologies

- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **AI**: Anthropic Claude API, Ollama
- **Scheduling**: node-cron
- **Scraping**: rss-parser
- **Charts**: Chart.js

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
sudo systemctl status mongodb

# Check connection string
echo $MONGODB_URI
```

### Ollama Not Working
```bash
# Check if Ollama is running
ollama list

# Restart Ollama
ollama serve
```

### Claude API Issues
- Verify API key is correct
- Check rate limits on Anthropic dashboard
- Ensure you have credits

### Cron Job Not Running
- Check server logs
- Verify cron syntax
- Use manual trigger for testing: `POST /api/trigger-analysis`

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a PR.

## Credits

Built with Claude (Anthropic) 🤖
