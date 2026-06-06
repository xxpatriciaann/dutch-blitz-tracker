import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { ArrowRight, Plus, Users } from 'lucide-react'

function Home() {
  const [roomName, setRoomName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  async function handleCreateRoom() {
    if (!roomName.trim()) {
      setError('Please enter a room name!')
      return
    }
    setLoading(true)
    setError('')
    const code = generateCode()
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ name: roomName, join_code: code }])
      .select()
      .single()
    if (error) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }
    navigate(`/room/${data.join_code}`)
  }

  async function handleJoinRoom() {
    if (!joinCode.trim()) {
      setError('Please enter a join code!')
      return
    }
    setError('')
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('join_code', joinCode)
      .single()
    if (error || !data) {
      setError('Room not found. Check your join code!')
      return
    }
    navigate(`/room/${data.join_code}`)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">

      {/* Top accent bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-500" />

      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-12">
          <p className="text-orange-500 text-sm font-semibold tracking-widest uppercase mb-3">
            Family Game Night
          </p>
          <h1 className="text-7xl font-black text-navy-500 leading-none tracking-tight">
            Dutch<br />Blitz
          </h1>
          <div className="w-16 h-1.5 bg-orange-500 rounded-full mt-4 mb-4" />
          <p className="text-zinc-500 text-base">
            Track scores, rivalries, and glory — all in one place.
          </p>
        </div>

        {/* Create Room Card */}
        <div className="bg-white border-2 border-zinc-100 rounded-2xl p-6 mb-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
              <Plus size={18} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-navy-500 font-bold text-lg leading-none">Create a Room</h2>
              <p className="text-zinc-400 text-xs mt-0.5">Start fresh for your family</p>
            </div>
          </div>

          <input
            type="text"
            placeholder="e.g. Cajucom Family"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            className="w-full bg-zinc-50 border-2 border-zinc-100 text-navy-500 placeholder-zinc-400 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-orange-400 transition font-medium"
          />

          <button
            onClick={handleCreateRoom}
            className="w-full bg-navy-500 hover:bg-navy-600 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading ? 'Creating...' : (
              <>
                Create Room
                <ArrowRight size={18} strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-5">
          <div className="flex-1 h-px bg-zinc-100" />
          <span className="text-zinc-400 text-sm font-medium px-2">or join existing</span>
          <div className="flex-1 h-px bg-zinc-100" />
        </div>

        {/* Join Room Card */}
        <div className="bg-white border-2 border-zinc-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-navy-500 rounded-xl flex items-center justify-center">
              <Users size={18} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-navy-500 font-bold text-lg leading-none">Join a Room</h2>
              <p className="text-zinc-400 text-xs mt-0.5">Enter your family's room code</p>
            </div>
          </div>

          <input
            type="text"
            placeholder="Enter join code — e.g. CAJU42"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            className="w-full bg-zinc-50 border-2 border-zinc-100 text-navy-500 placeholder-zinc-400 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-orange-400 transition tracking-widest font-mono font-bold"
          />

          <button
            onClick={handleJoinRoom}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            Join Room
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-500 text-sm text-center font-medium">{error}</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-zinc-300 text-xs text-center mt-8">
          Your family's scores, saved forever. Developed by Patricia Ann Cajucom.
        </p>

      </div>
    </div>
  )
}

export default Home