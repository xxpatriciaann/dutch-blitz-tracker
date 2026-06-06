import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { ChevronRight, Check } from 'lucide-react'

function RecordGame() {
  const { code } = useParams()
  const navigate = useNavigate()

  // Game setup state
  const [step, setStep] = useState(1)
  const [players, setPlayers] = useState([])
  const [roomId, setRoomId] = useState(null)
  const [title, setTitle] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [multiplier, setMultiplier] = useState(2)
  const [error, setError] = useState('')

  // Game session state
  const [sessionId, setSessionId] = useState(null)
  const [rounds, setRounds] = useState([])
  const [currentRound, setCurrentRound] = useState(1)
  const [roundInputs, setRoundInputs] = useState({})
  const [roundScores, setRoundScores] = useState({})

  useEffect(() => {
    async function fetchData() {
      const { data: room } = await supabase
        .from('rooms')
        .select('id, score_multiplier')
        .eq('join_code', code)
        .single()

      if (!room) return
      setRoomId(room.id)
      setMultiplier(room.score_multiplier)

      const { data: playerList } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true })

      if (playerList) setPlayers(playerList)
    }
    fetchData()
  }, [code])

  function togglePlayer(playerId) {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    )
  }

  async function handleStartGame() {
    if (!title.trim()) {
      setError('Please enter a game title!')
      return
    }
    if (selectedPlayers.length < 2) {
      setError('Please select at least 2 players!')
      return
    }
    setError('')

    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert([{
        room_id: roomId,
        title: title.trim(),
        score_multiplier: multiplier,
        is_complete: false
      }])
      .select()
      .single()

    if (sessionError) {
      setError('Something went wrong. Please try again.')
      return
    }

    setSessionId(session.id)

    // Initialize round inputs for selected players
    const inputs = {}
    selectedPlayers.forEach((id) => {
      inputs[id] = { cards_placed: '', cards_remaining: '' }
    })
    setRoundInputs(inputs)

    // Initialize running totals
    const totals = {}
    selectedPlayers.forEach((id) => {
      totals[id] = 0
    })
    setRoundScores(totals)

    setStep(2)
  }

  function handleInputChange(playerId, field, value) {
    setRoundInputs((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value
      }
    }))
  }

  function computeRoundScore(placed, remaining) {
    return Number(placed) - Number(remaining) * multiplier
  }

  async function handleSaveRound() {
    // Validate all inputs are filled
    for (const playerId of selectedPlayers) {
      const input = roundInputs[playerId]
      if (input.cards_placed === '' || input.cards_remaining === '') {
        setError('Please fill in all scores before saving!')
        return
      }
    }
    setError('')

    // Create round in database
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .insert([{
        game_session_id: sessionId,
        round_number: currentRound
      }])
      .select()
      .single()

    if (roundError) {
      setError('Something went wrong saving the round.')
      return
    }

    // Save scores for each player
    const scoreInserts = selectedPlayers.map((playerId) => {
      const input = roundInputs[playerId]
      const score = computeRoundScore(input.cards_placed, input.cards_remaining)
      return {
        round_id: round.id,
        player_id: playerId,
        cards_placed: Number(input.cards_placed),
        cards_remaining: Number(input.cards_remaining),
        round_score: score
      }
    })

    const { error: scoresError } = await supabase
      .from('round_scores')
      .insert(scoreInserts)

    if (scoresError) {
      setError('Something went wrong saving the scores.')
      return
    }

    // Update running totals
    const newTotals = { ...roundScores }
    selectedPlayers.forEach((playerId) => {
      const input = roundInputs[playerId]
      newTotals[playerId] += computeRoundScore(input.cards_placed, input.cards_remaining)
    })
    setRoundScores(newTotals)

    // Save round summary for display
    const roundSummary = {
      round_number: currentRound,
      scores: {}
    }
    selectedPlayers.forEach((playerId) => {
      const input = roundInputs[playerId]
      roundSummary.scores[playerId] = computeRoundScore(input.cards_placed, input.cards_remaining)
    })
    setRounds((prev) => [...prev, roundSummary])

    // Reset inputs for next round
    const newInputs = {}
    selectedPlayers.forEach((id) => {
      newInputs[id] = { cards_placed: '', cards_remaining: '' }
    })
    setRoundInputs(newInputs)
    setCurrentRound((prev) => prev + 1)
  }

  async function handleFinishGame() {
    // Save any unsaved round first if inputs are filled
    const hasUnsavedData = selectedPlayers.some(
      (id) => roundInputs[id]?.cards_placed !== '' || roundInputs[id]?.cards_remaining !== ''
    )
    if (hasUnsavedData) {
      setError('Please save the current round first before finishing!')
      return
    }

    if (rounds.length === 0) {
      setError('Please record at least one round before finishing!')
      return
    }

    // Mark session as complete
    await supabase
      .from('game_sessions')
      .update({ is_complete: true })
      .eq('id', sessionId)

    setStep(3)
  }

  // Get winner
  function getWinner() {
    let winnerId = null
    let highestScore = -Infinity
    selectedPlayers.forEach((id) => {
      if (roundScores[id] > highestScore) {
        highestScore = roundScores[id]
        winnerId = id
      }
    })
    return winnerId
  }

  function getPlayerName(id) {
    return players.find((p) => p.id === id)?.name || 'Unknown'
  }

  // ─── STEP 1: Game Setup ───────────────────────────────────────
  if (step === 1) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-black text-navy-500">New Game</h2>
          <p className="text-zinc-400 text-sm mt-1">Set up your game session</p>
        </div>

        {/* Game Title */}
        <div className="bg-white border-2 border-zinc-100 rounded-2xl p-5 mb-4 shadow-sm">
          <label className="block text-navy-500 font-bold mb-2">Game Title</label>
          <input
            type="text"
            placeholder="e.g. Family Reunion 2025"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-50 border-2 border-zinc-100 text-navy-500 placeholder-zinc-400 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-400 transition font-medium"
          />
        </div>

        {/* Score Multiplier */}
        <div className="bg-white border-2 border-zinc-100 rounded-2xl p-5 mb-4 shadow-sm">
          <label className="block text-navy-500 font-bold mb-1">Blitz Pile Penalty</label>
          <p className="text-zinc-400 text-xs mb-3">Cards remaining in Blitz pile will be multiplied by this</p>
          <div className="flex gap-2">
            {[1, 2].map((val) => (
              <button
                key={val}
                onClick={() => setMultiplier(val)}
                className={`flex-1 py-3 rounded-xl font-black text-lg border-2 transition ${
                  multiplier === val
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:border-orange-300'
                }`}
              >
                ×{val}
              </button>
            ))}
          </div>
        </div>

        {/* Select Players */}
        <div className="bg-white border-2 border-zinc-100 rounded-2xl p-5 mb-6 shadow-sm">
          <label className="block text-navy-500 font-bold mb-1">Select Players</label>
          <p className="text-zinc-400 text-xs mb-3">Choose who's playing this game</p>
          <div className="flex flex-col gap-2">
            {players.map((player) => {
              const isSelected = selectedPlayers.includes(player.id)
              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                    isSelected
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-zinc-100 bg-zinc-50 hover:border-zinc-200'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${
                    isSelected ? 'bg-orange-500 border-orange-500' : 'border-zinc-300'
                  }`}>
                    {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                  </div>
                  <span className={`font-semibold ${isSelected ? 'text-navy-500' : 'text-zinc-400'}`}>
                    {player.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 text-sm text-center font-medium">{error}</p>
          </div>
        )}

        <button
          onClick={handleStartGame}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
        >
          Start Game
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    )
  }

  // ─── STEP 2: Round Scoring ────────────────────────────────────
  if (step === 2) {
    return (
      <div>
        <div className="mb-6">
          <p className="text-orange-500 text-sm font-semibold tracking-widest uppercase">
            {title}
          </p>
          <h2 className="text-2xl font-black text-navy-500">Round {currentRound}</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Score = Cards Placed − (Cards Remaining × {multiplier})
          </p>
        </div>

        {/* Round inputs */}
        <div className="flex flex-col gap-3 mb-6">
          {selectedPlayers.map((playerId) => {
            const input = roundInputs[playerId] || { cards_placed: '', cards_remaining: '' }
            const hasInputs = input.cards_placed !== '' && input.cards_remaining !== ''
            const preview = hasInputs
              ? computeRoundScore(input.cards_placed, input.cards_remaining)
              : null

            return (
              <div
                key={playerId}
                className="bg-white border-2 border-zinc-100 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-navy-500 font-bold">{getPlayerName(playerId)}</span>
                  {preview !== null && (
                    <span className={`font-black text-lg ${preview >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                      {preview > 0 ? '+' : ''}{preview} pts
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1">
                      Cards Placed
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={input.cards_placed}
                      onChange={(e) => handleInputChange(playerId, 'cards_placed', e.target.value)}
                      className="w-full bg-zinc-50 border-2 border-zinc-100 text-navy-500 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400 transition font-bold text-center text-lg"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1">
                      Cards Remaining
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={input.cards_remaining}
                      onChange={(e) => handleInputChange(playerId, 'cards_remaining', e.target.value)}
                      className="w-full bg-zinc-50 border-2 border-zinc-100 text-navy-500 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400 transition font-bold text-center text-lg"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Running totals */}
        {rounds.length > 0 && (
          <div className="bg-navy-500 rounded-2xl p-4 mb-6">
            <p className="text-white font-bold text-sm mb-3">Running Totals</p>
            <div className="flex flex-col gap-2">
              {selectedPlayers
                .slice()
                .sort((a, b) => roundScores[b] - roundScores[a])
                .map((playerId) => (
                  <div key={playerId} className="flex items-center justify-between">
                    <span className="text-zinc-300 text-sm font-medium">
                      {getPlayerName(playerId)}
                    </span>
                    <span className="text-white font-black">
                      {roundScores[playerId]} pts
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 text-sm text-center font-medium">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSaveRound}
            className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl transition"
          >
            Save Round {currentRound}
          </button>
          <button
            onClick={handleFinishGame}
            className="flex-1 bg-navy-500 hover:bg-navy-600 text-white font-bold py-3 rounded-xl transition"
          >
            Finish Game
          </button>
        </div>
      </div>
    )
  }

  // ─── STEP 3: Game Summary ─────────────────────────────────────
  if (step === 3) {
    const winnerId = getWinner()
    const sortedPlayers = selectedPlayers
      .slice()
      .sort((a, b) => roundScores[b] - roundScores[a])

    return (
      <div>
        <div className="text-center mb-8">
          <p className="text-orange-500 text-sm font-semibold tracking-widest uppercase mb-2">
            Game Complete
          </p>
          <h2 className="text-3xl font-black text-navy-500">{title}</h2>
          <p className="text-zinc-400 text-sm mt-1">{rounds.length} rounds played</p>
        </div>

        {/* Winner */}
        <div className="bg-orange-500 rounded-2xl p-6 mb-6 text-center">
          <p className="text-orange-100 text-sm font-semibold uppercase tracking-widest mb-1">
            Winner
          </p>
          <p className="text-white text-4xl font-black">{getPlayerName(winnerId)}</p>
          <p className="text-orange-100 text-lg font-bold mt-1">
            {roundScores[winnerId]} points
          </p>
        </div>

        {/* Final Standings */}
        <div className="flex flex-col gap-2 mb-6">
          {sortedPlayers.map((playerId, index) => (
            <div
              key={playerId}
              className="bg-white border-2 border-zinc-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                index === 0 ? 'bg-orange-500 text-white' :
                index === 1 ? 'bg-zinc-200 text-zinc-600' :
                index === 2 ? 'bg-amber-100 text-amber-600' :
                'bg-zinc-100 text-zinc-400'
              }`}>
                {index + 1}
              </div>
              <span className="flex-1 text-navy-500 font-bold">{getPlayerName(playerId)}</span>
              <span className="text-navy-500 font-black text-lg">{roundScores[playerId]} pts</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate(`/room/${code}`)}
          className="w-full bg-navy-500 hover:bg-navy-600 text-white font-bold py-3 rounded-xl transition"
        >
          Back to Leaderboard
        </button>
      </div>
    )
  }
}

export default RecordGame