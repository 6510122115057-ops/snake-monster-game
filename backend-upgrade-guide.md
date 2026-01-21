# 🚀 Snake Scoreboard Backend Upgrade Guide

## 📊 Database Schema Update

### เพิ่มคอลัมน์ใหม่ในตาราง scores:

```sql
-- เพิ่มคอลัมน์ใหม่ (Backward Compatible)
ALTER TABLE scores ADD COLUMN play_time INTEGER DEFAULT 0;
ALTER TABLE scores ADD COLUMN monsters_killed INTEGER DEFAULT 0;
ALTER TABLE scores ADD COLUMN max_kill_combo INTEGER DEFAULT 0;
ALTER TABLE scores ADD COLUMN max_food_combo INTEGER DEFAULT 0;
ALTER TABLE scores ADD COLUMN theme VARCHAR(20) DEFAULT 'default';
ALTER TABLE scores ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Index สำหรับ query ที่เร็วขึ้น
CREATE INDEX idx_scores_mode_score ON scores(mode, score DESC);
CREATE INDEX idx_scores_monsters_killed ON scores(monsters_killed DESC);
CREATE INDEX idx_scores_play_time ON scores(play_time ASC);
CREATE INDEX idx_scores_created_at ON scores(created_at DESC);
```

## 🔧 API Endpoints ที่ปรับปรุง

### 1. POST /api/scores (ปรับปรุง)
รับข้อมูลเพิ่มเติม:
```json
{
  "name": "Player",
  "score": 1250,
  "mode": "hard",
  "playTime": 325,
  "monstersKilled": 15,
  "maxKillCombo": 4,
  "maxFoodCombo": 12,
  "theme": "neon",
  "timestamp": "2025-01-21T10:30:00Z"
}
```

### 2. GET /api/scores/top (เดิม - ยังใช้ได้)
```json
{
  "scores": [
    {
      "id": 1,
      "name": "Player1",
      "score": 1250,
      "mode": "hard",
      "playTime": 325,
      "monstersKilled": 15,
      "maxKillCombo": 4,
      "maxFoodCombo": 12,
      "theme": "neon",
      "created_at": "2025-01-21T10:30:00Z"
    }
  ]
}
```

### 3. GET /api/leaderboard/monsters (ใหม่)
อันดับการฆ่ามอนสเตอร์มากที่สุด

### 4. GET /api/leaderboard/speed (ใหม่)
อันดับเวลาเร็วที่สุดในการได้คะแนนสูง

### 5. GET /api/stats/summary (ใหม่)
สถิติรวมของเกม

## 📁 ไฟล์ที่ต้องปรับปรุง

### server.js หรือ app.js
- เพิ่มการรับข้อมูลใหม่
- เพิ่ม API endpoints ใหม่
- เพิ่มการ validate ข้อมูล

### models/Score.js (ถ้าใช้ ORM)
- เพิ่ม fields ใหม่
- เพิ่ม validation rules

### routes/scores.js
- เพิ่ม endpoints ใหม่
- เพิ่มการ query แบบใหม่

## 🔄 Migration Strategy

### Phase 1: Backward Compatible
1. เพิ่มคอลัมน์ใหม่แต่ไม่บังคับ
2. API เดิมยังทำงานได้
3. ค่อยๆ เก็บข้อมูลใหม่

### Phase 2: Enhanced Features
1. เพิ่ม API endpoints ใหม่
2. Leaderboard หลากหลายประเภท
3. สถิติรายละเอียด

## 🚀 ขั้นตอนการ Deploy

1. **Backup Database**
2. **Run Migration Scripts**
3. **Deploy New Backend Code**
4. **Test API Endpoints**
5. **Update Frontend** (ทำแล้ว)

## 📈 ฟีเจอร์ใหม่ที่เป็นไปได้

- 🏆 Multiple Leaderboards
- 📊 Player Statistics
- 🎯 Achievement System
- 📱 Better Mobile API
- 🔍 Search & Filter
- 📈 Analytics Dashboard