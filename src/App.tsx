import { AnimatePresence } from 'framer-motion'
import { useGameStore } from './store/gameStore'
import { HUD } from './components/layout/HUD'
import { SplashScreen }    from './components/screens/SplashScreen'
import { MapScreen }       from './components/screens/MapScreen'
import { CollectScreen }   from './components/screens/CollectScreen'
import { LoadingScreen }   from './components/screens/LoadingScreen'
import { TransportScreen } from './components/screens/TransportScreen'
import { ResultScreen }    from './components/screens/ResultScreen'
import { ProfileScreen }   from './components/screens/ProfileScreen'
import { GarageScreen }    from './components/screens/GarageScreen'
import { GarageUnlockOverlay } from './components/garage/GarageUnlockOverlay'

export default function App() {
  const screen = useGameStore(s => s.screen)

  return (
    <div className="fixed inset-0 bg-surface-900 text-white font-sans select-none overflow-hidden">
      <HUD />

      <AnimatePresence mode="wait">
        {screen === 'splash'    && <SplashScreen    key="splash" />}
        {screen === 'map'       && <MapScreen        key="map" />}
        {screen === 'collect'   && <CollectScreen    key="collect" />}
        {screen === 'loading'   && <LoadingScreen    key="loading" />}
        {screen === 'delivery'  && <TransportScreen  key="delivery" />}
        {screen === 'result'    && <ResultScreen     key="result" />}
        {screen === 'profile'   && <ProfileScreen    key="profile" />}
        {screen === 'garage'    && <GarageScreen     key="garage" />}
      </AnimatePresence>

      <GarageUnlockOverlay />
    </div>
  )
}
