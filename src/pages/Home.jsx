import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { ArrowRight, Plus, Users, Smartphone, X } from 'lucide-react'

function Home() {
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
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
    if (!roomPassword.trim()) {
    setError('Please enter a room password!')
    setLoading(false)
    return
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert([{ name: roomName, join_code: code, password: roomPassword.trim() }])
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

    if (data.password && data.password !== joinPassword.trim()) {
      setError('Wrong password. Please try again!')
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

          <input
            type="password"
            placeholder="Set a room password"
            value={roomPassword}
            onChange={(e) => setRoomPassword(e.target.value)}
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

          <input
            type="password"
            placeholder="Enter room password"
            value={joinPassword}
            onChange={(e) => setJoinPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            className="w-full bg-zinc-50 border-2 border-zinc-100 text-navy-500 placeholder-zinc-400 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-orange-400 transition font-medium"
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

        {/* Install Button */}
        <button
          onClick={() => setShowInstallModal(true)}
          className="flex items-center gap-2 mx-auto mt-8 text-zinc-400 hover:text-navy-500 transition text-xs font-medium"
        >
          <Smartphone size={14} strokeWidth={2} />
          Install as app on your phone
        </button>

        {/* Footer */}
        <p className="text-zinc-300 text-xs text-center mt-3">
          Your family's scores, saved forever. Developed by Patricia Ann Cajucom.
        </p>

        {/* Install Modal */}
        {showInstallModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">

              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b-2 border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-navy-500 rounded-xl flex items-center justify-center">
                    <Smartphone size={18} color="white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-navy-500 font-bold text-base leading-none">Install App</h3>
                    <p className="text-zinc-400 text-xs mt-0.5">Save to your home screen</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="w-8 h-8 bg-zinc-100 hover:bg-zinc-200 rounded-lg flex items-center justify-center transition"
                >
                  <X size={16} color="#71717a" strokeWidth={2.5} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5">

                {/* iPhone */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-black text-zinc-500">🍎</span>
                    </div>
                    <p className="text-navy-500 font-bold text-sm">iPhone (Safari)</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      'Open this website in Safari',
                      'Tap the Share button — the box with an arrow at the bottom of the screen',
                      'Scroll down and tap "Add to Home Screen"',
                      'Tap "Add" to confirm'
                    ].map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white font-black text-xs">{index + 1}</span>
                        </div>
                        <p className="text-zinc-500 text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-zinc-100" />
                  <span className="text-zinc-300 text-xs">or</span>
                  <div className="flex-1 h-px bg-zinc-100" />
                </div>

                {/* Android */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-black text-zinc-500">🤖</span>
                    </div>
                    <p className="text-navy-500 font-bold text-sm">Android (Chrome)</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      'Open this website in Chrome',
                      'Tap the 3 dots menu at the top right',
                      'Tap "Add to Home Screen" or "Install App"',
                      'Tap "Install" to confirm'
                    ].map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-navy-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white font-black text-xs">{index + 1}</span>
                        </div>
                        <p className="text-zinc-500 text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-5 pb-5">
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="w-full bg-navy-500 hover:bg-navy-600 text-white font-bold py-3 rounded-xl transition"
                >
                  Got it!
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Home