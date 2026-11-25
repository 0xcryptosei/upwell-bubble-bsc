// Full-screen WebGL2 water surface.
// A height-field wave simulation runs on the GPU (ping-pong float textures). The visible water
// is drawn procedurally (depth gradient, caustics, light rays) and seen through the surface:
// each pixel's normal comes from the wave slope, which bends the view (refraction) and catches
// a light (diffuse shading + specular highlight). That is what makes a ripple look 3D.
//
// createWater(canvas) returns { drop(x, y, radiusPx, strength), setDepth(0..1), destroy() }
// or null when WebGL2 + renderable float textures are not available.
// The canvas can be full-screen (landing page) or sit inside any element (bubble map):
// it is sized from its own box, and drop() takes x/y in pixels relative to the canvas.

const VS = `#version 300 es
in vec2 a;
out vec2 v_uv;
void main() { v_uv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`

// Wave equation step: velocity in .g, height in .r
const UPDATE = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform vec2 u_delta;
uniform float u_damp;
in vec2 v_uv;
out vec4 o;
void main() {
  vec4 info = texture(u_state, v_uv);
  float avg = (
    texture(u_state, v_uv - vec2(u_delta.x, 0.0)).r +
    texture(u_state, v_uv + vec2(u_delta.x, 0.0)).r +
    texture(u_state, v_uv - vec2(0.0, u_delta.y)).r +
    texture(u_state, v_uv + vec2(0.0, u_delta.y)).r) * 0.25;
  info.g += (avg - info.r) * 2.0;
  info.g *= u_damp;
  info.r += info.g;
  info.r *= 0.999; // let the surface settle back to flat
  o = info;
}`

// Smooth cosine-shaped dent at u_center
const DROP = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_strength;
uniform float u_aspect;
in vec2 v_uv;
out vec4 o;
void main() {
  vec4 info = texture(u_state, v_uv);
  float d = length((v_uv - u_center) * vec2(u_aspect, 1.0)) / u_radius;
  float drop = max(0.0, 1.0 - d);
  drop = 0.5 - cos(drop * 3.14159265) * 0.5;
  info.r -= drop * u_strength;
  o = info;
}`

const RENDER = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform vec2 u_delta;
uniform vec2 u_res;
uniform float u_time;
uniform float u_depth;
in vec2 v_uv;
out vec4 o;

// tileable caustic pattern (well-known iterative trick)
float caustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

// what you see under the surface: the app's "Clear Water" gradient
// (#F4FCFF -> #E2F4FB -> #C9E9F5 -> #A9DAEE -> #8FCDE6), with soft caustics and light rays.
// u_depth darkens it slightly (0 = as bright as the app).
vec3 scene(vec2 uv) {
  float y = clamp(1.0 - uv.y, 0.0, 1.0); // 0 at the top of the screen
  vec3 c0 = vec3(0.957, 0.988, 1.000), c1 = vec3(0.886, 0.957, 0.984), c2 = vec3(0.788, 0.914, 0.961);
  vec3 c3 = vec3(0.663, 0.855, 0.933), c4 = vec3(0.561, 0.804, 0.902);
  vec3 c = y < 0.26 ? mix(c0, c1, y / 0.26)
         : y < 0.58 ? mix(c1, c2, (y - 0.26) / 0.32)
         : y < 0.84 ? mix(c2, c3, (y - 0.58) / 0.26)
         :            mix(c3, c4, (y - 0.84) / 0.16);
  c *= 1.0 - clamp(u_depth, 0.0, 1.0) * 0.35;
  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0);
  float ca = caustic(p * 1.15, u_time * 0.45);
  c += vec3(1.0) * ca * 0.30 * (0.45 + y * 0.55);          // bright caustic lines, strongest lower down
  c -= vec3(0.10, 0.05, 0.02) * ca * 0.10;                  // faint aqua edge so they read on white
  float rays = pow(max(0.0, sin(p.x * 4.2 - y * 1.8 + sin(u_time * 0.17) * 0.9)), 14.0);
  c += vec3(1.0) * rays * (1.0 - y) * 0.10;
  return c;
}

