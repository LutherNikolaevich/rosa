import { Color, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Vector3, type Material, type WebGLProgramParametersWithUniforms } from 'three'
import type { Finish } from '@/src/state/schema'
import type { PartKind } from './geo'

export const sceneUniforms = {
  uTime: { value: 0 },
  uWind: { value: 0.3 },
  uSunView: { value: new Vector3(0, 0, -1) },
  uTranslucency: { value: 0.35 },
}

const windVertex = `
vec4 rosaWorld = modelMatrix * vec4(transformed, 1.0);
#ifdef USE_INSTANCING
rosaWorld = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
#endif
float rosaH = max(0.0, rosaWorld.y + 1.6);
vec2 rosaSway = vec2(sin(uTime * 1.3 + rosaWorld.x * 1.7 + rosaWorld.z * 0.9), cos(uTime * 1.1 + rosaWorld.z * 1.9 + rosaWorld.x * 0.6));
rosaSway += 0.35 * vec2(sin(uTime * 2.9 + rosaWorld.z * 3.1), cos(uTime * 3.3 + rosaWorld.x * 2.7));
rosaWorld.xz += rosaSway * uWind * 0.03 * rosaH * rosaH;
rosaWorld.xz += vec2(sin(uTime * 8.0 + rosaWorld.y * 23.0 + rosaWorld.x * 17.0)) * uWind * 0.0035 * rosaH;
vRosaWorld = rosaWorld.xyz;
vec4 mvPosition = viewMatrix * rosaWorld;
gl_Position = projectionMatrix * mvPosition;
`

const translucentFragment = `
float rosaBack = pow(max(0.0, dot(normalize(vViewPosition), uSunView)), 2.5);
outgoingLight += diffuseColor.rgb * uTranslucency * (0.18 + 0.9 * rosaBack);
`

const glitterFragment = `
vec3 rosaCell = floor(vRosaWorld * 260.0);
float rosaRand = fract(sin(dot(rosaCell, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
float rosaTwinkle = fract(rosaRand * 7.0 + dot(normalize(vViewPosition), vec3(3.1, 1.7, 2.3)));
outgoingLight += vec3(1.0, 0.95, 0.9) * step(0.985, rosaRand) * smoothstep(0.6, 1.0, rosaTwinkle) * 2.2;
`

function patch(material: Material, key: string, opts: { translucent?: boolean; glitter?: boolean }) {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, sceneUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;\nvarying vec3 vRosaWorld;')
      .replace('#include <project_vertex>', windVertex)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSunView;\nuniform float uTranslucency;\nvarying vec3 vRosaWorld;')
      .replace('#include <opaque_fragment>', `${opts.translucent ? translucentFragment : ''}${opts.glitter ? glitterFragment : ''}\n#include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => `rosa-${key}`
  return material
}

const cache = new Map<string, Material>()

export function partMaterial(kind: PartKind, finish: Finish, rich: boolean): Material {
  const effectiveFinish = kind === 'petal' || kind === 'wingL' || kind === 'wingR' ? finish : 'natural'
  const key = `${kind}-${effectiveFinish}-${rich}`
  const hit = cache.get(key)
  if (hit) return hit
  let material: Material
  if (kind === 'glow') material = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, color: new Color(3, 3, 3) })
  else if (kind === 'metal') material = new MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: 0.28 })
  else if (kind === 'green') material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.62, side: DoubleSide })
  else if (!rich) material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: DoubleSide })
  else {
    const physical = new MeshPhysicalMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.55, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new Color('#ffffff') })
    if (effectiveFinish === 'velvet') Object.assign(physical, { roughness: 0.85, sheen: 1, sheenRoughness: 0.3, sheenColor: new Color('#fff2f4') })
    if (effectiveFinish === 'pearl') Object.assign(physical, { roughness: 0.25, iridescence: 1, iridescenceIOR: 1.35, clearcoat: 0.7, clearcoatRoughness: 0.2 })
    if (effectiveFinish === 'glitter') Object.assign(physical, { roughness: 0.35, clearcoat: 0.4 })
    material = physical
  }
  const translucent = kind === 'petal' || kind === 'wingL' || kind === 'wingR'
  patch(material, key, { translucent, glitter: translucent && effectiveFinish === 'glitter' })
  cache.set(key, material)
  return material
}

export function windMaterial<T extends Material>(material: T, key: string): T {
  return patch(material, key, {}) as T
}
