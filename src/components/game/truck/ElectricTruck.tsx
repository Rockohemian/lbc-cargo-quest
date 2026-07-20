import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { EquippedParts, PartCategory, TruckPart } from '../../../types'
import { PART_BY_ID, PART_RARITY_COLORS } from '../../../data/garageParts'
import { TrailerExterior } from './TrailerExterior'
import { TruckCab } from './TruckCab'
import { TruckChassis } from './TruckChassis'
import { WheelAxle } from './TruckWheels'
import { createTruckMaterials, disposeTruckMaterials, TRUCK_PALETTE } from './truckMaterials'

interface Props {
  equipped: EquippedParts
  autoRotate: boolean
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export function ElectricTruck({ equipped, autoRotate }: Props) {
  const root = useRef<THREE.Group>(null)
  const wheelRoll = useRef(0)

  const part = (c: PartCategory): TruckPart | undefined => (equipped[c] ? PART_BY_ID[equipped[c]!] : undefined)
  const accent = (c: PartCategory, fallback: string): string => {
    const p = part(c)
    return p ? PART_RARITY_COLORS[p.rarity] : fallback
  }

  const materials = useMemo(() => {
    const palette = {
      ...TRUCK_PALETTE,
      rim: accent('wheels', TRUCK_PALETTE.rim),
      electricAccent: accent('side', TRUCK_PALETTE.electricAccent),
    }
    return createTruckMaterials(palette)
  }, [equipped])

  useEffect(() => {
    return () => disposeTruckMaterials(materials)
  }, [materials])

  const logo = useTexture(import.meta.env.BASE_URL + 'assets/lbc-logo.png')
  logo.anisotropy = 8
  logo.colorSpace = THREE.SRGBColorSpace

  const electricLabel = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (!ctx) return new THREE.Texture(canvas)

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(20, 24, 22, 0.88)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = 'rgba(0,132,62,0.75)'
    ctx.lineWidth = 3
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)
    ctx.fillStyle = '#dce8df'
    ctx.font = '700 28px Manrope, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('ELECTRIC', canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }, [])

  useFrame((_state, delta) => {
    if (autoRotate && root.current) root.current.rotation.y += delta * 0.22
    wheelRoll.current += delta * (autoRotate ? 3.8 : 2.1)
  })

  const roll = clamp(wheelRoll.current, -1_000_000, 1_000_000)

  useEffect(() => {
    return () => electricLabel.dispose()
  }, [electricLabel])

  return (
    <group ref={root} position={[0, 0, 0]}>
      <TrailerExterior
        trailerBody={materials.trailerBody}
        trailerFrame={materials.trailerFrame}
        redLight={materials.redLight}
        amberLight={materials.amberLight}
        sideAccent={materials.electricAccent}
        logo={logo}
      />

      <TruckChassis
        chassis={materials.chassis}
        electricPanel={materials.electricPanel}
        electricAccent={materials.electricAccent}
      />

      <TruckCab
        cabBody={materials.cabBody}
        cabTrim={materials.cabTrim}
        glass={materials.glass}
        electricPanel={materials.electricPanel}
        electricAccent={materials.electricAccent}
        whiteLight={materials.whiteLight}
        amberLight={materials.amberLight}
        electricLabel={electricLabel}
      />

      <WheelAxle x={4.95} roll={roll} tireMat={materials.tire} rimMat={materials.rim} />
      <WheelAxle x={2.8} dual roll={roll} tireMat={materials.tire} rimMat={materials.rim} />
      <WheelAxle x={2.05} dual roll={roll} tireMat={materials.tire} rimMat={materials.rim} />

      <WheelAxle x={-4.85} dual roll={roll} tireMat={materials.tire} rimMat={materials.rim} />
      <WheelAxle x={-5.6} dual roll={roll} tireMat={materials.tire} rimMat={materials.rim} />
      <WheelAxle x={-6.35} dual roll={roll} tireMat={materials.tire} rimMat={materials.rim} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[45, 45]} />
        <meshStandardMaterial color="#f6f7f6" roughness={1} />
      </mesh>
    </group>
  )
}
