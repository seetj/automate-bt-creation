"use client"
import { useState } from 'react';
import { UserPlus, ShieldCheck, Phone, Mail, ChevronRight } from 'lucide-react';

export default function Home() {
  const [formData, setFormData] = useState({ 
    firstName: '', lastName: '', email: '', phone: '', gender: 'Female' 
  });
  const [status, setStatus] = useState({ message: '', type: 'idle' }); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ message: 'Initializing Automation...', type: 'loading' });
    
    try {
        const res = await fetch('/api/automate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
      
        const data = await res.json();
        if (data.status === 'success') {
            setStatus({ message: 'BT Successfully Integrated into Systems', type: 'success' });
        } else {
            setStatus({ message: `Critical Error: ${data.error || 'Check Logs'}`, type: 'error' });
        }
    } catch (err) {
        setStatus({ message: 'Network Failure: VPS Unreachable', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 flex items-center justify-center p-6">
      
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Header Section */}
        <div className="p-10 border-b border-white/10 bg-white/[0.02]">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black tracking-tighter uppercase mb-1">BT Onboarding</h2>
              <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold">Automation Module v2.4</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                 <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">System Ready</span>
               </div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label="First Name" icon={<UserPlus size={14}/>}>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all placeholder:text-white/10"
                placeholder="JANE" 
                onChange={e => setFormData({...formData, firstName: e.target.value})} 
                required 
              />
            </InputGroup>
            
            <InputGroup label="Last Name" icon={<UserPlus size={14}/>}>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all placeholder:text-white/10"
                placeholder="DOE" 
                onChange={e => setFormData({...formData, lastName: e.target.value})} 
                required 
              />
            </InputGroup>
          </div>

          <InputGroup label="Corporate Email" icon={<Mail size={14}/>}>
            <input 
              type="email"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all placeholder:text-white/10"
              placeholder="J.DOE@LTECAREPLUS.ORG" 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              required 
            />
          </InputGroup>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label="Contact Phone" icon={<Phone size={14}/>}>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all placeholder:text-white/10"
                placeholder="(555) 000-0000" 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                required 
              />
            </InputGroup>
            
            <InputGroup label="System Gender" icon={<ShieldCheck size={14}/>}>
              <select 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:bg-white/10 transition-all appearance-none cursor-pointer text-white/60"
                onChange={e => setFormData({...formData, gender: e.target.value})}
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </InputGroup>
          </div>

          {/* Action Button */}
          <button 
            type="submit" 
            disabled={status.type === 'loading'}
            className={`group w-full relative py-6 rounded-[1.5rem] font-black tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 shadow-2xl
              ${status.type === 'loading' 
                ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                : 'bg-white text-black hover:bg-white/90 active:scale-[0.98]'}`}
          >
            {status.type === 'loading' ? 'EXECUTING PIPELINE...' : 'EXECUTE AUTOMATION'}
            <ChevronRight size={16} className={status.type === 'loading' ? 'hidden' : 'group-hover:translate-x-1 transition-transform'} />
          </button>
        </form>

        {/* Status Section (The StatCard Theme) */}
        {status.message && (
          <div className="p-10 bg-white/[0.02] border-t border-white/10 animate-in slide-in-from-bottom-4 duration-500">
             <div className={`p-6 rounded-[2rem] border flex items-center gap-4
                ${status.type === 'loading' ? 'bg-blue-500/5 border-blue-500/10' : ''}
                ${status.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/10' : ''}
                ${status.type === 'error' ? 'bg-red-500/5 border-red-500/10' : ''}
             `}>
                {status.type === 'loading' && (
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                )}
                <div>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Log Output</p>
                   <p className={`text-sm font-bold tracking-tight
                      ${status.type === 'loading' ? 'text-blue-400' : ''}
                      ${status.type === 'success' ? 'text-emerald-400' : ''}
                      ${status.type === 'error' ? 'text-red-400' : ''}
                   `}>{status.message}</p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for clean labeling
function InputGroup({ label, icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 ml-1">
        <span className="text-white/20">{icon}</span>
        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{label}</label>
      </div>
      {children}
    </div>
  );
}