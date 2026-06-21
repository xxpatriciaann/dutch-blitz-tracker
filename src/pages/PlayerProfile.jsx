import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { Trophy, Star, Activity, Hash, Medal, Info } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function PlayerProfile() {
  const { code, id } = useParams()
  const [player, setPlayer] = useState(null)
  const [stats, setStats] = useState(null)
  const [gameHistory, setGameHistory] = useState([])
  const [badges, setBadges] = useState([])
  const [activeBadgeInfo, setActiveBadgeInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  function computeBadges(stats, gameHistory, allScores) {
    const badges = []

    if (stats.wins >= 1) badges.push({ emoji: '🥇', name: 'First Win', desc: 'Finally!', condition: 'Win your first game' })
    if (stats.wins >= 3) badges.push({ emoji: '🔥', name: 'Hat Trick', desc: 'Getting dangerous', condition: 'Win 3 games' })
    if (stats.wins >= 5) badges.push({ emoji: '👑', name: 'Dominator', desc: 'Someone stop them', condition: 'Win 5 games' })
    if (stats.wins >= 10) badges.push({ emoji: '🐉', name: 'Family Tyrant', desc: 'Touch grass please', condition: 'Win 10 games' })
    if (stats.maxConsecutiveWins >= 3) badges.push({ emoji: '📿', name: 'Win Streak', desc: "They can't stop you", condition: 'Win 3 games in a row' })

    const bestGameScore = gameHistory.length > 0
      ? gameHistory.reduce((max, g) => Math.max(max, g.playerTotal), -Infinity)
      : 0
    if (bestGameScore >= 50) badges.push({ emoji: '📈', name: 'High Scorer', desc: 'Okay sige na', condition: 'Score 50+ in a single game' })
    if (stats.centuryGameTitle) badges.push({ emoji: '🎯', name: 'Century', desc: 'Absolutely unhinged', condition: 'Score 100+ in a single game', game: stats.centuryGameTitle })
    if (stats.volcanicGameTitle) badges.push({ emoji: '🌋', name: 'Volcanic', desc: 'Chaos energy', condition: 'Score 30+ in a single round', game: stats.volcanicGameTitle })
    if (stats.blitzSurvivorGameTitle) badges.push({ emoji: '💀', name: 'Blitz Survivor', desc: 'At least you tried', condition: 'Finish a game with negative total score', game: stats.blitzSurvivorGameTitle })

    let consecutiveNegative = 0
    let maxConsecutive = 0
    allScores.forEach((s) => {
      if (s.round_score < 0) {
        consecutiveNegative++
        maxConsecutive = Math.max(maxConsecutive, consecutiveNegative)
      } else {
        consecutiveNegative = 0
      }
    })
    if (maxConsecutive >= 3) badges.push({ emoji: '🧊', name: 'Ice Cold', desc: 'Are you okay?', condition: 'Negative score 3 rounds in a row' })
    if (stats.hasRockBottomGame) badges.push({ emoji: '🩹', name: 'Rock Bottom', desc: 'It can only go up from here', condition: 'Score -20 or worse in a single round', game: stats.rockBottomGameTitle })

    if (stats.hasSpeedrunGame) badges.push({ emoji: '⚡', name: 'Speedrunner', desc: 'How?!', condition: 'End a round with 0 cards in Blitz pile', game: stats.speedrunGameTitle })
    if (stats.hasCardHoarderGame) badges.push({ emoji: '🃏', name: 'Card Hoarder', desc: 'Bro what are you doing', condition: 'End a round with 20+ cards in Blitz pile', game: stats.hoarderGameTitle })

    let hasFrozenPile = false
    let prevRemaining = null
    allScores.forEach((s) => {
      if (prevRemaining !== null && s.cards_remaining === prevRemaining) {
        hasFrozenPile = true
      }
      prevRemaining = s.cards_remaining
    })
    if (hasFrozenPile) badges.push({ emoji: '🧱', name: 'Frozen Pile', desc: 'The cards have given up', condition: 'Same cards remaining 2 rounds in a row' })

    if (stats.hasGenerousLoser) badges.push({ emoji: '🫳', name: 'Generous Loser', desc: 'Sharing is caring, I guess', condition: 'Place 0 cards in a round', game: stats.generousLoserGameTitle })

    if (stats.gamesPlayed >= 10) badges.push({ emoji: '🎮', name: 'Veteran', desc: 'Needs a life', condition: 'Play 10+ games' })
    if (stats.gamesPlayed >= 25) badges.push({ emoji: '📅', name: 'Regular', desc: 'Same time next week?', condition: 'Play 25+ games' })
    if (stats.gamesPlayed >= 5 && stats.wins === 0) badges.push({ emoji: '🤝', name: 'Participation Award', desc: 'We love you anyway', condition: 'Play 5+ games without winning any' })

    const lastPlaceCount = gameHistory.filter((g) => g.playerRank === g.totalPlayers).length
    if (lastPlaceCount >= 3) badges.push({ emoji: '😤', name: 'Sore Loser', desc: "It's not you, it's the cards", condition: 'Place last in 3+ games' })

    const comebackGames = gameHistory.filter((g) => g.playerRank <= 2 && g.totalPlayers >= 3).length
    if (comebackGames >= 2 && lastPlaceCount >= 1) badges.push({ emoji: '🎰', name: 'Comeback Kid', desc: 'Never count them out', condition: 'Place last once but top 2 in 2+ other games' })

    if (lastPlaceCount >= 5) badges.push({ emoji: '🪦', name: 'Cursed', desc: 'Maybe try a different game', condition: 'Place last in 5+ games' })

    if (gameHistory.length >= 5) {
      const scores = gameHistory.map((g) => g.playerTotal)
      const range = Math.max(...scores) - Math.min(...scores)
      if (range <= 10) badges.push({ emoji: '⚖️', name: 'Mr. Consistent', desc: 'Reliably mid', condition: '5+ games with scores within 10 pts of each other' })
      if (range >= 80) badges.push({ emoji: '🎢', name: 'Rollercoaster', desc: 'Pick a lane', condition: 'Best and worst game differ by 80+ points' })
    }

    if (stats.hasArchNemesis) badges.push({ emoji: '🥊', name: 'Arch Nemesis', desc: "It's personal now", condition: 'Play 5+ games against the same rival' })
    if (stats.hasGiantKiller) badges.push({ emoji: '🫠', name: 'Giant Killer', desc: 'David vs Goliath', condition: 'Beat the all-time #1 leaderboard player', game: stats.giantKillerGameTitle })
    if (stats.gamesPlayed >= 1) badges.push({ emoji: '🐣', name: 'Rookie No More', desc: 'Welcome to the family table', condition: 'Play your 1st recorded game' })
    if (stats.isOGPlayer) badges.push({ emoji: '🕰️', name: 'OG Player', desc: 'Here since day one', condition: 'Played in the very first recorded game in the room' })

    if (stats.hasMirrorMatch) badges.push({ emoji: '🪞', name: 'Mirror Match', desc: "A tie this close shouldn't exist", condition: 'Finish a game tied for 1st place', game: stats.mirrorMatchGameTitle })
    if (stats.hasSlowAndSteadyWin) badges.push({ emoji: '🪜', name: 'Slow and Steady', desc: 'No drama, just wins', condition: 'Win a game without any round score below 0', game: stats.slowSteadyGameTitle })
    if (stats.hasFullHouse) badges.push({ emoji: '🏟️', name: 'Full House', desc: 'The whole family showed up', condition: 'Play in a game with 5+ other players', game: stats.fullHouseGameTitle })

    return badges
  }

  useEffect(() => {
    async function fetchProfile() {
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single()

      if (!playerData) return
      setPlayer(playerData)

      const { data: allScores } = await supabase
        .from('round_scores')
        .select('*, rounds(id, round_number, game_session_id)')
        .eq('player_id', id)

      if (!allScores || allScores.length === 0) {
        setStats({ totalScore: 0, gamesPlayed: 0, wins: 0, avgScore: 0, bestGame: null })
        setBadges(computeBadges({ totalScore: 0, gamesPlayed: 0, wins: 0, avgScore: 0, bestGame: null }, [], []))
        setLoading(false)
        return
      }

      const sessionIds = [...new Set(allScores.map((s) => s.rounds.game_session_id))]

      const { data: sessions } = await supabase
        .from('game_sessions')
        .select('*')
        .in('id', sessionIds)
        .eq('is_complete', true)
        .order('created_at', { ascending: false })

      const { data: roomData } = await supabase
        .from('rooms')
        .select('id')
        .eq('join_code', code)
        .single()

      let firstSessionEverId = null
      if (roomData) {
        const { data: allRoomSessions } = await supabase
          .from('game_sessions')
          .select('id, created_at')
          .eq('room_id', roomData.id)
          .eq('is_complete', true)
          .order('created_at', { ascending: true })
          .limit(1)

        if (allRoomSessions && allRoomSessions.length > 0) {
          firstSessionEverId = allRoomSessions[0].id
        }
      }

      if (!sessions || sessions.length === 0) {
        setStats({ totalScore: 0, gamesPlayed: 0, wins: 0, avgScore: 0, bestGame: null })
        setBadges(computeBadges({ totalScore: 0, gamesPlayed: 0, wins: 0, avgScore: 0, bestGame: null }, [], allScores))
        setLoading(false)
        return
      }

      let totalScore = 0
      let wins = 0
      let bestGame = null
      let bestGameScore = -Infinity
      const historyList = []

      let isOGPlayer = false
      let hasMirrorMatch = false
      let hasFullHouse = false
      let hasGenerousLoser = false
      let hasSpeedrunGame = false
      let hasCardHoarderGame = false
      let hasRockBottomGame = false
      let hasSlowAndSteadyWin = false
      let centuryGameTitle = null
      let volcanicGameTitle = null
      let blitzSurvivorGameTitle = null
      let speedrunGameTitle = null
      let hoarderGameTitle = null
      let rockBottomGameTitle = null
      let mirrorMatchGameTitle = null
      let slowSteadyGameTitle = null
      let fullHouseGameTitle = null
      let generousLoserGameTitle = null
      let giantKillerGameTitle = null
      let consecutiveWins = 0
      let maxConsecutiveWins = 0

      for (const session of sessions) {
        const { data: sessionRounds } = await supabase
          .from('rounds')
          .select('id, round_number')
          .eq('game_session_id', session.id)
          .order('round_number', { ascending: true })

        if (!sessionRounds) continue
        const sessionRoundIds = sessionRounds.map((r) => r.id)

        const { data: sessionScores } = await supabase
          .from('round_scores')
          .select('*, players(name, color)')
          .in('round_id', sessionRoundIds)

        if (!sessionScores) continue

        const playerScores = sessionScores.filter((s) => s.player_id === id)
        const playerTotal = playerScores.reduce((sum, s) => sum + s.round_score, 0)
        totalScore += playerTotal

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

        const didWin = winnerId === id
        if (didWin) {
          wins++
          consecutiveWins++
          maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins)
        } else {
          consecutiveWins = 0
        }

        if (playerTotal > bestGameScore) {
          bestGameScore = playerTotal
          bestGame = { title: session.title, score: playerTotal }
        }

        const standings = Object.entries(playerTotals)
          .map(([pId, total]) => ({
            id: pId,
            name: sessionScores.find((s) => s.player_id === pId)?.players?.name || 'Unknown',
            total
          }))
          .sort((a, b) => b.total - a.total)

        const playerRank = standings.findIndex((s) => s.id === id) + 1
        const totalPlayersInGame = standings.length

        if (session.id === firstSessionEverId) {
          isOGPlayer = true
        }

        if (totalPlayersInGame >= 6) {
          hasFullHouse = true
          fullHouseGameTitle = session.title
        }

        const topScore = standings[0].total
        const tiedForFirst = standings.filter((s) => s.total === topScore).length > 1
        if (tiedForFirst && playerRank === 1) {
          hasMirrorMatch = true
          mirrorMatchGameTitle = session.title
        }

        if (playerTotal >= 100) {
          centuryGameTitle = session.title
        }

        let allRoundsPositiveForWin = true

        for (const round of sessionRounds) {
          const roundScore = playerScores.find((s) => s.round_id === round.id)
          if (!roundScore) continue

          if (roundScore.round_score >= 30) {
            volcanicGameTitle = session.title
          }

          if (roundScore.round_score <= -20) {
            hasRockBottomGame = true
            rockBottomGameTitle = session.title
          }

          if (roundScore.cards_remaining === 0 && roundScore.cards_placed > 0) {
            hasSpeedrunGame = true
            speedrunGameTitle = session.title
          }

          if (roundScore.cards_remaining >= 20) {
            hasCardHoarderGame = true
            hoarderGameTitle = session.title
          }

          if (roundScore.cards_placed === 0) {
            hasGenerousLoser = true
            generousLoserGameTitle = session.title
          }

          if (roundScore.round_score < 0) {
            allRoundsPositiveForWin = false
          }
        }

        if (didWin && allRoundsPositiveForWin) {
          hasSlowAndSteadyWin = true
          slowSteadyGameTitle = session.title
        }

        if (playerTotal < 0 && !blitzSurvivorGameTitle) {
          blitzSurvivorGameTitle = session.title
        }

        historyList.push({
          id: session.id,
          title: session.title,
          date: session.created_at,
          playerTotal,
          playerRank,
          totalPlayers: totalPlayersInGame,
          isWinner: didWin,
          rounds: sessionRounds.length,
          opponentIds: Object.keys(playerTotals).filter((pId) => pId !== id)
        })
      }

      const opponentCounts = {}
      historyList.forEach((game) => {
        game.opponentIds.forEach((oppId) => {
          opponentCounts[oppId] = (opponentCounts[oppId] || 0) + 1
        })
      })
      const hasArchNemesis = Object.values(opponentCounts).some((count) => count >= 5)

      const { data: allPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', roomData.id)

      let hasGiantKiller = false
      if (allPlayers && allPlayers.length > 1) {
        const { data: allRoomSessions } = await supabase
          .from('game_sessions')
          .select('id')
          .eq('room_id', roomData.id)
          .eq('is_complete', true)

        const allRoomSessionIds = allRoomSessions ? allRoomSessions.map((s) => s.id) : []

        if (allRoomSessionIds.length > 0) {
          const { data: allRoomRounds } = await supabase
            .from('rounds')
            .select('id')
            .in('game_session_id', allRoomSessionIds)

          const allRoomRoundIds = allRoomRounds ? allRoomRounds.map((r) => r.id) : []

          if (allRoomRoundIds.length > 0) {
            const { data: allRoomScores } = await supabase
              .from('round_scores')
              .select('player_id, round_score')
              .in('round_id', allRoomRoundIds)

            const allTimeTotals = {}
            if (allRoomScores) {
              allRoomScores.forEach((s) => {
                allTimeTotals[s.player_id] = (allTimeTotals[s.player_id] || 0) + s.round_score
              })
            }

            let topPlayerId = null
            let topScore = -Infinity
            Object.entries(allTimeTotals).forEach(([pId, score]) => {
              if (pId !== id && score > topScore) {
                topScore = score
                topPlayerId = pId
              }
            })

            if (topPlayerId) {
              for (const session of sessions) {
                const { data: sessionRounds } = await supabase
                  .from('rounds')
                  .select('id')
                  .eq('game_session_id', session.id)

                if (!sessionRounds) continue
                const roundIds = sessionRounds.map((r) => r.id)

                const { data: scores } = await supabase
                  .from('round_scores')
                  .select('player_id, round_score')
                  .in('round_id', roundIds)

                if (!scores) continue

                const totals = {}
                scores.forEach((s) => {
                  totals[s.player_id] = (totals[s.player_id] || 0) + s.round_score
                })

                if (totals[id] !== undefined && totals[topPlayerId] !== undefined) {
                  if (totals[id] > totals[topPlayerId]) {
                    hasGiantKiller = true
                    giantKillerGameTitle = session.title
                    break
                  }
                }
              }
            }
          }
        }
      }

      const finalStats = {
        totalScore,
        gamesPlayed: sessions.length,
        wins,
        avgScore: sessions.length > 0 ? Math.round(totalScore / sessions.length) : 0,
        bestGame,
        maxConsecutiveWins,
        isOGPlayer,
        hasFullHouse,
        fullHouseGameTitle,
        hasMirrorMatch,
        mirrorMatchGameTitle,
        centuryGameTitle,
        volcanicGameTitle,
        hasRockBottomGame,
        rockBottomGameTitle,
        hasSpeedrunGame,
        speedrunGameTitle,
        hasCardHoarderGame,
        hoarderGameTitle,
        hasGenerousLoser,
        generousLoserGameTitle,
        hasSlowAndSteadyWin,
        slowSteadyGameTitle,
        blitzSurvivorGameTitle,
        hasArchNemesis,
        hasGiantKiller,
        giantKillerGameTitle
      }

      setStats(finalStats)
      setGameHistory(historyList)
      setBadges(computeBadges(finalStats, historyList, allScores))
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

      <div className="bg-navy-500 rounded-2xl p-6 mb-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{ backgroundColor: player.color || '#f97316' }}
        >
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

      {badges.length > 0 && (
        <div className="bg-white border-2 border-zinc-100 rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Medal size={18} color="#1E3A5F" strokeWidth={2.5} />
            <h3 className="text-navy-500 font-bold text-lg">Achievements</h3>
            <span className="text-zinc-400 text-xs font-medium ml-auto">{badges.length} earned</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {badges.map((badge, index) => (
              <button
                key={index}
                onClick={() => setActiveBadgeInfo(activeBadgeInfo === index ? null : index)}
                className="bg-zinc-50 border-2 border-zinc-100 hover:border-orange-300 rounded-xl p-3 flex items-start gap-3 transition text-left relative"
              >
                <span className="text-2xl">{badge.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-navy-500 font-bold text-sm leading-tight">{badge.name}</p>
                    <Info size={11} color="#a1a1aa" strokeWidth={2.5} />
                  </div>
                  <p className="text-zinc-400 text-xs mt-0.5">{badge.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {activeBadgeInfo !== null && (
            <div className="mt-3 bg-navy-500 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{badges[activeBadgeInfo].emoji}</span>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">{badges[activeBadgeInfo].name}</p>
                  <p className="text-zinc-300 text-xs mt-1">{badges[activeBadgeInfo].condition}</p>
                  {badges[activeBadgeInfo].game && (
                    <p className="text-orange-400 text-xs font-semibold mt-1">
                      Earned in: {badges[activeBadgeInfo].game}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {gameHistory.length > 1 && (
        <div className="bg-white border-2 border-zinc-100 rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="text-navy-500 font-bold text-lg mb-1">Score Over Time</h3>
          <p className="text-zinc-400 text-xs mb-4">Performance across all games</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={[...gameHistory].reverse().map((game, index) => ({
                game: `G${index + 1}`,
                score: game.playerTotal,
                title: game.title
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="game" tick={{ fontSize: 12, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1E3A5F', border: 'none', borderRadius: '12px', color: 'white', fontSize: '12px' }}
                formatter={(value, name, props) => [`${value} pts`, props.payload.title]}
                labelStyle={{ color: '#f97316' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={{ fill: '#f97316', strokeWidth: 0, r: 4 }}
                activeDot={{ fill: '#1E3A5F', strokeWidth: 2, stroke: '#f97316', r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

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
                  <p className={`font-black text-lg ${game.playerTotal >= 0 ? 'text-navy-500' : 'text-red-400'}`}>
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