require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Anthropic = require('@anthropic-ai/sdk');
const ollama = require('ollama').default;
const Parser = require('rss-parser');
const cron = require('node-cron');
const ArticleAnalysis = require('./models/ArticleAnalysis');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/climate-analyzer';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma:2b';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// RSS parser
const parser = new Parser();

// Climate news RSS feeds — CC-licensed sources only
// Al Jazeera: CC BY | The Conversation: CC BY-ND 4.0 | Democracy Now!: CC BY-NC-ND 3.0 | Global Voices: CC BY 3.0
const NEWS_FEEDS = [
  {
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    bias: 'Center',
    name: 'Al Jazeera',
    license: 'CC BY'
  },
  {
    url: 'https://theconversation.com/us/environment/articles.atom',
    bias: 'Center',
    name: 'The Conversation',
    license: 'CC BY-ND 4.0'
  },
  {
    url: 'https://www.democracynow.org/democracynow.rss',
    bias: 'Left',
    name: 'Democracy Now!',
    license: 'CC BY-NC-ND 3.0'
  },
  {
    url: 'https://globalvoices.org/-/topics/environment/feed/',
    bias: 'Center',
    name: 'Global Voices',
    license: 'CC BY 3.0'
  }
];

// System prompts
const PROMPTS = {
  characters: `You are a social scientist specializing in climate change. You will be given a newspaper article and asked who is framed as a hero, villain or a victim in it. For each of these categories, you will be asked to classify it into the following classes:

GOVERNMENTS_POLITICIANS_POLIT.ORGS: governments, politicians, and political organizations;
INDUSTRY_EMISSIONS: industries, businesses, and the pollution created by them;
LEGISLATION_POLICIES_RESPONSES: policies and legislation responses;
GENERAL_PUBLIC: general public, individuals, and society, including their wellbeing, status quo and economy;
ANIMALS_NATURE_ENVIRONMENT: nature and environment in general or specific species;
ENV.ORGS_ACTIVISTS: climate activists and organizations
SCIENCE_EXPERTS_SCI.REPORTS: scientists and scientific reports/research
CLIMATE_CHANGE: climate change as a process or consequence
GREEN_TECHNOLOGY_INNOVATION: innovative and green technologies
MEDIA_JOURNALISTS: media and journalists

Finally, you need to detect which of the characters (hero, villain, or victim) the news story is focusing on.

Please return a json object which consists of the following fields:
hero_class: a label for the main hero from the list above, or 'NONE' if the main hero cannot be identified.
villain_class: a label for the main villain from the list above, or 'NONE' if the main villain cannot be identified.
victim_class: a label for the main victim from the list above, or 'NONE' if the main victim cannot be identified.
focus: one of the following - HERO, VILLAIN, VICTIM

Do not include anything apart from these fields.`,

  action: `You are a social scientist specializing in climate change. You will be given a newspaper article and asked to identify how it relates to climate crisis. Assign one of the following classes:

FUEL_RESOLUTION: the article proposes or describes specific measures, policies, or events that would contribute to the resolution of the climate crisis.
FUEL_CONFLICT: the article proposes or describes specific measures, policies, or events that would exacerbate the climate crisis.
PREVENT_RESOLUTION: the article criticises measures, policies, or events that contribute to the resolution of the climate crisis; or it denies the climate crisis.
PREVENT_CONFLICT: the article criticises measures, policies, or events that exacerbate the climate crisis; or it provides the evidence for the climate crisis.

Please return a json object which consists of the following field:
action: one of the following labels: FUEL_RESOLUTION, FUEL_CONFLICT, PREVENT_RESOLUTION, PREVENT_CONFLICT.

Do not include anything apart from these fields.`,

  story: `You are a social scientist specializing in climate change. You will be given a newspaper article and asked what is the cultural story reflected in it. You should choose one of the following classes:

HIERARCHICAL: this story assumes that the nature can be controlled but we need to be bound by tight social prescriptions. The cause of climate change is mismanaged society which led to excessive growth, and heroes are impartial scientists or government intervention.

INDIVIDUALISTIC: this story assumes that the nature is resilient and will return to equilibrium. Villains here are people who try to control climate change or seek policy changes, and the heros allow markets to move naturally as individuals compete to create innovative technologies

EGALITARIAN: this story assumes that the nature is fragile and there is little opportunity to correct mistakes. The cause of climate change is overconsumption; villains are profit-driven corporations and anyone who supports status quo, and heros are groups who seek fundamental changes

Please return a json object which consists of the following field:
story: a label from the classes above.`
};

