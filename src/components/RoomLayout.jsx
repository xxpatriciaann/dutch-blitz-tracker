import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { Trophy, Clock, Users, Plus, ChevronLeft } from 'lucide-react'

function RoomLayout({ children }) {
  const { code } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [room, setRoom] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchRoom() {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('join_code', code)
        .single()
      if (!data) {
        navigate('/')
        return
      }
      setRoom(data)
    }
    fetchRoom()
  }, [code])

  function getActiveTab() {
    if (location.pathname.endsWith('/games')) return 'games'
    if (location.pathname.endsWith('/players')) return 'players'
    if (location.pathname.endsWith('/record')) return 'record'
    return 'leaderboard'
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeTab = getActiveTab()

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, path: `/room/${code}` },
    { id: 'games', label: 'Games', icon: Clock, path: `/room/${code}/games` },
    { id: 'players', label: 'Players', icon: Users, path: `/room/${code}/players` },
  ]

  return (
    <div className="min-h-screen bg-white">

      {/* Top accent bar */}
      <div className="w-full h-1.5 bg-orange-500" />

      {/* Header */}
      <div className="bg-white border-b-2 border-zinc-100">
        <div className="max-w-2xl mx-auto px-4 py-4">

          {/* Back + Room name */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-zinc-400 hover:text-navy-500 transition text-sm font-medium"
            >
              <ChevronLeft size={16} />
              Home
            </button>

            {/* Join code badge */}
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 bg-zinc-50 border-2 border-zinc-100 hover:border-orange-300 rounded-xl px-3 py-1.5 transition"
            >
              <span className="text-zinc-400 text-xs font-medium">Code</span>
              <span className="text-navy-500 font-black tracking-widest font-mono text-sm">
                {code}
              </span>
              <span className="text-xs text-orange-500 font-medium">
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </button>
          </div>

          {/* Room name */}
          <h1 className="text-2xl font-black text-navy-500">
            {room ? room.name : 'Loading...'}
          </h1>

        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition ${
                    isActive
                      ? 'border-orange-500 text-orange-500'
                      : 'border-transparent text-zinc-400 hover:text-navy-500'
                  }`}
                >
                  <Icon size={15} strokeWidth={2.5} />
                  {tab.label}
                </button>
              )
            })}

            {/* Record Game button */}
            <div className="ml-auto flex items-center pb-1">
              <button
                onClick={() => navigate(`/room/${code}/record`)}
                className={`flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold px-4 py-2 rounded-xl transition ${
                  activeTab === 'record' ? 'bg-orange-600' : ''
                }`}
              >
                <Plus size={15} strokeWidth={2.5} />
                Record Game
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </div>

    </div>
  )
}

export default RoomLayout