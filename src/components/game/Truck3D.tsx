import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, ContactShadows, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { EquippedParts, PartCategory, TruckPart } from '../../types'
import { PART_BY_ID, PART_RARITY_COLORS } from '../../data/garageParts'

type View = 'side' | 'front' | 'back'

interface Props {
  equipped: EquippedParts
  view?: View
  className?: string
  autoRotate?: boolean
}

/**
 * LBC 24-meters ekipage renderad i Three.js — procedural dragbil + trailer.
 * Riktig LBC-logga på trailer-sidan som texture.
 */
export function Truck3D({ equipped, view = 'side', className = '', autoRotate = true }: Props) {
  const camera = useMemo(() => {
    if (view === 'front') return { position: [0, 2.2, 14] as [number, number, number], fov: 30 }
    if (view === 'back') return { position: [0, 2.2, -14] as [number, number, number], fov: 30 }
    return { position: [11, 5, 14] as [number, number, number], fov: 32 }
  }, [view])

  return (
    <div className={className} style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#ffffff' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: camera.position, fov: camera.fov }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Ljus */}
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[6, 10, 5]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#a8d0ff" />

        <Suspense fallback={null}>
          <Environment preset="city" />
          <TruckScene equipped={equipped} autoRotate={autoRotate && view === 'side'} />
        </Suspense>

        {/* Asfalt-skugga */}
        <ContactShadows position={[0, -0.02, 0]} opacity={0.5} scale={16} blur={2.4} far={4} />
      </Canvas>
    </div>
  )
}

