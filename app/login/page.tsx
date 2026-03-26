'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [id,   setId]   = useState('')
  const [pass, setPass] = useState('')
  const [err,  setErr]  = useState('')
  const router = useRouter()

  const login = (e: React.FormEvent) => {
    e.preventDefault()
    // Demo credentials — replace with Supabase auth later
    if (id === 'admin' && pass === 'delhi2024') {
      localStorage.setItem('ai_auth', '1')
      router.push('/dashboard')
    } else {
      setErr('Invalid credentials')
    }
  }

  return (
    <div className="h-screen bg-[#0b0c10] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-mono text-3xl font-bold text-[#00d4ff] tracking-widest mb-2">
            AtmosIntel
          </div>
          <div className="text-white/40 text-sm">
            Delhi-NCR Air Quality Intelligence Platform
          </div>
        </div>
        <form onSubmit={login}
              className="bg-[#12141c] border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
              User ID
            </label>
            <input
              value={id}
              onChange={e => setId(e.target.value)}
              placeholder="Enter your user ID"
              className="w-full bg-white/[0.04] border border-white/10 text-white
                         placeholder:text-white/20 rounded-lg px-3 py-2.5 text-sm
                         focus:outline-none focus:border-[#00d4ff]/50"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-white/[0.04] border border-white/10 text-white
                         placeholder:text-white/20 rounded-lg px-3 py-2.5 text-sm
                         focus:outline-none focus:border-[#00d4ff]/50"
            />
          </div>
          {err && <p className="text-red-400 text-xs">{err}</p>}
          <button type="submit"
                  className="w-full py-2.5 rounded-lg bg-[#00d4ff]/10 border
                             border-[#00d4ff]/30 text-[#00d4ff] text-sm font-medium
                             hover:bg-[#00d4ff]/20 transition-all">
            Sign In
          </button>
          <div className="text-center text-xs text-white/20 mt-2">
            Demo: admin / delhi2024
          </div>
        </form>
      </div>
    </div>
  )
}