// ==================== HELPER FUNCTIONS ====================

// Calculate ISO week number from date
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  // Get first day of year
  const yearStart = new Date(d.getFullYear(), 0, 1);
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

// ==================== SCRAPING & ANALYSIS ====================

// Keywords for filtering articles to climate/environment topics
const CLIMATE_KEYWORDS = [
  'climate', 'environment', 'emission', 'carbon', 'fossil fuel', 'renewable',
  'greenhouse', 'global warming', 'net zero', 'biodiversity', 'deforestation',
  'pollution', 'sustainability', 'energy transition', 'sea level', 'wildfire',
  'drought', 'flood', 'extreme weather', 'paris agreement', 'cop', 'methane',
  'solar', 'wind power', 'electric vehicle', 'oil', 'gas', 'coal', 'arctic',
  'glacier', 'ecosystem', 'species', 'extinction'
];

function isClimateRelated(title, excerpt) {
  const text = `${title} ${excerpt}`.toLowerCase();
  return CLIMATE_KEYWORDS.some(kw => text.includes(kw));
}

// Fetch articles from RSS feeds
async function fetchArticles() {
  const articles = [];

  for (const feed of NEWS_FEEDS) {
    try {
      const feedData = await parser.parseURL(feed.url);
      const recentArticles = feedData.items
        .map(item => ({
          title: item.title,
          source: feed.name,
          date: item.pubDate || item.isoDate,
          excerpt: item.contentSnippet || item.content?.substring(0, 500) || '',
          link: item.link,
          bias: feed.bias
        }))
        .filter(item => isClimateRelated(item.title, item.excerpt))
        .slice(0, 5);
      articles.push(...recentArticles);
    } catch (error) {
      console.error(`Error fetching feed ${feed.url}:`, error.message);
    }
  }

  return articles;
}

