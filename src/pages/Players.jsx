import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { UserPlus, User, ChevronRight, Pencil, Trash2, X, Check } from 'lucide-react'

function Players() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [roomId, setRoomId] = useState(null)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    async function fetchData() {
      const { data: room } = await supabase
        .from('rooms')
        .select('id')
        .eq('join_code', code)
        .single()

      if (!room) return
      setRoomId(room.id)

      const { data: playerList } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true })

      if (playerList) setPlayers(playerList)
    }
    fetchData()
  }, [code])

  async function handleAddPlayer() {
    if (!newName.trim()) {
      setError('Please enter a player name!')
      return
    }

    const existing = players.find(
      (p) => p.name.toLowerCase() === newName.trim().toLowerCase()
    )
    if (existing) {
      setError('A player with that name already exists!')
      return
    }

    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('players')
      .insert([{ room_id: roomId, name: newName.trim() }])
      .select()
      .single()

    if (error) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    setPlayers([...players, data])
    setNewName('')
    setLoading(false)
  }

  async function handleEditPlayer(playerId) {
    if (!editingName.trim()) return

    const { data, error } = await supabase
      .from('players')
      .update({ name: editingName.trim() })
      .eq('id', playerId)
      .select()
      .single()

    if (error) return

    setPlayers(players.map((p) => p.id === playerId ? { ...p, name: data.name } : p))
    setEditingId(null)
    setEditingName('')
  }

  async function handleDeletePlayer(playerId) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)

    if (error) return

    setPlayers(players.filter((p) => p.id !== playerId))
    setDeletingId(null)
  }

  return (
    <div>

      {/* Add Player Card */}
      <div className="bg-white border-2 border-zinc-100 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
            <UserPlus size={18} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-navy-500 font-bold text-lg leading-none">Add Player</h2>
            <p className="text-zinc-400 text-xs mt-0.5">Add family members to this room</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Ursula"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
            className="flex-1 bg-zinc-50 border-2 border-zinc-100 text-navy-500 placeholder-zinc-400 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400 transition font-medium"
          />
          <button
            onClick={handleAddPlayer}
            className="bg-navy-500 hover:bg-navy-600 text-white font-bold px-5 py-2.5 rounded-xl transition"
          >
            {loading ? '...' : 'Add'}
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-2 font-medium">{error}</p>
        )}
      </div>

      {/* Players List */}
      {players.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User size={28} color="#a1a1aa" strokeWidth={1.5} />
          </div>
          <p className="text-zinc-400 font-medium">No players yet</p>
          <p className="text-zinc-300 text-sm mt-1">Add family members above to get started!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {players.map((player, index) => (
            <div
              key={player.id}
              className="w-full bg-white border-2 border-zinc-100 rounded-2xl p-4 shadow-sm"
            >
              {/* Normal view */}
              {editingId !== player.id && deletingId !== player.id && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-zinc-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-zinc-500 font-black text-sm">{index + 1}</span>
                  </div>
                  <span
                    className="flex-1 text-navy-500 font-bold text-base cursor-pointer hover:text-orange-500 transition"
                    onClick={() => navigate(`/room/${code}/player/${player.id}`)}
                  >
                    {player.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingId(player.id)
                        setEditingName(player.name)
                      }}
                      className="w-8 h-8 bg-zinc-100 hover:bg-orange-100 rounded-lg flex items-center justify-center transition"
                    >
                      <Pencil size={14} color="#71717a" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => setDeletingId(player.id)}
                      className="w-8 h-8 bg-zinc-100 hover:bg-red-100 rounded-lg flex items-center justify-center transition"
                    >
                      <Trash2 size={14} color="#71717a" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}

              {/* Edit view */}
              {editingId === player.id && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEditPlayer(player.id)}
                    className="flex-1 bg-zinc-50 border-2 border-orange-400 text-navy-500 rounded-xl px-3 py-2 focus:outline-none font-medium text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => handleEditPlayer(player.id)}
                    className="w-8 h-8 bg-orange-500 hover:bg-orange-400 rounded-lg flex items-center justify-center transition"
                  >
                    <Check size={14} color="white" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditingName('') }}
                    className="w-8 h-8 bg-zinc-100 hover:bg-zinc-200 rounded-lg flex items-center justify-center transition"
                  >
                    <X size={14} color="#71717a" strokeWidth={2.5} />
                  </button>
                </div>
              )}

              {/* Delete confirmation */}
              {deletingId === player.id && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-navy-500 font-bold text-sm">Remove {player.name}?</p>
                    <p className="text-zinc-400 text-xs mt-0.5">This cannot be undone!</p>
                  </div>
                  <button
                    onClick={() => handleDeletePlayer(player.id)}
                    className="bg-red-500 hover:bg-red-400 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-500 text-xs font-bold px-3 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default Players