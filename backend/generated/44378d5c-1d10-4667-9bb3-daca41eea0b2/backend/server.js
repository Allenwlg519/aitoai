const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(path.join(__dirname, 'todo.db'), (err) => {
  if (err) console.error(err.message);
  db.run(`CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.get('/api/todos', (req, res) => {
  db.all('SELECT * FROM todos ORDER BY createdAt DESC', (err, rows) => {
    res.json({ todos: rows });
  });
});

app.post('/api/todos', (req, res) => {
  const { title, description, status = 'pending', priority = 'medium' } = req.body;
  db.run('INSERT INTO todos (title, description, status, priority) VALUES (?, ?, ?, ?)',
    [title, description, status, priority], function(err) {
      res.json({ id: this.lastID, title, description, status, priority });
    });
});

app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority } = req.body;
  db.run('UPDATE todos SET title=?, description=?, status=?, priority=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?',
    [title, description, status, priority, id], () => {
      res.json({ success: true });
    });
});

app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM todos WHERE id=?', [id], () => {
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));