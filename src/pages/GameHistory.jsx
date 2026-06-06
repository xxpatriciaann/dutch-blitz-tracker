import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { Clock, ChevronDown, ChevronUp, Trophy } from 'lucide-react'

function GameHistory() {
  const { code } = useParams()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    async function fetchHistory() {
      // Get room
      const { data: room } = await supabase
        .from('rooms')
        .select('id')
        .eq('join_code', code)
        .single()

      if (!room) return

      // Get all completed sessions
      const { data: sessionList } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('room_id', room.id)
        .eq('is_complete', true)
        .order('created_at', { ascending: false })

      if (!sessionList || sessionList.length === 0) {
        setLoading(false)
        return
      }

      // For each session, get rounds and scores
      const sessionsWithData = await Promise.all(
        sessionList.map(async (session) => {
          // Get rounds
          const { data: rounds } = await supabase
            .from('rounds')
            .select('id, round_number')
            .eq('game_session_id', session.id)
            .order('round_number', { ascending: true })

          if (!rounds || rounds.length === 0) {
            return { ...session, rounds: [], players: [], winner: null }
          }

          const roundIds = rounds.map((r) => r.id)

          // Get all scores
          const { data: scores } = await supabase
            .from('round_scores')
            .select('*, players(name)')
            .in('round_id', roundIds)

          if (!scores || scores.length === 0) {
            return { ...session, rounds: [], players: [], winner: null }
          }

          // Compute total per player
          const playerTotals = {}
          const playerNames = {}
          scores.forEach((s) => {
            if (!playerTotals[s.player_id]) {
              playerTotals[s.player_id] = 0
              playerNames[s.player_id] = s.players.name
            }
            playerTotals[s.player_id] += s.round_score
          })

          // Find winner
          let winnerId = null
          let highestScore = -Infinity
          Object.entries(playerTotals).forEach(([playerId, score]) => {
            if (score > highestScore) {
              highestScore = score
              winnerId = playerId
            }
          })

          // Build players array sorted by score
          const players = Object.entries(playerTotals)
            .map(([id, total]) => ({
              id,
              name: playerNames[id],
              total
            }))
            .sort((a, b) => b.total - a.total)

          // Build round breakdown
          const roundBreakdown = rounds.map((round) => {
            const roundScores = scores.filter((s) => s.round_id === round.id)
            return {
              round_number: round.round_number,
              scores: roundScores.map((s) => ({
                name: s.players.name,
                score: s.round_score,
                placed: s.cards_placed,
                remaining: s.cards_remaining
              })).sort((a, b) => b.score - a.score)
            }
          })

          return {
            ...session,
            rounds: roundBreakdown,
            players,
            winner: playerNames[winnerId],
            winnerScore: highestScore
          }
        })
      )

      setSessions(sessionsWithData)
      setLoading(false)
    }

    fetchHistory()
  }, [code])

  function toggleExpand(sessionId) {
    setExpanded(expanded === sessionId ? null : sessionId)
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400 font-medium">Loading game history...</p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock size={28} color="#a1a1aa" strokeWidth={1.5} />
        </div>
        <p className="text-zinc-400 font-medium">No games yet</p>
        <p className="text-zinc-300 text-sm mt-1">
          Record a game to see history here!
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-navy-500">Game History</h2>
        <p className="text-zinc-400 text-sm mt-1">{sessions.length} games played</p>
      </div>

      <div className="flex flex-col gap-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="bg-white border-2 border-zinc-100 rounded-2xl shadow-sm overflow-hidden"
          >
            {/* Session Header */}
            <button
              onClick={() => toggleExpand(session.id)}
              className="w-full p-4 flex items-center gap-4 text-left hover:bg-zinc-50 transition"
            >
              {/* Date badge */}
              <div className="w-12 h-12 bg-navy-500 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-sm leading-none">
                  {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <span className="text-orange-300 font-black text-lg leading-none">
                  {new Date(session.created_at).getDate()}
                </span>
              </div>

              <div className="flex-1">
                <p className="text-navy-500 font-bold">{session.title}</p>
                <p className="text-zinc-400 text-xs mt-0.5">
                  {session.rounds.length} rounds · ×{session.score_multiplier} multiplier
                </p>
                {session.winner && (
                  <div className="flex items-center gap-1 mt-1">
                    <Trophy size={11} color="#f97316" strokeWidth={2.5} />
                    <span className="text-orange-500 text-xs font-semibold">
                      {session.winner} · {session.winnerScore} pts
                    </span>
                  </div>
                )}
              </div>

              {expanded === session.id
                ? <ChevronUp size={18} color="#a1a1aa" />
                : <ChevronDown size={18} color="#a1a1aa" />
              }
            </button>

            {/* Expanded Content */}
            {expanded === session.id && (
              <div className="border-t-2 border-zinc-100 p-4">

                {/* Final Standings */}
                <p className="text-navy-500 font-bold text-sm mb-3">Final Standings</p>
                <div className="flex flex-col gap-2 mb-5">
                  {session.players.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3"
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${
                        index === 0 ? 'bg-orange-500 text-white' :
                        index === 1 ? 'bg-zinc-200 text-zinc-600' :
                        index === 2 ? 'bg-amber-100 text-amber-600' :
                        'bg-zinc-100 text-zinc-400'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="flex-1 text-navy-500 font-semibold text-sm">
                        {player.name}
                      </span>
                      <span className="text-navy-500 font-black">{player.total} pts</span>
                    </div>
                  ))}
                </div>

                {/* Round Breakdown */}
                <p className="text-navy-500 font-bold text-sm mb-3">Round Breakdown</p>
                <div className="flex flex-col gap-2">
                  {session.rounds.map((round) => (
                    <div
                      key={round.round_number}
                      className="bg-zinc-50 rounded-xl p-3"
                    >
                      <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        Round {round.round_number}
                      </p>
                      <div className="flex flex-col gap-1">
                        {round.scores.map((score) => (
                          <div key={score.name} className="flex items-center justify-between">
                            <span className="text-navy-500 text-sm font-medium">{score.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-zinc-400 text-xs">
                                {score.placed} placed · {score.remaining} left
                              </span>
                              <span className={`font-bold text-sm ${
                                score.score >= 0 ? 'text-green-500' : 'text-red-400'
                              }`}>
                                {score.score > 0 ? '+' : ''}{score.score}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default GameHistory