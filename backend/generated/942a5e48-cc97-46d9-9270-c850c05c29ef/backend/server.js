const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const dataFile = path.join(__dirname, 'data.json');

const initData = () => {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ todos: [] }));
  }
};

const getData = () => {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
};

const saveData = (data) => {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

initData();

let nextId = 1;
const data = getData();
if (data.todos.length > 0) {
  nextId = Math.max(...data.todos.map(t => t.id)) + 1;
}

app.get('/api/todos', (req, res) => {
  const data = getData();
  res.json({ todos: data.todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

app.post('/api/todos', (req, res) => {
  const { title, description, status = 'pending', priority = 'medium' } = req.body;
  const now = new Date().toISOString();
  const todo = { id: nextId++, title, description, status, priority, createdAt: now, updatedAt: now };
  const data = getData();
  data.todos.push(todo);
  saveData(data);
  res.json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority } = req.body;
  const data = getData();
  const todoIndex = data.todos.findIndex(t => t.id === parseInt(id));
  if (todoIndex !== -1) {
    data.todos[todoIndex] = {
      ...data.todos[todoIndex],
      title, description, status, priority,
      updatedAt: new Date().toISOString()
    };
    saveData(data);
  }
  res.json({ success: true });
});

app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const data = getData();
  data.todos = data.todos.filter(t => t.id !== parseInt(id));
  saveData(data);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));