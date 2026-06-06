import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { Trophy, ChevronRight } from 'lucide-react'

function RoomDashboard() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      // Get room
      const { data: room } = await supabase
        .from('rooms')
        .select('id')
        .eq('join_code', code)
        .single()

      if (!room) return

      // Get all players in room
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', room.id)

      if (!players || players.length === 0) {
        setLoading(false)
        return
      }

      // Get all completed game sessions
      const { data: sessions } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('room_id', room.id)
        .eq('is_complete', true)

      const sessionIds = sessions ? sessions.map((s) => s.id) : []

      // Get all rounds from completed sessions
      let roundIds = []
      if (sessionIds.length > 0) {
        const { data: rounds } = await supabase
          .from('rounds')
          .select('id, game_session_id')
          .in('game_session_id', sessionIds)

        roundIds = rounds ? rounds.map((r) => r.id) : []
      }

      // Get all round scores
      let allScores = []
      if (roundIds.length > 0) {
        const { data: scores } = await supabase
          .from('round_scores')
          .select('*')
          .in('round_id', roundIds)

        allScores = scores || []
      }

      // Get all game session players (who played in which session)
      let sessionPlayers = []
      if (sessionIds.length > 0) {
        const { data: rounds } = await supabase
          .from('rounds')
          .select('id, game_session_id')
          .in('game_session_id', sessionIds)

        if (rounds && rounds.length > 0) {
          const { data: scores } = await supabase
            .from('round_scores')
            .select('player_id, round_id')
            .in('round_id', rounds.map((r) => r.id))

          sessionPlayers = scores || []
        }
      }

      // Compute stats per player
      const stats = players.map((player) => {
        // Total score across all rounds
        const playerScores = allScores.filter((s) => s.player_id === player.id)
        const totalScore = playerScores.reduce((sum, s) => sum + s.round_score, 0)

        // Games played — count unique sessions where player appeared
        const playerRoundIds = sessionPlayers
          .filter((s) => s.player_id === player.id)
          .map((s) => s.round_id)

        const { data: rounds } = { data: null }
        const gamesPlayed = sessionIds.length > 0
          ? new Set(
              sessionPlayers
                .filter((s) => s.player_id === player.id)
                .map((s) => {
                  const round = allScores.find((r) => r.round_id === s.round_id)
                  return s.round_id
                })
            ).size
          : 0

        return {
          id: player.id,
          name: player.name,
          totalScore,
          gamesPlayed: playerRoundIds.length > 0 ? gamesPlayed : 0,
          wins: 0, // will compute below
        }
      })

      // Compute wins per player
      if (sessionIds.length > 0) {
        for (const sessionId of sessionIds) {
          // Get rounds for this session
          const { data: sessionRounds } = await supabase
            .from('rounds')
            .select('id')
            .eq('game_session_id', sessionId)

          if (!sessionRounds || sessionRounds.length === 0) continue

          const sessionRoundIds = sessionRounds.map((r) => r.id)

          // Get scores for this session
          const { data: sessionScores } = await supabase
            .from('round_scores')
            .select('*')
            .in('round_id', sessionRoundIds)

          if (!sessionScores || sessionScores.length === 0) continue

          // Compute total per player for this session
          const sessionTotals = {}
          sessionScores.forEach((s) => {
            if (!sessionTotals[s.player_id]) sessionTotals[s.player_id] = 0
            sessionTotals[s.player_id] += s.round_score
          })

          // Find winner
          let winnerId = null
          let highestScore = -Infinity
          Object.entries(sessionTotals).forEach(([playerId, score]) => {
            if (score > highestScore) {
              highestScore = score
              winnerId = playerId
            }
          })

          // Add win to player
          const playerStat = stats.find((s) => s.id === winnerId)
          if (playerStat) playerStat.wins += 1
        }
      }

      // Sort by total score
      stats.sort((a, b) => b.totalScore - a.totalScore)
      setLeaderboard(stats)
      setLoading(false)
    }

    fetchLeaderboard()
  }, [code])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400 font-medium">Loading leaderboard...</p>
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trophy size={28} color="#a1a1aa" strokeWidth={1.5} />
        </div>
        <p className="text-zinc-400 font-medium">No data yet</p>
        <p className="text-zinc-300 text-sm mt-1">
          Record a game to see the leaderboard!
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-navy-500">Leaderboard</h2>
        <p className="text-zinc-400 text-sm mt-1">All-time rankings</p>
      </div>

      {/* Top 3 */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* 2nd place */}
          <div className="bg-white border-2 border-zinc-100 rounded-2xl p-4 text-center shadow-sm mt-4">
            <div className="w-10 h-10 bg-zinc-200 rounded-xl flex items-center justify-center mx-auto mb-2">
              <span className="text-zinc-600 font-black">2</span>
            </div>
            <p className="text-navy-500 font-bold text-sm leading-tight">
              {leaderboard[1].name}
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              {leaderboard[1].totalScore} pts
            </p>
          </div>

          {/* 1st place */}
          <div className="bg-orange-500 rounded-2xl p-4 text-center shadow-md">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Trophy size={18} color="white" strokeWidth={2.5} />
            </div>
            <p className="text-white font-bold text-sm leading-tight">
              {leaderboard[0].name}
            </p>
            <p className="text-orange-100 text-xs mt-1">
              {leaderboard[0].totalScore} pts
            </p>
          </div>

          {/* 3rd place */}
          <div className="bg-white border-2 border-zinc-100 rounded-2xl p-4 text-center shadow-sm mt-8">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <span className="text-amber-600 font-black">3</span>
            </div>
            <p className="text-navy-500 font-bold text-sm leading-tight">
              {leaderboard[2].name}
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              {leaderboard[2].totalScore} pts
            </p>
          </div>
        </div>
      )}

      {/* Full Rankings */}
      <div className="flex flex-col gap-2">
        {leaderboard.map((player, index) => (
          <button
            key={player.id}
            onClick={() => navigate(`/room/${code}/player/${player.id}`)}
            className="w-full bg-white border-2 border-zinc-100 hover:border-orange-300 rounded-2xl p-4 flex items-center gap-4 transition shadow-sm hover:shadow-md text-left"
          >
            {/* Rank */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
              index === 0 ? 'bg-orange-500 text-white' :
              index === 1 ? 'bg-zinc-200 text-zinc-600' :
              index === 2 ? 'bg-amber-100 text-amber-600' :
              'bg-zinc-100 text-zinc-400'
            }`}>
              {index + 1}
            </div>

            {/* Name */}
            <div className="flex-1">
              <p className="text-navy-500 font-bold">{player.name}</p>
              <p className="text-zinc-400 text-xs mt-0.5">
                {player.gamesPlayed} games · {player.wins} wins
              </p>
            </div>

            {/* Score */}
            <div className="text-right">
              <p className="text-navy-500 font-black text-lg">{player.totalScore}</p>
              <p className="text-zinc-400 text-xs">points</p>
            </div>

            <ChevronRight size={16} color="#a1a1aa" strokeWidth={2} />
          </button>
        ))}
      </div>
    </div>
  )
}

export default RoomDashboard