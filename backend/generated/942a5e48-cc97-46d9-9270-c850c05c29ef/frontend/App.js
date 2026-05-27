import { useState, useEffect } from 'react';
import { List, Input, Button, Select, Tag } from 'antd';
import 'antd/dist/reset.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('pending');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    fetch(`${API_BASE_URL}/todos`)
      .then(res => res.json())
      .then(data => setTodos(data.todos));
  }, []);

  const addTodo = () => {
    fetch(`${API_BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, status, priority })
    }).then(res => res.json()).then(todo => {
      setTodos([todo, ...todos]);
      setTitle('');
      setDescription('');
    });
  };

  const updateTodo = (id, fields) => {
    fetch(`${API_BASE_URL}/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    }).then(() => {
      setTodos(todos.map(t => t.id === id ? { ...t, ...fields } : t));
    });
  };

  const deleteTodo = (id) => {
    fetch(`${API_BASE_URL}/todos/${id}`, { method: 'DELETE' })
      .then(() => setTodos(todos.filter(t => t.id !== id)));
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1>待办事项</h1>
      <div style={{ marginBottom: 20 }}>
        <Input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginRight: 10 }} />
        <Input placeholder="描述" value={description} onChange={(e) => setDescription(e.target.value)} style={{ marginRight: 10 }} />
        <Select value={status} onChange={setStatus} style={{ width: 100, marginRight: 10 }}>
          <Select.Option value="pending">待办</Select.Option>
          <Select.Option value="completed">已完成</Select.Option>
        </Select>
        <Select value={priority} onChange={setPriority} style={{ width: 100, marginRight: 10 }}>
          <Select.Option value="high">高</Select.Option>
          <Select.Option value="medium">中</Select.Option>
          <Select.Option value="low">低</Select.Option>
        </Select>
        <Button type="primary" onClick={addTodo}>添加</Button>
      </div>
      <List
        dataSource={todos}
        renderItem={todo => (
          <List.Item actions={[
            <Button onClick={() => updateTodo(todo.id, { status: todo.status === 'pending' ? 'completed' : 'pending' })}>
              {todo.status === 'pending' ? '完成' : '撤销'}
            </Button>,
            <Button danger onClick={() => deleteTodo(todo.id)}>删除</Button>
          ]}>
            <List.Item.Meta
              title={todo.title}
              description={todo.description}
            />
            <Tag color={todo.status === 'completed' ? 'green' : 'yellow'}>{todo.status === 'completed' ? '已完成' : '待办'}</Tag>
            <Tag color={todo.priority === 'high' ? 'red' : todo.priority === 'medium' ? 'orange' : 'blue'}>
              {todo.priority === 'high' ? '高优先级' : todo.priority === 'medium' ? '中优先级' : '低优先级'}
            </Tag>
          </List.Item>
        )}
      />
    </div>
  );
}

export default App;