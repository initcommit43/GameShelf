const express = require('express');
const router = express.Router();
const pool = require('../db/database');

router.get('/', async (req, res) => {
  const user_id = req.user.userId;

  const result = await pool.query(
    `SELECT game_logs.id, game_logs.status, game_logs.rating, game_logs.created_at,
            games.title, games.cover_url, games.igdb_id
     FROM game_logs
     JOIN games ON game_logs.game_id = games.id
     WHERE game_logs.user_id = $1
     ORDER BY game_logs.created_at DESC`,
    [user_id]
  );

  res.json(result.rows);
});

module.exports = router;