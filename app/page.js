"use client"
import { useState } from 'react';

export default function Home() {
  const [formData, setFormData] = useState({ 
    firstName: '', lastName: '', email: '', phone: '', gender: 'Female' 
  });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('🚀 Running automation... Check your terminal.');
    
    const res = await fetch('/api/automate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    setStatus(data.status === 'Success' ? '✅ BT Created Successfully!' : `❌ Error: ${data.error}`);
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <div style={{ maxWidth: '400px', margin: 'auto', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h2>BT Onboarding</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input placeholder="First Name" style={inputStyle} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
          <input placeholder="Last Name" style={inputStyle} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
          <input placeholder="Email" type="email" style={inputStyle} onChange={e => setFormData({...formData, email: e.target.value})} required />
          <input placeholder="Phone" style={inputStyle} onChange={e => setFormData({...formData, phone: e.target.value})} required />
          
          <label style={{ fontSize: '14px', color: '#666' }}>Gender (for Aloha):</label>
          <select style={inputStyle} onChange={e => setFormData({...formData, gender: e.target.value})}>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>

          <button type="submit" style={btnStyle}>Run Scripts</button>
        </form>
        <p style={{ marginTop: '20px', fontWeight: 'bold', color: status.includes('✅') ? 'green' : 'orange' }}>{status}</p>
      </div>
    </div>
  );
}

const inputStyle = { padding: '10px', borderRadius: '4px', border: '1px solid #ccc' };
const btnStyle = { padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };