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
    fs.writeFileSync(dataFile, JSON.stringify({ posts: [], categories: [] }));
  }
};

const getData = () => {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
};

const saveData = (data) => {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

initData();

let nextPostId = 1;
let nextCategoryId = 1;
const data = getData();
if (data.posts.length > 0) nextPostId = Math.max(...data.posts.map(p => p.id)) + 1;
if (data.categories.length > 0) nextCategoryId = Math.max(...data.categories.map(c => c.id)) + 1;

app.get('/api/posts', (req, res) => {
  const data = getData();
  res.json({ posts: data.posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

app.get('/api/posts/:id', (req, res) => {
  const data = getData();
  const post = data.posts.find(p => p.id === parseInt(req.params.id));
  res.json({ post });
});

app.post('/api/posts', (req, res) => {
  const { title, content, categoryId } = req.body;
  const now = new Date().toISOString();
  const post = { id: nextPostId++, title, content, categoryId, createdAt: now, updatedAt: now };
  const data = getData();
  data.posts.push(post);
  saveData(data);
  res.json(post);
});

app.put('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, categoryId } = req.body;
  const data = getData();
  const postIndex = data.posts.findIndex(p => p.id === parseInt(id));
  if (postIndex !== -1) {
    data.posts[postIndex] = {
      ...data.posts[postIndex],
      title, content, categoryId,
      updatedAt: new Date().toISOString()
    };
    saveData(data);
  }
  res.json({ success: true });
});

app.delete('/api/posts/:id', (req, res) => {
  const data = getData();
  data.posts = data.posts.filter(p => p.id !== parseInt(req.params.id));
  saveData(data);
  res.json({ success: true });
});

app.get('/api/categories', (req, res) => {
  const data = getData();
  res.json({ categories: data.categories });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));