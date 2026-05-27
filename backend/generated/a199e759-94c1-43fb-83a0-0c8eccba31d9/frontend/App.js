import { useState, useEffect } from 'react';
import { List, Card, Button, Modal, Form, Input } from 'antd';
import 'antd/dist/reset.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [posts, setPosts] = useState([]);
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetch(`${API_BASE_URL}/posts`)
      .then(res => res.json())
      .then(data => setPosts(data.posts));
  }, []);

  const handleSubmit = (values) => {
    fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    }).then(res => res.json()).then(post => {
      setPosts([post, ...posts]);
      setVisible(false);
      form.resetFields();
    });
  };

  const deletePost = (id) => {
    fetch(`${API_BASE_URL}/posts/${id}`, { method: 'DELETE' })
      .then(() => setPosts(posts.filter(p => p.id !== id)));
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>我的博客</h1>
        <Button type="primary" onClick={() => setVisible(true)}>写文章</Button>
      </div>
      <List grid={{ gutter: 16, column: 3 }} dataSource={posts} renderItem={post => (
        <Card title={post.title} extra={<Button danger onClick={() => deletePost(post.id)}>删除</Button>}>
          <p>{post.content.substring(0, 100)}...</p>
          <p style={{ color: '#666', fontSize: 12 }}>{post.createdAt}</p>
        </Card>
      )}/>
      <Modal title="写文章" open={visible} onCancel={() => setVisible(false)} footer={null}>
        <Form form={form} onFinish={handleSubmit}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">发布</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default App;