import * as THREE from 'three'

export interface TruckPalette {
  cabPaint: string
  cabTrim: string
  chassisMetal: string
  glassTint: string
  tire: string
  rim: string
  trailerPaint: string
  trailerFrame: string
  electricAccent: string
  lightWhite: string
  lightRed: string
  lightAmber: string
}

export const TRUCK_PALETTE: TruckPalette = {
  cabPaint: '#f2f3f2',
  cabTrim: '#252a28',
  chassisMetal: '#1b1f1d',
  glassTint: '#375366',
  tire: '#121514',
  rim: '#8a9299',
  trailerPaint: '#f6f7f6',
  trailerFrame: '#1d221f',
  electricAccent: '#00843e',
  lightWhite: '#f8f4df',
  lightRed: '#c93820',
  lightAmber: '#d98f1b',
}

export function createTruckMaterials(palette: TruckPalette) {
  const cabBody = new THREE.MeshStandardMaterial({ color: palette.cabPaint, metalness: 0.28, roughness: 0.35 })
  const cabTrim = new THREE.MeshStandardMaterial({ color: palette.cabTrim, metalness: 0.38, roughness: 0.58 })
  const chassis = new THREE.MeshStandardMaterial({ color: palette.chassisMetal, metalness: 0.62, roughness: 0.42 })
  const trailerBody = new THREE.MeshStandardMaterial({ color: palette.trailerPaint, metalness: 0.18, roughness: 0.5 })
  const trailerFrame = new THREE.MeshStandardMaterial({ color: palette.trailerFrame, metalness: 0.6, roughness: 0.48 })
  const tire = new THREE.MeshStandardMaterial({ color: palette.tire, metalness: 0.02, roughness: 0.92 })
  const rim = new THREE.MeshStandardMaterial({ color: palette.rim, metalness: 0.85, roughness: 0.24 })
  const glass = new THREE.MeshPhysicalMaterial({
    color: palette.glassTint,
    metalness: 0.08,
    roughness: 0.11,
    transmission: 0.5,
    thickness: 0.26,
    clearcoat: 0.9,
    clearcoatRoughness: 0.16,
    transparent: true,
    opacity: 0.88,
  })
  const electricPanel = new THREE.MeshStandardMaterial({
    color: '#1f2522',
    metalness: 0.5,
    roughness: 0.4,
  })
  const electricAccent = new THREE.MeshStandardMaterial({
    color: palette.electricAccent,
    emissive: palette.electricAccent,
    emissiveIntensity: 0.12,
    metalness: 0.32,
    roughness: 0.4,
  })
  const whiteLight = new THREE.MeshStandardMaterial({
    color: palette.lightWhite,
    emissive: palette.lightWhite,
    emissiveIntensity: 0.55,
  })
  const redLight = new THREE.MeshStandardMaterial({
    color: palette.lightRed,
    emissive: palette.lightRed,
    emissiveIntensity: 0.42,
  })
  const amberLight = new THREE.MeshStandardMaterial({
    color: palette.lightAmber,
    emissive: palette.lightAmber,
    emissiveIntensity: 0.25,
  })

  return {
    cabBody,
    cabTrim,
    chassis,
    trailerBody,
    trailerFrame,
    tire,
    rim,
    glass,
    electricPanel,
    electricAccent,
    whiteLight,
    redLight,
    amberLight,
  }
}

export function disposeTruckMaterials(materials: Record<string, THREE.Material>) {
  Object.values(materials).forEach((mat) => mat.dispose())
}
