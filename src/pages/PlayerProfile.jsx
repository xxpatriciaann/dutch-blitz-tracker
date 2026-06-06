import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { Trophy, Star, Activity, Hash } from 'lucide-react'

function PlayerProfile() {
  const { code, id } = useParams()
  const [player, setPlayer] = useState(null)
  const [stats, setStats] = useState(null)
  const [gameHistory, setGameHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      // Get player
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single()

      if (!playerData) return
      setPlayer(playerData)

      // Get all rounds where player has scores
      const { data: allScores } = await supabase
        .from('round_scores')
        .select('*, rounds(id, round_number, game_session_id)')
        .eq('player_id', id)

      if (!allScores || allScores.length === 0) {
        setStats({
          totalScore: 0,
          gamesPlayed: 0,
          wins: 0,
          avgScore: 0,
          bestGame: null
        })
        setLoading(false)
        return
      }

      // Get unique session ids
      const sessionIds = [
        ...new Set(allScores.map((s) => s.rounds.game_session_id))
      ]

      // Get session details
      const { data: sessions } = await supabase
        .from('game_sessions')
        .select('*')
        .in('id', sessionIds)
        .eq('is_complete', true)
        .order('created_at', { ascending: false })

      if (!sessions || sessions.length === 0) {
        setStats({
          totalScore: 0,
          gamesPlayed: 0,
          wins: 0,
          avgScore: 0,
          bestGame: null
        })
        setLoading(false)
        return
      }

      // Compute stats per session
      let totalScore = 0
      let wins = 0
      let bestGame = null
      let bestGameScore = -Infinity
      const historyList = []

      for (const session of sessions) {
        // Get all rounds for this session
        const { data: sessionRounds } = await supabase
          .from('rounds')
          .select('id')
          .eq('game_session_id', session.id)

        if (!sessionRounds) continue
        const sessionRoundIds = sessionRounds.map((r) => r.id)

        // Get all scores for this session
        const { data: sessionScores } = await supabase
          .from('round_scores')
          .select('*, players(name)')
          .in('round_id', sessionRoundIds)

        if (!sessionScores) continue

        // Player's score in this session
        const playerScores = sessionScores.filter((s) => s.player_id === id)
        const playerTotal = playerScores.reduce((sum, s) => sum + s.round_score, 0)

        totalScore += playerTotal

        // Check if player won this session
        const playerTotals = {}
        sessionScores.forEach((s) => {
          if (!playerTotals[s.player_id]) playerTotals[s.player_id] = 0
          playerTotals[s.player_id] += s.round_score
        })

        let winnerId = null
        let highestScore = -Infinity
        Object.entries(playerTotals).forEach(([pId, score]) => {
          if (score > highestScore) {
            highestScore = score
            winnerId = pId
          }
        })

        if (winnerId === id) wins++

        // Best game
        if (playerTotal > bestGameScore) {
          bestGameScore = playerTotal
          bestGame = { title: session.title, score: playerTotal }
        }

        // Build standings for this session
        const standings = Object.entries(playerTotals)
          .map(([pId, total]) => ({
            id: pId,
            name: sessionScores.find((s) => s.player_id === pId)?.players?.name || 'Unknown',
            total
          }))
          .sort((a, b) => b.total - a.total)

        const playerRank = standings.findIndex((s) => s.id === id) + 1

        historyList.push({
          id: session.id,
          title: session.title,
          date: session.created_at,
          playerTotal,
          playerRank,
          totalPlayers: standings.length,
          isWinner: winnerId === id,
          rounds: sessionRounds.length
        })
      }

      setStats({
        totalScore,
        gamesPlayed: sessions.length,
        wins,
        avgScore: sessions.length > 0 ? Math.round(totalScore / sessions.length) : 0,
        bestGame
      })

      setGameHistory(historyList)
      setLoading(false)
    }

    fetchProfile()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400 font-medium">Loading profile...</p>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400 font-medium">Player not found.</p>
      </div>
    )
  }

  return (
    <div>

      {/* Player Header */}
      <div className="bg-navy-500 rounded-2xl p-6 mb-6">
        <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mb-3">
          <span className="text-white font-black text-2xl">
            {player.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <h2 className="text-white text-3xl font-black">{player.name}</h2>
        {stats?.bestGame && (
          <p className="text-zinc-400 text-sm mt-1">
            Best game: <span className="text-orange-400 font-semibold">{stats.bestGame.title}</span>
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border-2 border-zinc-100 rounded-2xl p-4 shadow-sm">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
            <Hash size={16} color="#f97316" strokeWidth={2.5} />
          </div>
          <p className="text-3xl font-black text-navy-500">{stats?.totalScore}</p>
          <p className="text-zinc-400 text-xs font-medium mt-0.5">Total Points</p>
        </div>

        <div className="bg-white border-2 border-zinc-100 rounded-2xl p-4 shadow-sm">
          <div className="w-8 h-8 bg-navy-100 rounded-lg flex items-center justify-center mb-2">
            <Activity size={16} color="#1E3A5F" strokeWidth={2.5} />
          </div>
          <p className="text-3xl font-black text-navy-500">{stats?.gamesPlayed}</p>
          <p className="text-zinc-400 text-xs font-medium mt-0.5">Games Played</p>
        </div>

        <div className="bg-white border-2 border-zinc-100 rounded-2xl p-4 shadow-sm">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
            <Trophy size={16} color="#d97706" strokeWidth={2.5} />
          </div>
          <p className="text-3xl font-black text-navy-500">{stats?.wins}</p>
          <p className="text-zinc-400 text-xs font-medium mt-0.5">Wins</p>
        </div>

        <div className="bg-white border-2 border-zinc-100 rounded-2xl p-4 shadow-sm">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-2">
            <Star size={16} color="#16a34a" strokeWidth={2.5} />
          </div>
          <p className="text-3xl font-black text-navy-500">{stats?.avgScore}</p>
          <p className="text-zinc-400 text-xs font-medium mt-0.5">Avg Score</p>
        </div>
      </div>

      {/* Game History */}
      <div>
        <h3 className="text-navy-500 font-bold text-lg mb-3">Game History</h3>
        {gameHistory.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-zinc-400 font-medium">No games yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {gameHistory.map((game) => (
              <div
                key={game.id}
                className="bg-white border-2 border-zinc-100 rounded-2xl p-4 shadow-sm flex items-center gap-4"
              >
                {/* Win/Loss indicator */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  game.isWinner ? 'bg-orange-500' : 'bg-zinc-100'
                }`}>
                  {game.isWinner
                    ? <Trophy size={16} color="white" strokeWidth={2.5} />
                    : <span className="text-zinc-400 font-black text-sm">{game.playerRank}</span>
                  }
                </div>

                <div className="flex-1">
                  <p className="text-navy-500 font-bold text-sm">{game.title}</p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    {game.rounds} rounds · Rank {game.playerRank}/{game.totalPlayers}
                  </p>
                </div>

                <div className="text-right">
                  <p className={`font-black text-lg ${
                    game.playerTotal >= 0 ? 'text-navy-500' : 'text-red-400'
                  }`}>
                    {game.playerTotal} pts
                  </p>
                  {game.isWinner && (
                    <p className="text-orange-500 text-xs font-semibold">Winner!</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PlayerProfile