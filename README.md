# 🌍 Climate Narrative Analyzer

AI-powered analysis of climate change news narratives with automated weekly scraping from RSS feeds.

## Features

- **Automated Weekly Scraping**: Collects articles from 4 major climate news sources
- **AI-Powered Analysis**: Uses Claude AI to analyze narratives, heroes, villains, and cultural stories
- **Interactive Dashboard**: Beautiful charts and statistics with bias filtering
- **Political Bias Filtering**: Filter by Left, Center, or All sources (AllSides Media Bias ratings)
- **Manual Analysis**: Paste any article for instant AI analysis
- **Real-time Statistics**: Weekly trends and narrative distributions

## News Sources

| Source | Political Bias | RSS Feed |
|--------|----------------|----------|
| The Guardian | Left | Climate Crisis section |
| BBC News | Center | Science & Environment |
| Reuters | Center | Environment |
| Climate & Capitalism | Left | Main feed |

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **AI**: Anthropic Claude API
- **Frontend**: Vanilla JavaScript, Chart.js
- **Deployment**: Render

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`:
   ```env
   MONGODB_URI=your_mongodb_atlas_connection_string
   ANTHROPIC_API_KEY=your_anthropic_api_key
   PORT=3000
   OLLAMA_MODEL=gemma:2b
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000

## Deployment to Render

### Option 1: Using Render Dashboard (Recommended)

1. **Create a Render Account**: Go to [render.com](https://render.com) and sign up
2. **Connect GitHub**: Link your GitHub account
3. **Create New Web Service**:
   - Choose "Web Service" from the dashboard
   - Connect your GitHub repository
   - Configure build settings:
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
4. **Environment Variables**: Add these in Render dashboard:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render will set this automatically)
5. **Deploy**: Click "Create Web Service"

### Option 2: Using render.yaml

If you prefer using the render.yaml file:

1. Push your code to GitHub
2. In Render dashboard, choose "Blueprint" instead of "Web Service"
3. Connect your repo and Render will use the render.yaml configuration

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB Atlas connection string | Yes |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | Yes |
| `PORT` | Server port (auto-set by Render) | No |
| `OLLAMA_MODEL` | Local AI model for manual analysis | No |

## API Endpoints

- `GET /` - Main dashboard
- `GET /manual.html` - Manual analysis page
- `GET /api/articles` - Recent analyzed articles (supports `?bias=left|center|all`)
- `GET /api/statistics` - Statistics and charts (supports `?bias=...`)
- `GET /api/trends` - Weekly trends (supports `?bias=...`)
- `POST /api/analyze-manual` - Manual article analysis
- `POST /api/trigger-analysis` - Trigger weekly scraping
- `GET /api/health` - Health check

## Usage

1. **Dashboard**: View statistics, charts, and recent articles
2. **Bias Filtering**: Click "Left-leaning", "Center", or "All Sources" to filter content
3. **Manual Analysis**: Go to `/manual.html` to analyze any article you paste
4. **Weekly Updates**: Articles are automatically scraped every Sunday at 2 AM

## License

MIT License - see LICENSE file for details