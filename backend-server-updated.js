// 🚀 Enhanced Snake Scoreboard Backend
// Updated to support new game statistics

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'scores.db');
const db = new sqlite3.Database(dbPath);

// Initialize database with updated schema
db.serialize(() => {
  // Create table with all new columns
  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    mode TEXT NOT NULL DEFAULT 'easy',
    play_time INTEGER DEFAULT 0,
    monsters_killed INTEGER DEFAULT 0,
    max_kill_combo INTEGER DEFAULT 0,
    max_food_combo INTEGER DEFAULT 0,
    theme TEXT DEFAULT 'default',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_scores_mode_score ON scores(mode, score DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_scores_monsters ON scores(monsters_killed DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_scores_time ON scores(play_time ASC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at DESC)`);
});

// 📊 POST /api/scores - Submit new score (Enhanced)
app.post('/api/scores', (req, res) => {
  const {
    name,
    score,
    mode = 'easy',
    playTime = 0,
    monstersKilled = 0,
    maxKillCombo = 0,
    maxFoodCombo = 0,
    theme = 'default',
    timestamp
  } = req.body;

  // Validation
  if (!name || typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  const query = `
    INSERT INTO scores (
      name, score, mode, play_time, monsters_killed, 
      max_kill_combo, max_food_combo, theme, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const createdAt = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

  db.run(query, [
    name.slice(0, 20), // Limit name length
    score,
    mode,
    playTime,
    monstersKilled,
    maxKillCombo,
    maxFoodCombo,
    theme,
    createdAt
  ], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ 
      success: true, 
      id: this.lastID,
      message: 'Score submitted successfully'
    });
  });
});

// 🏆 GET /api/scores/top - Top scores by mode (Enhanced)
app.get('/api/scores/top', (req, res) => {
  const mode = req.query.mode || 'easy';
  const limit = parseInt(req.query.limit) || 10;

  const query = `
    SELECT 
      id, name, score, mode, play_time, monsters_killed,
      max_kill_combo, max_food_combo, theme, created_at
    FROM scores 
    WHERE mode = ? 
    ORDER BY score DESC 
    LIMIT ?
  `;

  db.all(query, [mode, limit], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Format response
    const scores = rows.map((row, index) => ({
      rank: index + 1,
      id: row.id,
      name: row.name,
      score: row.score,
      mode: row.mode,
      playTime: row.play_time,
      monstersKilled: row.monsters_killed,
      maxKillCombo: row.max_kill_combo,
      maxFoodCombo: row.max_food_combo,
      theme: row.theme,
      createdAt: row.created_at
    }));

    res.json({ scores });
  });
});

// 👹 GET /api/leaderboard/monsters - Monster kill leaderboard
app.get('/api/leaderboard/monsters', (req, res) => {
  const mode = req.query.mode || 'easy';
  const limit = parseInt(req.query.limit) || 10;

  const query = `
    SELECT 
      id, name, score, monsters_killed, max_kill_combo, 
      play_time, theme, created_at
    FROM scores 
    WHERE mode = ? AND monsters_killed > 0
    ORDER BY monsters_killed DESC, score DESC
    LIMIT ?
  `;

  db.all(query, [mode, limit], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      name: row.name,
      monstersKilled: row.monsters_killed,
      maxKillCombo: row.max_kill_combo,
      score: row.score,
      playTime: row.play_time,
      theme: row.theme,
      createdAt: row.created_at
    }));

    res.json({ leaderboard, type: 'monsters' });
  });
});

// ⚡ GET /api/leaderboard/speed - Speed leaderboard (fastest high scores)
app.get('/api/leaderboard/speed', (req, res) => {
  const mode = req.query.mode || 'easy';
  const minScore = parseInt(req.query.minScore) || 500;
  const limit = parseInt(req.query.limit) || 10;

  const query = `
    SELECT 
      id, name, score, play_time, monsters_killed,
      max_kill_combo, max_food_combo, theme, created_at
    FROM scores 
    WHERE mode = ? AND score >= ? AND play_time > 0
    ORDER BY play_time ASC, score DESC
    LIMIT ?
  `;

  db.all(query, [mode, minScore, limit], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      name: row.name,
      score: row.score,
      playTime: row.play_time,
      monstersKilled: row.monsters_killed,
      efficiency: Math.round(row.score / Math.max(row.play_time, 1)), // Score per second
      theme: row.theme,
      createdAt: row.created_at
    }));

    res.json({ leaderboard, type: 'speed', minScore });
  });
});

// 🔥 GET /api/leaderboard/combo - Combo leaderboard
app.get('/api/leaderboard/combo', (req, res) => {
  const mode = req.query.mode || 'easy';
  const type = req.query.type || 'food'; // 'food' or 'kill'
  const limit = parseInt(req.query.limit) || 10;

  const comboField = type === 'kill' ? 'max_kill_combo' : 'max_food_combo';
  
  const query = `
    SELECT 
      id, name, score, ${comboField} as combo, play_time,
      monsters_killed, theme, created_at
    FROM scores 
    WHERE mode = ? AND ${comboField} > 0
    ORDER BY ${comboField} DESC, score DESC
    LIMIT ?
  `;

  db.all(query, [mode, limit], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      name: row.name,
      combo: row.combo,
      score: row.score,
      playTime: row.play_time,
      monstersKilled: row.monsters_killed,
      theme: row.theme,
      createdAt: row.created_at
    }));

    res.json({ leaderboard, type: `${type}_combo` });
  });
});