// ─── Scene ──────────────────────────────────────────────────────
function TruckScene({ equipped, autoRotate }: { equipped: EquippedParts; autoRotate: boolean }) {
  const group = useRef<THREE.Group>(null)

  useFrame((_state, delta) => {
    if (autoRotate && group.current) group.current.rotation.y += delta * 0.25
  })

  const part = (c: PartCategory): TruckPart | undefined =>
    equipped[c] ? PART_BY_ID[equipped[c]!] : undefined
  const accent = (c: PartCategory, fallback: string): string => {
    const p = part(c)
    return p ? PART_RARITY_COLORS[p.rarity] : fallback
  }
  const isLegendary = (c: PartCategory) => part(c)?.rarity === 'legendary'

  const sideColor = accent('side', '#00843e')
  const frontColor = accent('front', '#26302b')
  const roofColor = accent('roof', '#c98a00')
  const wheelRim = accent('wheels', '#8a9299')

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* ═════ TRAILER ═════ */}
      <TrailerBody sideColor={sideColor} />

      {/* Trailer chassiram */}
      <mesh position={[-1.4, 0.4, 0]} castShadow>
        <boxGeometry args={[6.8, 0.14, 2.2]} />
        <meshStandardMaterial color="#111" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Trailer-hjul (2 axlar, 1 hjul per sida) */}
      {[-3.2, -2.2].map(x => (
        <group key={x} position={[x, 0.35, 0]}>
          <Wheel side="left" rim={wheelRim} />
          <Wheel side="right" rim={wheelRim} />
        </group>
      ))}

      {/* Bakljus */}
      <mesh position={[-4.9, 1.3, 1.05]}>
        <boxGeometry args={[0.05, 0.5, 0.35]} />
        <meshStandardMaterial color="#c93820" emissive="#c93820" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[-4.9, 1.3, -1.05]}>
        <boxGeometry args={[0.05, 0.5, 0.35]} />
        <meshStandardMaterial color="#c93820" emissive="#c93820" emissiveIntensity={0.45} />
      </mesh>
      {/* Registreringsskylt */}
      <mesh position={[-4.9, 0.85, 0]}>
        <boxGeometry args={[0.02, 0.24, 0.9]} />
        <meshStandardMaterial color="#f4d64a" />
      </mesh>

      {/* ═════ DRAGBIL (framänden, x>2) ═════ */}
      <TractorBody />

      {/* ─── Framruta ─── Vertikal glasruta på hyttens framsida (x=4.005), lätt tiltad bakåt */}
      <group position={[4.005, 2.45, 0]} rotation={[0, Math.PI / 2, -0.18]}>
        {/* Svart ram runt rutan */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1.85, 0.7]} />
          <meshStandardMaterial color="#0a0a0a" side={THREE.DoubleSide} />
        </mesh>
        {/* Själva glaset */}
        <mesh position={[0, 0, 0.003]}>
          <planeGeometry args={[1.65, 0.5]} />
          <meshPhysicalMaterial
            color="#3a5f7a"
            metalness={0.15}
            roughness={0.05}
            transmission={0.45}
            thickness={0.3}
            clearcoat={1}
            clearcoatRoughness={0.02}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Mittstolpe (vertikal) */}
        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[0.035, 0.5]} />
          <meshStandardMaterial color="#0a0a0a" side={THREE.DoubleSide} />
        </mesh>
        {/* Vindrutetorkare (två små svarta streck) */}
        <mesh position={[-0.4, -0.22, 0.008]} rotation={[0, 0, 0.5]}>
          <planeGeometry args={[0.35, 0.02]} />
          <meshStandardMaterial color="#0a0a0a" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.4, -0.22, 0.008]} rotation={[0, 0, 0.5]}>
          <planeGeometry args={[0.35, 0.02]} />
          <meshStandardMaterial color="#0a0a0a" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Solskydd (roof-part) */}
      {part('roof') && (
        <mesh position={[3.55, 3.05, 0]} castShadow>
          <boxGeometry args={[0.4, 0.08, 1.95]} />
          <meshStandardMaterial color={roofColor} metalness={0.4} roughness={0.4} />
        </mesh>
      )}

      {/* Kylargrill */}
      <mesh position={[4.31, 1.55, 0]}>
        <boxGeometry args={[0.04, 0.9, 1.65]} />
        <meshStandardMaterial color="#131614" metalness={0.6} roughness={0.5} />
      </mesh>

      {/* LBC-emblem på grillen (grön färg) */}
      <mesh position={[4.335, 1.85, 0]}>
        <boxGeometry args={[0.01, 0.18, 0.5]} />
        <meshStandardMaterial color="#00843e" emissive="#00843e" emissiveIntensity={0.25} />
      </mesh>

      {/* Strålkastare */}
      <mesh position={[4.32, 1.0, 0.7]}>
        <boxGeometry args={[0.03, 0.28, 0.5]} />
        <meshStandardMaterial color="#fff8d0" emissive="#fff8d0" emissiveIntensity={isLegendary('front') ? 1.4 : 0.5} />
      </mesh>
      <mesh position={[4.32, 1.0, -0.7]}>
        <boxGeometry args={[0.03, 0.28, 0.5]} />
        <meshStandardMaterial color="#fff8d0" emissive="#fff8d0" emissiveIntensity={isLegendary('front') ? 1.4 : 0.5} />
      </mesh>

      {/* Frontstötfångare */}
      <mesh position={[4.3, 0.65, 0]} castShadow>
        <boxGeometry args={[0.28, 0.35, 1.95]} />
        <meshStandardMaterial color={part('front') ? frontColor : '#2a2f2c'} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Dragbil-hjul (1 framaxel med 1 hjul på vardera sida) */}
      {[3.7].map(x => (
        <group key={x} position={[x, 0.35, 0]}>
          <Wheel side="left" rim={wheelRim} />
          <Wheel side="right" rim={wheelRim} />
        </group>
      ))}

      {/* Vitt "showroom"-golv för skuggmottagning */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
    </group>
  )
}

