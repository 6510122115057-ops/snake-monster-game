// 🔄 Database Migration Script
// Run this to upgrade existing database schema

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'scores.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Starting database migration...');

db.serialize(() => {
  // Check if new columns exist
  db.all("PRAGMA table_info(scores)", (err, columns) => {
    if (err) {
      console.error('❌ Error checking table structure:', err);
      return;
    }

    const existingColumns = columns.map(col => col.name);
    console.log('📊 Existing columns:', existingColumns);

    const newColumns = [
      { name: 'play_time', type: 'INTEGER', default: '0' },
      { name: 'monsters_killed', type: 'INTEGER', default: '0' },
      { name: 'max_kill_combo', type: 'INTEGER', default: '0' },
      { name: 'max_food_combo', type: 'INTEGER', default: '0' },
      { name: 'theme', type: 'TEXT', default: "'default'" },
      { name: 'created_at', type: 'DATETIME', default: 'CURRENT_TIMESTAMP' }
    ];

    // Add missing columns
    newColumns.forEach(column => {
      if (!existingColumns.includes(column.name)) {
        const sql = `ALTER TABLE scores ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default}`;
        
        db.run(sql, (err) => {
          if (err) {
            console.error(`❌ Error adding column ${column.name}:`, err);
          } else {
            console.log(`✅ Added column: ${column.name}`);
          }
        });
      } else {
        console.log(`⏭️  Column ${column.name} already exists`);
      }
    });

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_scores_mode_score ON scores(mode, score DESC)',
      'CREATE INDEX IF NOT EXISTS idx_scores_monsters ON scores(monsters_killed DESC)',
      'CREATE INDEX IF NOT EXISTS idx_scores_time ON scores(play_time ASC)',
      'CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at DESC)'
    ];

    indexes.forEach((indexSql, i) => {
      db.run(indexSql, (err) => {
        if (err) {
          console.error(`❌ Error creating index ${i + 1}:`, err);
        } else {
          console.log(`✅ Created index ${i + 1}`);
        }
      });
    });

    // Update existing records with default values for created_at
    db.run(`
      UPDATE scores 
      SET created_at = datetime('now') 
      WHERE created_at IS NULL
    `, (err) => {
      if (err) {
        console.error('❌ Error updating created_at:', err);
      } else {
        console.log('✅ Updated created_at for existing records');
      }
    });

    console.log('🎉 Migration completed!');
    
    // Show final table structure
    db.all("PRAGMA table_info(scores)", (err, finalColumns) => {
      if (!err) {
        console.log('📊 Final table structure:');
        finalColumns.forEach(col => {
          console.log(`   ${col.name}: ${col.type} ${col.dflt_value ? `(default: ${col.dflt_value})` : ''}`);
        });
      }
      
      db.close();
    });
  });
});