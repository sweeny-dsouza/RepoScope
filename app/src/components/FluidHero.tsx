import { useEffect, useRef } from 'react'

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

#define PI 3.14159265359
#define TAU 6.28318530718

vec3 mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289v3(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec2 curl(vec2 p, float noiseScale, float time) {
  float eps = 0.01;
  float n1 = snoise(p + vec2(0.0, eps) * noiseScale + time);
  float n2 = snoise(p - vec2(0.0, eps) * noiseScale + time);
  float n3 = snoise(p + vec2(eps, 0.0) * noiseScale + time);
  float n4 = snoise(p - vec2(eps, 0.0) * noiseScale + time);
  float dy = (n1 - n2) / (2.0 * eps);
  float dx = (n3 - n4) / (2.0 * eps);
  return vec2(dy, -dx);
}

vec2 fbmCurl(vec2 p, float t) {
  vec2 f = vec2(0.0);
  float amp = 0.55;
  float freq = 1.0;
  for (int i = 0; i < 5; i++) {
    f += amp * curl(p * freq + f * 0.3, 0.5, t * 0.1);
    freq *= 2.1;
    amp *= 0.48;
  }
  return f;
}

void main() {
  vec2 p = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);
  float t = u_time * 0.15;
  vec2 baseField = fbmCurl(p, t);
  float fieldTex = length(baseField) * 2.5 + dot(baseField, vec2(0.5));
  float glow = 0.0;
  vec2 trail = vec2(0.0);

  if (u_mouse.x > 0.0) {
    vec2 mPos = (u_mouse - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);
    vec2 mouseDir = mPos - p;
    float mouseDist = length(mouseDir);
    float mouseInfluence = exp(-mouseDist * mouseDist * 12.0) * smoothstep(0.4, 0.0, mouseDist);
    vec2 swirl = curl(p * 1.5 + mPos * 0.5, 0.3, t * 0.2);
    trail = mix(trail, swirl * 1.5 + mouseDir * 2.0, mouseInfluence);
    fieldTex += length(trail) * 0.8;
    glow += mouseInfluence * 2.5;
    glow += exp(-mouseDist * mouseDist * 20.0) * 2.0;
  }

  glow += smoothstep(0.1, 0.6, fieldTex);
  glow += exp(-fieldTex * fieldTex * 4.0) * 1.5;
  glow += exp(-abs(fieldTex) * 8.0) * 2.0;
  glow *= smoothstep(1.2, 0.3, length(p));

  vec3 coreColor = vec3(0.29, 0.87, 0.50);
  vec3 fieldColor = vec3(0.10, 0.51, 0.96);
  vec3 col = mix(coreColor, fieldColor, smoothstep(0.0, 0.5, glow));
  col = mix(col, vec3(1.0, 1.0, 1.0), smoothstep(0.8, 1.8, glow) * 0.3);

  gl_FragColor = vec4(col * glow * 1.2, 1.0);
}
`

export default function FluidHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1, y: -1 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
    if (!gl) return

    // Compile shaders
    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return shader
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)

    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.useProgram(program)

    // Full-screen triangle
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

    const posLoc = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    // Uniforms
    const uResolution = gl.getUniformLocation(program, 'u_resolution')
    const uTime = gl.getUniformLocation(program, 'u_time')
    const uMouse = gl.getUniformLocation(program, 'u_mouse')

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 1.5)
      canvas!.width = canvas!.clientWidth * dpr
      canvas!.height = canvas!.clientHeight * dpr
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouseMove = (e: MouseEvent) => {
      const dpr = Math.min(window.devicePixelRatio, 1.5)
      mouseRef.current.x = e.clientX * dpr
      mouseRef.current.y = (canvas!.clientHeight - e.clientY) * dpr
    }
    const handleMouseLeave = () => {
      mouseRef.current.x = -1
      mouseRef.current.y = -1
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    let startTime = performance.now()

    function render() {
      const elapsed = (performance.now() - startTime) * 0.001
      gl!.uniform2f(uResolution, canvas!.width, canvas!.height)
      gl!.uniform1f(uTime, elapsed)
      gl!.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y)
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buffer)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  )
}
