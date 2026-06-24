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

## Usage

1. **Dashboard**: View statistics, charts, and recent articles
2. **Bias Filtering**: Click "Left-leaning", "Center", or "All Sources" to filter content
3. **Manual Analysis**: Go to `/manual.html` to analyze any article you paste
4. **Weekly Updates**: Articles are automatically scraped every Sunday at 2 AM

## License

MIT License - see LICENSE file for details
