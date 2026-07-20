import { AnimatePresence } from 'framer-motion'
import { useGameStore } from './store/gameStore'
import { HUD } from './components/layout/HUD'
import { SplashScreen }       from './components/screens/SplashScreen'
import { MapScreen }          from './components/screens/MapScreen'
import { CollectScreen }      from './components/screens/CollectScreen'
import { LoadingScreen }      from './components/screens/LoadingScreen'
import { TransportScreen }    from './components/screens/TransportScreen'
import { ResultScreen }       from './components/screens/ResultScreen'
import { ProfileScreen }      from './components/screens/ProfileScreen'
import { GarageScreen }       from './components/screens/GarageScreen'
import { LeaderboardScreen }  from './components/screens/LeaderboardScreen'
import { AdminScreen }        from './components/screens/AdminScreen'
import { DevConsoleScreen }   from './components/screens/DevConsoleScreen'
import { GarageUnlockOverlay } from './components/garage/GarageUnlockOverlay'

export default function App() {
  const screen = useGameStore(s => s.screen)

  return (
    // Yttersta lagret: mörk letterbox på desktop
    <div className="fixed inset-0 bg-black text-white font-sans select-none overflow-hidden flex items-stretch justify-center">
      {/*
        Mobil-ram. `transform` gör att alla `fixed inset-0` inuti begränsas till
        denna ruta i stället för hela viewport-fönstret — det är en officiell
        CSS-spec-beteende (transformed ancestors blir containing block för
        fixed children). Så vi slipper röra 14 skärmars layout.
      */}
      <div
        className="relative w-full max-w-md app-shell-height bg-surface-900 overflow-hidden"
        style={{
          height: 'var(--app-viewport-h)',
          transform: 'translateZ(0)',
          boxShadow: '0 0 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        <HUD />

        <AnimatePresence mode="wait">
          {screen === 'splash'      && <SplashScreen      key="splash" />}
          {screen === 'map'          && <MapScreen          key="map" />}
          {screen === 'collect'      && <CollectScreen      key="collect" />}
          {screen === 'loading'      && <LoadingScreen      key="loading" />}
          {screen === 'delivery'     && <TransportScreen    key="delivery" />}
          {screen === 'result'       && <ResultScreen       key="result" />}
          {screen === 'profile'      && <ProfileScreen      key="profile" />}
          {screen === 'garage'       && <GarageScreen       key="garage" />}
          {screen === 'leaderboard'  && <LeaderboardScreen  key="leaderboard" />}
          {screen === 'admin'        && <AdminScreen        key="admin" />}
          {screen === 'dev'          && <DevConsoleScreen   key="dev" />}
        </AnimatePresence>

        <GarageUnlockOverlay />
      </div>
    </div>
  )
}
