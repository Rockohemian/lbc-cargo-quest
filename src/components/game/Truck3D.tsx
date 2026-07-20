import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import type { EquippedParts } from '../../types'
import { ElectricTruck } from './truck/ElectricTruck'

type View = 'side' | 'front' | 'back'

interface Props {
  equipped: EquippedParts
  view?: View
  className?: string
  autoRotate?: boolean
}

/**
 * Neutral modern European electric tractor + trailer, rendered procedurally.
 * No external GLTF model is loaded; geometry is code-driven for mobile control.
 */
export function Truck3D({ equipped, view = 'side', className = '', autoRotate = true }: Props) {
  const camera = useMemo(() => {
    if (view === 'front') return { position: [0, 2.5, 15] as [number, number, number], fov: 29 }
    if (view === 'back') return { position: [0, 2.4, -15] as [number, number, number], fov: 29 }
    return { position: [12.5, 5.2, 14.8] as [number, number, number], fov: 31 }
  }, [view])

  return (
    <div className={className} style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#ffffff' }}>
      <Canvas shadows dpr={[1, 1.9]} camera={{ position: camera.position, fov: camera.fov }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[8, 10, 6]}
          intensity={1.15}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <directionalLight position={[-7, 5, -6]} intensity={0.26} color="#a4c2df" />

        <Suspense fallback={null}>
          <Environment preset="city" />
          <ElectricTruck equipped={equipped} autoRotate={autoRotate && view === 'side'} />
        </Suspense>

        <ContactShadows position={[0, -0.02, 0]} opacity={0.42} scale={18} blur={2.3} far={4.5} />
      </Canvas>
    </div>
  )
}
