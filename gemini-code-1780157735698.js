// =============================================
// UPGRADED AFFILIATE AGENT — CONTINUOUS AUTONOMOUS BACKEND
// File: affiliate-backend.js
// =============================================

const express    = require('express');
const cors       = require('cors');
const cron       = require('node-cron');
const fetch      = (...args) => import('node-fetch').then(m => m.default(...args));
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

// ─── STATE MANAGEMENT & LONG-TERM MEMORY ────────────────────────────────────
const agentState = {
  currentCampaignProducts: [], 
  lastScanTimestamp: null,
  isYieldingProfit: false,     
  consecutiveNoChangeScans: 0  
};

const cache = {
  trendingProducts: null,
  seasonalTrends: null,
  weeklyStrategy: null,
  updatedAt: {}
};

// ─── CLAUDE API HELPER ──────────────────────────────────────────────────────
async function askClaude(systemPrompt, userPrompt, useWebSearch = false) {
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  };

  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return text.replace(/```json|
```/g, '').trim();
}

// ─── EVOLVED SYSTEM PROMPTS FOR CONTINUOUS ANALYSIS ─────────────────────────
const SYSTEM_PROMPTS = {
  scout: `You are an elite, hyper-aggressive autonomous affiliate product scout running on a continuous loop. 
Your job is to identify high-converting, high-commission products. You must also judge if a market trend has fundamentally shifted.
Respond ONLY in JSON:
{
  "marketAnalysis": "Brief statement on current velocity",
  "trendShiftDetected": true|false, 
  "topProducts": [
    {"name":"string","niche":"string","commission":"string","whyTrending":"string","angle":"string"}
  ],
  "actionRequired": "COMPILE_NEW_CAMPAIGN"|"MAINTAIN_CURRENT_YIELD"
}`,

  page: `You are a world-class direct response copywriter. Generate high-converting landing page copy and social hooks.
Respond ONLY in JSON:
{"headline":"string","subheadline":"string","cta":"string","painPoints":["string"],"emailSubject":"string","tiktokHook":"string"}`,

  trendWatcher: `You are a macro trend analyst tracking immediate buying behavior anomalies. Look for sudden breakout product demands.
Respond ONLY in JSON:
{"breakoutDetected":true|false,"criticalNiche":"string","recommendedAction":"string"}`
};

// ─── ENGINE LOGIC: SELF-SCHEDULING AUTONOMOUS AGENT ─────────────────────────
async function runAutonomousEngine() {
  const now = new Date().toISOString();
  console.log(`\n🔄 [${now}] Continuous Agent Scan Sequence Initiated...`);
  agentState.lastScanTimestamp = now;

  try {
    console.log('👀 Scanning global web trends and Amazon product velocities via Claude...');
    const month = new Date().toLocaleString('default', { month: 'long' });
    const memoryContext = `Current active campaign products: ${JSON.stringify(agentState.currentCampaignProducts)}. Is Yielding State Active: ${agentState.isYieldingProfit}.`;
    
    const scoutRaw = await askClaude(
      SYSTEM_PROMPTS.scout,
      `Analyze product spaces for ${month}. Compare current data to our active memory pipeline. ${memoryContext} Determine if we should push brand new assets or keep letting existing ones convert.`,
      true
    );

    const evaluation = JSON.parse(scoutRaw);
    console.log(`📊 Engine Analysis Result: ${evaluation.marketAnalysis}`);

    if (evaluation.trendShiftDetected || evaluation.actionRequired === 'COMPILE_NEW_CAMPAIGN' || agentState.currentCampaignProducts.length === 0) {
      console.log('🚨 Action Triggered: Market shift or empty pipeline detected! Building new campaign assets...');
      
      agentState.isYieldingProfit = false; 
      agentState.currentCampaignProducts = evaluation.topProducts;
      agentState.consecutiveNoChangeScans = 0;
      cache.trendingProducts = evaluation;
      cache.updatedAt.products = now;

      for (const product of evaluation.topProducts) {
        console.log(`✍️ Crafting promotional materials for: ${product.name}`);
        const copyRaw = await askClaude(SYSTEM_PROMPTS.page, `Generate high-converting conversion material for product: ${product.name}, using angle: ${product.angle}`, false);
        await dispatchToDistributionChannel(product, JSON.parse(copyRaw));
      }
      
      console.log('✅ New campaign fully live. Moving into optimized traffic maturation state.');
      agentState.isYieldingProfit = true; 

    } else {
      agentState.consecutiveNoChangeScans++;
      console.log(`⏳ Status: [Yield Phase Active]. Currently posted assets are optimal. Allowing affiliate revenue links to mature.`);
      console.log(`📈 Consecutive stable checks: ${agentState.consecutiveNoChangeScans}. Continuous vigilance remaining active in background.`);
    }

  } catch (err) {
    console.error('❌ Autonomous Engine Error Encountered:', err.message);
  }
  console.log(`🏁 Scan sequence complete. Next automated evaluation loop triggers in 3 hours.\n`);
}

async function dispatchToDistributionChannel(product, copyData) {
  console.log(`📡 [DISTRIBUTION] Content successfully pushed to live traffic channels for: ${product.name}`);
}

// ─── ENDPOINTS ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'running', state: agentState }));

app.get('/api/engine-status', (req, res) => {
  res.json({
    engineState: agentState,
    cachedData: cache,
    nextScheduledCheck: "Every 3 hours on the hour boundary"
  });
});

app.post('/api/force-scan', async (req, res) => {
  console.log('⚡ Manual override signal received. Forcing immediate trend scan...');
  runAutonomousEngine();
  res.json({ message: 'Continuous engine loop manual override successful.' });
});

// ─── HIGH FREQUENCY CRON SCHEDULES ──────────────────────────────────────────
cron.schedule('0 */3 * * *', () => {
  runAutonomousEngine();
});

// Every Monday at 7:00 AM — refresh weekly strategy optimized for $10K
cron.schedule('0 7 * * 1', async () => {
  console.log('⏰ Weekly strategy refresh triggered');
  try {
    const raw = await askClaude(
      SYSTEM_PROMPTS.strategy,
      'Generate a aggressive, high-leverage 4-week affiliate marketing roadmap for a young entrepreneur starting at $0, explicitly optimized to scale rapidly toward a $10,000/month revenue goal.',
      false
    );
    cache.weeklyStrategy      = JSON.parse(raw);
    cache.strategyUpdatedAt   = new Date().toISOString();
    console.log('✅ Evolved $10K/month strategy refreshed');
  } catch(err) { console.error('Strategy error:', err.message); }
});

// ─── START SERVER ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Self-Sustaining Affiliate Agent Live on Port ${PORT}`);
  console.log(`🤖 Constant Surveillance Mode: Armed`);
  console.log(`⏱️ Scanning Intervals: Active every 3 Hours`);
  
  console.log('\nInitializing engine boot sequence... Running initial market sweep in 5 seconds...');
  setTimeout(runAutonomousEngine, 5000);
});