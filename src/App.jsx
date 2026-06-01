import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import RoomDashboard from './pages/RoomDashboard'
import GameHistory from './pages/GameHistory'
import RecordGame from './pages/RecordGame'
import PlayerProfile from './pages/PlayerProfile'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:code" element={<RoomDashboard />} />
      <Route path="/room/:code/games" element={<GameHistory />} />
      <Route path="/room/:code/record" element={<RecordGame />} />
      <Route path="/room/:code/player/:id" element={<PlayerProfile />} />
    </Routes>
  )
}

export default App