'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type UserType = 'admin' | 'citizen'

const CREDENTIALS = {
  admin:   [{ id: 'admin',    pass: 'delhi2024', name: 'Administrator' }],
  citizen: [{ id: 'citizen1', pass: 'citizen',   name: 'Delhi Resident' }],
}

export default function LoginPage() {
  const [type, setType]   = useState<UserType>('admin')
  const [id,   setId]     = useState('')
  const [pass, setPass]   = useState('')
  const [err,  setErr]    = useState('')
  const router = useRouter()

  const login = (e: React.FormEvent) => {
    e.preventDefault()
    const match = CREDENTIALS[type].find(c => c.id === id && c.pass === pass)
    if (match) {
      localStorage.setItem('ai_auth',  type)
      localStorage.setItem('ai_name',  match.name)
      router.push(type === 'citizen' ? '/citizen' : '/dashboard?tab=analytics')
    } else {
      setErr('Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="font-mono text-3xl font-bold text-[#00d4ff] tracking-widest mb-2">
          AtmosIntel
        </div>
        <div className="text-white/40 text-sm">
          Delhi-NCR Air Quality Intelligence Platform
        </div>
      </div>

      <div className="w-full max-w-sm">
        {/* Toggle */}
        <div className="flex bg-white/[0.04] rounded-xl p-1 mb-4 border border-white/10">
          {(['admin','citizen'] as UserType[]).map(t => (
            <button key={t} onClick={() => { setType(t); setErr(''); setId(''); setPass('') }}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all
                      ${type === t ? 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30' : 'text-white/30'}`}>
              {t === 'admin' ? '🏛 Admin' : '👤 Citizen'}
            </button>
          ))}
        </div>

        <form onSubmit={login}
              className="bg-[#12141c] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="text-center text-xs text-white/30 mb-2">
            {type === 'admin'
              ? 'Municipal Corporation Officials'
              : 'Delhi Residents — View air quality in your area'}
          </div>
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">
              User ID
            </label>
            <input value={id} onChange={e => setId(e.target.value)} required
                   placeholder={type === 'admin' ? 'admin' : 'citizen1'}
                   className="w-full bg-white/[0.04] border border-white/10 text-white
                              placeholder:text-white/15 rounded-lg px-3 py-2.5 text-sm
                              focus:outline-none focus:border-[#00d4ff]/50" />
          </div>
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} required
                   placeholder="••••••••"
                   className="w-full bg-white/[0.04] border border-white/10 text-white
                              placeholder:text-white/15 rounded-lg px-3 py-2.5 text-sm
                              focus:outline-none focus:border-[#00d4ff]/50" />
          </div>
          {err && <p className="text-red-400 text-xs text-center">{err}</p>}
          <button type="submit"
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-all
                             bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff]
                             hover:bg-[#00d4ff]/20">
            Sign In →
          </button>
          <div className="text-center text-[10px] text-white/15">
            Admin: admin / delhi2024 · Citizen: citizen1 / citizen
          </div>
        </form>
      </div>
    </div>
  )
}