// ─── Trailer body med LBC-logga som texture ─────────────────────
function TrailerBody({ sideColor }: { sideColor: string }) {
  const logo = useTexture(import.meta.env.BASE_URL + 'assets/lbc-logo.png')
  logo.anisotropy = 8
  logo.colorSpace = THREE.SRGBColorSpace

  return (
    <group>
      {/* Trailer-låda (vit) */}
      <mesh position={[-1.4, 1.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[7, 2.4, 2.2]} />
        <meshStandardMaterial color="#f5f6f5" metalness={0.15} roughness={0.55} />
      </mesh>

      {/* LBC-logga — vänster sida (positiv Z) */}
      <mesh position={[-1.4, 1.85, 1.101]}>
        <planeGeometry args={[4.6, 1.4]} />
        <meshBasicMaterial map={logo} transparent alphaTest={0.05} />
      </mesh>

      {/* LBC-logga — höger sida (negativ Z, roterad) */}
      <mesh position={[-1.4, 1.85, -1.101]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[4.6, 1.4]} />
        <meshBasicMaterial map={logo} transparent alphaTest={0.05} />
      </mesh>

      {/* Grön sockellinje längs sidan */}
      <mesh position={[-1.4, 0.6, 1.102]}>
        <planeGeometry args={[7, 0.14]} />
        <meshStandardMaterial color={sideColor} metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[-1.4, 0.6, -1.102]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[7, 0.14]} />
        <meshStandardMaterial color={sideColor} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Bakre dörr-kant (mörk linje) */}
      <mesh position={[-4.905, 1.7, 0]}>
        <boxGeometry args={[0.02, 2.4, 2.22]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* Dörr-mittlinje */}
      <mesh position={[-4.91, 1.7, 0]}>
        <boxGeometry args={[0.01, 2.4, 0.04]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  )
}

// ─── Dragbil hytt-form ─────────────────────────────────────────
function TractorBody() {
  return (
    <group>
      {/* Sovhytt-block */}
      <mesh position={[3.15, 1.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 1.9, 1.95]} />
        <meshStandardMaterial color="#f8f9f8" metalness={0.25} roughness={0.4} />
      </mesh>

      {/* Motorhuv/kortnos framför hytten */}
      <mesh position={[4.15, 1.55, 0]} castShadow>
        <boxGeometry args={[0.6, 1.4, 1.95]} />
        <meshStandardMaterial color="#f8f9f8" metalness={0.25} roughness={0.4} />
      </mesh>

      {/* Fotsteg mellan chassiram och kabin */}
      <mesh position={[2.6, 0.7, 1.05]}>
        <boxGeometry args={[0.5, 0.08, 0.12]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh position={[2.6, 0.7, -1.05]}>
        <boxGeometry args={[0.5, 0.08, 0.12]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Sido-fönster */}
      <mesh position={[3.15, 2.3, 0.981]}>
        <planeGeometry args={[1.3, 0.6]} />
        <meshPhysicalMaterial color="#0f2a3a" metalness={0.1} roughness={0.05} transmission={0.6} clearcoat={1} />
      </mesh>
      <mesh position={[3.15, 2.3, -0.981]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.3, 0.6]} />
        <meshPhysicalMaterial color="#0f2a3a" metalness={0.1} roughness={0.05} transmission={0.6} clearcoat={1} />
      </mesh>

      {/* Grön LBC-stripe längs kabin-sidan */}
      <mesh position={[3.15, 1.35, 0.982]}>
        <planeGeometry args={[1.7, 0.08]} />
        <meshStandardMaterial color="#00843e" emissive="#00843e" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[3.15, 1.35, -0.982]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.7, 0.08]} />
        <meshStandardMaterial color="#00843e" emissive="#00843e" emissiveIntensity={0.15} />
      </mesh>

      {/* Chassi mellan hjulen */}
      <mesh position={[3.15, 0.4, 0]}>
        <boxGeometry args={[1.9, 0.14, 1.4]} />
        <meshStandardMaterial color="#111" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Sido-speglar */}
      <mesh position={[3.6, 2.6, 1.15]} castShadow>
        <boxGeometry args={[0.15, 0.3, 0.16]} />
        <meshStandardMaterial color="#dcdfde" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[3.6, 2.6, -1.15]} castShadow>
        <boxGeometry args={[0.15, 0.3, 0.16]} />
        <meshStandardMaterial color="#dcdfde" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* Avgasrör (vertikalt) */}
      <mesh position={[2.4, 2.4, 1.05]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.6, 16]} />
        <meshStandardMaterial color="#c5cbce" metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  )
}

// ─── Hjul ──────────────────────────────────────────────────────
function Wheel({ side, rim }: { side: 'left' | 'right'; rim: string }) {
  const z = side === 'left' ? 1.05 : -1.05
  return (
    <group position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
      {/* Däck */}
      <mesh castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.28, 24]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      {/* Fälg */}
      <mesh position={[0, side === 'left' ? 0.09 : -0.09, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.12, 24]} />
        <meshStandardMaterial color={rim} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Nav */}
      <mesh position={[0, side === 'left' ? 0.16 : -0.16, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}