import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import RoomDashboard from './pages/RoomDashboard'
import GameHistory from './pages/GameHistory'
import RecordGame from './pages/RecordGame'
import PlayerProfile from './pages/PlayerProfile'
import Players from './pages/Players'
import RoomLayout from './components/RoomLayout'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:code" element={
        <RoomLayout>
          <RoomDashboard />
        </RoomLayout>
      } />
      <Route path="/room/:code/games" element={
        <RoomLayout>
          <GameHistory />
        </RoomLayout>
      } />
      <Route path="/room/:code/record" element={
        <RoomLayout>
          <RecordGame />
        </RoomLayout>
      } />
      <Route path="/room/:code/players" element={
        <RoomLayout>
          <Players />
        </RoomLayout>
      } />
      <Route path="/room/:code/player/:id" element={
        <RoomLayout>
          <PlayerProfile />
        </RoomLayout>
      } />
    </Routes>
  )
}

export default App