// 📈 GET /api/stats/summary - Game statistics summary
app.get('/api/stats/summary', (req, res) => {
  const mode = req.query.mode;

  let whereClause = '';
  let params = [];
  
  if (mode) {
    whereClause = 'WHERE mode = ?';
    params = [mode];
  }

  const query = `
    SELECT 
      COUNT(*) as total_games,
      MAX(score) as highest_score,
      AVG(score) as average_score,
      MAX(monsters_killed) as max_monsters_killed,
      AVG(monsters_killed) as avg_monsters_killed,
      MAX(max_kill_combo) as best_kill_combo,
      MAX(max_food_combo) as best_food_combo,
      AVG(play_time) as avg_play_time,
      MIN(play_time) as fastest_time,
      COUNT(DISTINCT name) as unique_players,
      COUNT(CASE WHEN theme = 'neon' THEN 1 END) as neon_theme_usage,
      COUNT(CASE WHEN theme = 'default' THEN 1 END) as default_theme_usage
    FROM scores 
    ${whereClause}
  `;

  db.get(query, params, (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const stats = {
      totalGames: row.total_games,
      highestScore: row.highest_score || 0,
      averageScore: Math.round(row.average_score || 0),
      monsters: {
        maxKilled: row.max_monsters_killed || 0,
        averageKilled: Math.round(row.avg_monsters_killed || 0)
      },
      combos: {
        bestKillCombo: row.best_kill_combo || 0,
        bestFoodCombo: row.best_food_combo || 0
      },
      time: {
        averagePlayTime: Math.round(row.avg_play_time || 0),
        fastestTime: row.fastest_time || 0
      },
      players: {
        uniquePlayers: row.unique_players || 0
      },
      themes: {
        neon: row.neon_theme_usage || 0,
        default: row.default_theme_usage || 0
      },
      mode: mode || 'all'
    };

    res.json({ stats });
  });
});

// 🔍 GET /api/player/:name - Player statistics
app.get('/api/player/:name', (req, res) => {
  const playerName = req.params.name;
  const limit = parseInt(req.query.limit) || 10;

  const query = `
    SELECT 
      id, score, mode, play_time, monsters_killed,
      max_kill_combo, max_food_combo, theme, created_at
    FROM scores 
    WHERE name = ?
    ORDER BY created_at DESC
    LIMIT ?
  `;

  db.all(query, [playerName, limit], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Calculate player stats
    const games = rows.map(row => ({
      id: row.id,
      score: row.score,
      mode: row.mode,
      playTime: row.play_time,
      monstersKilled: row.monsters_killed,
      maxKillCombo: row.max_kill_combo,
      maxFoodCombo: row.max_food_combo,
      theme: row.theme,
      createdAt: row.created_at
    }));

    const stats = {
      name: playerName,
      totalGames: rows.length,
      bestScore: Math.max(...rows.map(r => r.score)),
      averageScore: Math.round(rows.reduce((sum, r) => sum + r.score, 0) / rows.length),
      totalMonstersKilled: rows.reduce((sum, r) => sum + r.monsters_killed, 0),
      bestKillCombo: Math.max(...rows.map(r => r.max_kill_combo)),
      bestFoodCombo: Math.max(...rows.map(r => r.max_food_combo)),
      totalPlayTime: rows.reduce((sum, r) => sum + r.play_time, 0),
      favoriteTheme: rows.filter(r => r.theme === 'neon').length > rows.filter(r => r.theme === 'default').length ? 'neon' : 'default'
    };

    res.json({ player: stats, recentGames: games });
  });
});

// 🏠 GET / - API Info
app.get('/', (req, res) => {
  res.json({
    name: 'Snake vs Monster Scoreboard API',
    version: '2.0.0',
    description: 'Enhanced API with detailed game statistics',
    endpoints: {
      'POST /api/scores': 'Submit new score with detailed stats',
      'GET /api/scores/top': 'Get top scores by mode',
      'GET /api/leaderboard/monsters': 'Monster kill leaderboard',
      'GET /api/leaderboard/speed': 'Speed leaderboard (fastest high scores)',
      'GET /api/leaderboard/combo': 'Combo leaderboard (food/kill)',
      'GET /api/stats/summary': 'Game statistics summary',
      'GET /api/player/:name': 'Individual player statistics'
    },
    features: [
      'Detailed game statistics',
      'Multiple leaderboard types',
      'Player performance tracking',
      'Theme usage analytics',
      'Time-based achievements'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Enhanced Snake Scoreboard API running on port ${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🌐 API Documentation: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('📊 Database connection closed.');
    }
    process.exit(0);
  });
});

module.exports = app;