void main() {
  float h = texture(u_state, v_uv).r;
  float hx = texture(u_state, v_uv + vec2(u_delta.x, 0.0)).r - h;
  float hy = texture(u_state, v_uv + vec2(0.0, u_delta.y)).r - h;
  vec3 n = normalize(vec3(-hx * 18.0, -hy * 18.0, 1.0));

  // refraction: look through the tilted surface
  vec3 col = scene(v_uv + n.xy * 0.07);

  // light from the upper left: lit faces brighten, faces turned away darken
  vec3 L = normalize(vec3(-0.45, 0.65, 1.0));
  col *= 0.9 + 0.14 * dot(n, L);
  // on light water the wave slopes take on the app's aqua/blue, so ripples read as 3D
  float slope = clamp((1.0 - n.z) * 2.4, 0.0, 1.0);
  vec3 aqua = mix(vec3(0.18, 0.77, 0.93), vec3(0.04, 0.55, 0.82), clamp(-dot(n.xy, L.xy) * 4.0 + 0.5, 0.0, 1.0));
  col = mix(col, aqua, slope * 0.7);
  vec3 R = reflect(-L, n);
  float spec = pow(max(R.z, 0.0), 90.0);
  col += vec3(1.0) * spec * 0.9;

  o = vec4(col, 1.0);
}`

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
  return s
}

function program(gl, fs) {
  const p = gl.createProgram()
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS))
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs))
  gl.bindAttribLocation(p, 0, 'a')
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
  const u = {}
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name) }
  return { p, u }
}

export function createWater(canvas, { reducedMotion = false } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, premultipliedAlpha: false, powerPreference: 'high-performance' })
  if (!gl) return null
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return null

  let progs
  try {
    progs = { update: program(gl, UPDATE), drop: program(gl, DROP), render: program(gl, RENDER) }
  } catch (err) {
    console.warn('water shaders failed', err)
    return null
  }

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  let W = 0, H = 0, SW = 0, SH = 0
  let targets = []
  let cur = 0
  const drops = []
  let depth = 0
  let raf = 0
  let lost = false
  const t0 = performance.now()

  function makeTarget(w, h) {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('float framebuffer not supported')
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return { tex, fb }
  }

  let cssW = 1, cssH = 1
  function resize() {
    const box = canvas.getBoundingClientRect()
    if (!box.width || !box.height) return
    const vw = box.width, vh = box.height
    cssW = vw; cssH = vh
    // big screens render a little below native resolution: water is soft anyway
    const scale = Math.min(window.devicePixelRatio || 1, vw * vh > 1.6e6 ? 0.8 : 1)
    W = Math.max(1, Math.round(vw * scale)); H = Math.max(1, Math.round(vh * scale))
    canvas.width = W; canvas.height = H
    const sim = Math.min(1, 520 / Math.max(vw, vh))
    const sw = Math.max(64, Math.round(vw * sim)), sh = Math.max(64, Math.round(vh * sim))
    if (sw === SW && sh === SH) return
    SW = sw; SH = sh
    for (const t of targets) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb) }
    targets = [makeTarget(SW, SH), makeTarget(SW, SH)]
    cur = 0
  }

  function pass(prog, setUniforms) {
    const src = targets[cur], dst = targets[1 - cur]
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb)
    gl.viewport(0, 0, SW, SH)
    gl.useProgram(prog.p)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, src.tex)
    gl.uniform1i(prog.u.u_state, 0)
    setUniforms(prog.u)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    cur = 1 - cur
  }

  function frame(now) {
    raf = requestAnimationFrame(frame)
    if (lost || document.hidden || !targets.length) return
    while (drops.length) {
      const d = drops.shift()
      pass(progs.drop, (u) => {
        gl.uniform2f(u.u_center, d.x, d.y)
        gl.uniform1f(u.u_radius, d.r)
        gl.uniform1f(u.u_strength, d.s)
        gl.uniform1f(u.u_aspect, SW / SH)
      })
    }
    for (let i = 0; i < 2; i++) {
      pass(progs.update, (u) => {
        gl.uniform2f(u.u_delta, 1 / SW, 1 / SH)
        gl.uniform1f(u.u_damp, 0.991)
      })
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, W, H)
    gl.useProgram(progs.render.p)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, targets[cur].tex)
    const u = progs.render.u
    gl.uniform1i(u.u_state, 0)
    gl.uniform2f(u.u_delta, 1 / SW, 1 / SH)
    gl.uniform2f(u.u_res, W, H)
    gl.uniform1f(u.u_time, reducedMotion ? 0 : (now - t0) / 1000)
    gl.uniform1f(u.u_depth, depth)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  const onLost = (e) => { e.preventDefault(); lost = true }
  canvas.addEventListener('webglcontextlost', onLost)
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null
  ro?.observe(canvas)
  window.addEventListener('resize', resize)
  resize()
  raf = requestAnimationFrame(frame)

  return {
    /** Ripple at viewport pixel (x, y). */
    drop(x, y, radiusPx = 26, strength = 0.9) {
      if (drops.length > 24) return
      drops.push({ x: x / cssW, y: 1 - y / cssH, r: radiusPx / cssH, s: strength })
    },
    setDepth(d) { depth = d },
    destroy() {
      // free GPU resources but keep the context alive: React may mount again on the same canvas
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      ro?.disconnect()
      canvas.removeEventListener('webglcontextlost', onLost)
      for (const t of targets) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb) }
      for (const p of Object.values(progs)) gl.deleteProgram(p.p)
      gl.deleteBuffer(quad)
    },
  }
}