// Analyze article with Claude API
async function analyzeWithClaude(systemPrompt, articleText) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Article:\n${articleText}`
      }]
    });
    
    const responseText = message.content[0].text;
    return parseJSON(responseText);
  } catch (error) {
    console.error('Claude API error:', error);
    return { error: error.message };
  }
}

// Analyze article with Ollama (for manual paste mode)
async function analyzeWithOllama(systemPrompt, articleText) {
  try {
    const response = await ollama.generate({
      model: OLLAMA_MODEL,
      system: systemPrompt,
      prompt: `Article:\n${articleText}`,
      format: 'json',
      stream: false
    });
    
    return parseJSON(response.response);
  } catch (error) {
    console.error('Ollama error:', error);
    return { error: error.message };
  }
}

// Parse JSON from LLM response
function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to find any JSON object
    const objectMatch = text.match(/\{[^]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    
    throw new Error('Could not parse JSON from response');
  }
}

// Weekly scraping and analysis job
async function runWeeklyAnalysis() {
  console.log('🔄 Starting weekly analysis...');
  
  try {
    const articles = await fetchArticles();
    console.log(`📰 Fetched ${articles.length} articles`);
    
    let analyzed = 0;
    let errors = 0;
    
    for (const article of articles) {
      try {
        // Check if article already exists (by title and source)
        const existing = await ArticleAnalysis.findOne({
          title: article.title,
          source: article.source
        });
        
        if (existing) {
          console.log(`⏭️  Skipping duplicate: ${article.title.substring(0, 50)}...`);
          continue;
        }
        
        const articleText = `Title: ${article.title}\nSource: ${article.source}\nDate: ${article.date}\n\n${article.excerpt}`;
        
        // Run all three analyses in parallel
        const [charactersResult, actionResult, storyResult] = await Promise.all([
          analyzeWithClaude(PROMPTS.characters, articleText),
          analyzeWithClaude(PROMPTS.action, articleText),
          analyzeWithClaude(PROMPTS.story, articleText)
        ]);
        
        // Parse the article date
        const articleDate = new Date(article.date);
        
        // Save to database with year and week_number
        const analysis = new ArticleAnalysis({
          title: article.title,
          source: article.source,
          date: articleDate,
          excerpt: article.excerpt,
          link: article.link,
          characters: charactersResult,
          action: actionResult,
          story: storyResult,
          analysis_type: 'automated',
          year: articleDate.getFullYear(),
          week_number: getWeekNumber(articleDate)
        });
        
        await analysis.save();
        analyzed++;
        console.log(`✅ Analyzed: ${article.title.substring(0, 50)}...`);
        
        // Rate limiting - wait 1 second between articles
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error analyzing article: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`✅ Weekly analysis complete: ${analyzed} analyzed, ${errors} errors`);
  } catch (error) {
    console.error('❌ Weekly analysis failed:', error);
  }
}

// Schedule weekly scraping (every Sunday at 2 AM)
// For testing, you can change to: '*/5 * * * *' (every 5 minutes)
cron.schedule('0 2 * * 0', () => {
  console.log('⏰ Triggered weekly analysis cron job');
  runWeeklyAnalysis();
});

// ==================== API ENDPOINTS ====================

// Get recent analyzed articles for display
app.get('/api/articles', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const bias = req.query.bias; // Filter by political bias

    // Build query
    let query = {};
    if (bias && bias !== 'all') {
      // Find sources with the specified bias
      const sourcesWithBias = NEWS_FEEDS
        .filter(feed => feed.bias.toLowerCase() === bias.toLowerCase())
        .map(feed => feed.name);
      query.source = { $in: sourcesWithBias };
    }

    const articles = await ArticleAnalysis
      .find(query)
      .sort({ date: -1 })
      .limit(limit);

    res.json({ articles });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Manual analysis endpoint (user pastes article)
app.post('/api/analyze-manual', async (req, res) => {
  try {
    const { title, source, excerpt } = req.body;
    
    if (!title || !excerpt) {
      return res.status(400).json({ error: 'Title and excerpt are required' });
    }
    
    const articleText = `Title: ${title}\nSource: ${source || 'Unknown'}\n\n${excerpt}`;
    
    console.log('Analyzing manual article:', title);
    
    // Use Claude API for manual analysis (higher quality)
    const [charactersResult, actionResult, storyResult] = await Promise.all([
      analyzeWithClaude(PROMPTS.characters, articleText),
      analyzeWithClaude(PROMPTS.action, articleText),
      analyzeWithClaude(PROMPTS.story, articleText)
    ]);
    
    const analysis = {
      title,
      source: source || 'User Provided',
      characters: charactersResult,
      action: actionResult,
      story: storyResult,
      analyzed_at: new Date().toISOString()
    };
    
    res.json(analysis);
  } catch (error) {
    console.error('Error in manual analysis:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

// Statistics endpoint
app.get('/api/statistics', async (req, res) => {
  try {
    const { weeks, year, bias } = req.query;

    // Build query
    let query = {};
    if (year) {
      query.year = parseInt(year);
    }
    if (weeks) {
      const weeksArray = weeks.split(',').map(w => parseInt(w));
      query.week_number = { $in: weeksArray };
    }
    if (bias && bias !== 'all') {
      // Find sources with the specified bias
      const sourcesWithBias = NEWS_FEEDS
        .filter(feed => feed.bias.toLowerCase() === bias.toLowerCase())
        .map(feed => feed.name);
      query.source = { $in: sourcesWithBias };
    }

    // Get all articles matching query
    const articles = await ArticleAnalysis.find(query);
    
    // Calculate statistics
    const stats = {
      total_articles: articles.length,
      by_source: {},
      by_week: {},
      characters: {
        heroes: {},
        villains: {},
        victims: {},
        focus: {}
      },
      actions: {},
      stories: {}
    };
    
    articles.forEach(article => {
      // By source
      stats.by_source[article.source] = (stats.by_source[article.source] || 0) + 1;
      
      // By week
      const weekKey = `${article.year}-W${String(article.week_number).padStart(2, '0')}`;
      stats.by_week[weekKey] = (stats.by_week[weekKey] || 0) + 1;
      
      // Characters
      if (article.characters) {
        if (article.characters.hero_class !== 'NONE') {
          stats.characters.heroes[article.characters.hero_class] = 
            (stats.characters.heroes[article.characters.hero_class] || 0) + 1;
        }
        if (article.characters.villain_class !== 'NONE') {
          stats.characters.villains[article.characters.villain_class] = 
            (stats.characters.villains[article.characters.villain_class] || 0) + 1;
        }
        if (article.characters.victim_class !== 'NONE') {
          stats.characters.victims[article.characters.victim_class] = 
            (stats.characters.victims[article.characters.victim_class] || 0) + 1;
        }
        if (article.characters.focus) {
          stats.characters.focus[article.characters.focus] = 
            (stats.characters.focus[article.characters.focus] || 0) + 1;
        }
      }
      
      // Actions
      if (article.action && article.action.action) {
        stats.actions[article.action.action] = 
          (stats.actions[article.action.action] || 0) + 1;
      }
      
      // Stories
      if (article.story && article.story.story) {
        stats.stories[article.story.story] = 
          (stats.stories[article.story.story] || 0) + 1;
      }
    });
    
    res.json(stats);
  } catch (error) {
    console.error('Error calculating statistics:', error);
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
});

// Get weekly trends over time
app.get('/api/trends', async (req, res) => {
  try {
    const limit = parseInt(req.query.weeks) || 12; // Last 12 weeks by default
    const bias = req.query.bias; // Filter by political bias

    // Build query
    let query = {};
    if (bias && bias !== 'all') {
      // Find sources with the specified bias
      const sourcesWithBias = NEWS_FEEDS
        .filter(feed => feed.bias.toLowerCase() === bias.toLowerCase())
        .map(feed => feed.name);
      query.source = { $in: sourcesWithBias };
    }

    // Get all matching articles sorted newest first
    const articles = await ArticleAnalysis.find(query)
      .sort({ year: -1, week_number: -1 });
    
    // Group by week
    const weeklyData = {};
    
    articles.forEach(article => {
      const weekKey = `${article.year}-W${String(article.week_number).padStart(2, '0')}`;
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: weekKey,
          year: article.year,
          week_number: article.week_number,
          count: 0,
          heroes: {},
          villains: {},
          victims: {},
          actions: {},
          stories: {}
        };
      }
      
      const week = weeklyData[weekKey];
      week.count++;
      
      if (article.characters) {
        if (article.characters.hero_class !== 'NONE') {
          week.heroes[article.characters.hero_class] = (week.heroes[article.characters.hero_class] || 0) + 1;
        }
        if (article.characters.villain_class !== 'NONE') {
          week.villains[article.characters.villain_class] = (week.villains[article.characters.villain_class] || 0) + 1;
        }
        if (article.characters.victim_class !== 'NONE') {
          week.victims[article.characters.victim_class] = (week.victims[article.characters.victim_class] || 0) + 1;
        }
      }
      
      if (article.action && article.action.action) {
        week.actions[article.action.action] = (week.actions[article.action.action] || 0) + 1;
      }
      
      if (article.story && article.story.story) {
        week.stories[article.story.story] = (week.stories[article.story.story] || 0) + 1;
      }
    });
    
    // Convert to array and sort
    const trends = Object.values(weeklyData)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.week_number - a.week_number;
      })
      .slice(0, limit);
    
    res.json({ trends });
  } catch (error) {
    console.error('Error calculating trends:', error);
    res.status(500).json({ error: 'Failed to calculate trends' });
  }
});

// Manual trigger for weekly analysis (for testing)
app.post('/api/trigger-analysis', async (req, res) => {
  res.json({ message: 'Analysis triggered' });
  runWeeklyAnalysis();
});

// Health check
app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok',
    database: dbStatus,
    ollama_model: OLLAMA_MODEL,
    claude_api: ANTHROPIC_API_KEY ? 'configured' : 'missing'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
  const dbStatus = mongoose.connection.readyState === 1 ? '✅ Connected' : '⏳ Connecting...';
  console.log(`💾 Database: ${dbStatus}`);
  console.log(`🤖 Claude API: ${ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing'}`);
});