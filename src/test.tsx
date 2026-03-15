import React, { useEffect, useState } from 'react';
import { api } from './services/api';

export function Test() {
  const [status, setStatus] = useState('Testing...');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Test health endpoint
    api.healthCheck()
      .then(data => {
        setStatus('✅ Connected to backend!');
        console.log('Health check:', data);
      })
      .catch(err => {
        setStatus('❌ Failed: ' + err.message);
      });

    // Test users endpoint
    api.getUsers()
      .then(data => {
        setUsers(data);
        console.log('Users:', data);
      })
      .catch(err => {
        console.error('Users error:', err);
      });
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>API Test</h1>
      <p>{status}</p>
      <h2>Users ({users.length})</h2>
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>{user.name} - {user.email} - {user.role}</li>
        ))}
      </ul>
    </div>
  );
}