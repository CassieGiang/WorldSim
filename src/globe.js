// GPU globe: a per-pixel orthographic projection in a fragment shader.
// The map is a 2048x1024 "which province is this pixel" texture; each year only the province colours change.
const TW = 2048, TH = 1024;
const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;
const FS = `#version 300 es
precision highp float; precision highp usampler2D;
uniform usampler2D uId; uniform usampler2D uOwn; uniform sampler2D uCol; uniform sampler2D uShade;
uniform vec2 uCenter; uniform float uR; uniform vec3 uE, uN, uF; uniform uint uSel; uniform uint uSelOwn; uniform float uBorders;
out vec4 o;
const float PI = 3.14159265;
uint idAt(vec2 uv){ ivec2 p = ivec2(floor(uv * vec2(${TW}.0, ${TH}.0))); p.x = (p.x % ${TW} + ${TW}) % ${TW}; p.y = clamp(p.y, 0, ${TH - 1}); return texelFetch(uId, p, 0).r; }
uint ownOf(uint id){ if (id >= 65533u) return 65535u; return texelFetch(uOwn, ivec2(int(id % 128u), int(id / 128u)), 0).r; }
void main(){
  vec2 p = (gl_FragCoord.xy - uCenter) / uR; float r2 = dot(p, p);
  if (r2 > 1.0) { float d = (sqrt(r2) - 1.0) * uR; float a = clamp(1.0 - d / (uR * 0.06 + 6.0), 0.0, 1.0); o = vec4(0.30, 0.55, 1.0, a * a * 0.55); return; }
  float z = sqrt(1.0 - r2);
  vec3 w = p.x * uE + p.y * uN + z * uF;
  float lat = asin(clamp(w.z, -1.0, 1.0)), lon = atan(w.y, w.x);
  vec2 uv = vec2((lon + PI) / (2.0 * PI), (PI * 0.5 - lat) / PI);
  uint id = idAt(uv);
  float light = 0.55 + 0.45 * z;
  vec3 c;
  if (id == 65535u) {
    c = mix(vec3(0.025, 0.09, 0.19), vec3(0.08, 0.27, 0.43), z);
  } else if (id == 65534u) { c = vec3(0.86, 0.9, 0.94) * light; }
  else if (id == 65533u) { c = vec3(0.42, 0.44, 0.37) * light; }
  else {
    c = texelFetch(uCol, ivec2(int(id % 128u), int(id / 128u)), 0).rgb;
    float sh = texture(uShade, uv).r;
    c *= (0.70 + 0.55 * sh) * light;
    vec2 d = vec2(1.0 / ${TW}.0, 1.0 / ${TH}.0);
    uint ow = ownOf(id);
    uint a = idAt(uv + vec2(d.x, 0.0)), b = idAt(uv - vec2(d.x, 0.0)), e = idAt(uv + vec2(0.0, d.y)), f = idAt(uv - vec2(0.0, d.y));
    if (uBorders > 0.5 && ow != 0u) {
      bool edge = (a < 65533u && ownOf(a) != ow) || (b < 65533u && ownOf(b) != ow) || (e < 65533u && ownOf(e) != ow) || (f < 65533u && ownOf(f) != ow);
      if (edge) c *= 0.42;
    }
    if (a == 65535u || b == 65535u || e == 65535u || f == 65535u) c = mix(c, vec3(0.86, 0.92, 0.97), 0.28);
    if (id == uSel) c = mix(c, vec3(1.0), 0.45);
    else if (uSelOwn != 0u && ow == uSelOwn) c = mix(c, vec3(1.0, 0.95, 0.8), 0.10);
  }
  o = vec4(c, 1.0);
}`;

async function inflate(bytes) {
  const ds = new DecompressionStream('deflate');
  const buf = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(buf);
}

export class Globe {
  static async create(glCanvas, overlay, idBin, elevBin, N) {
    const g = new Globe(glCanvas, overlay, N);
    const idBytes = await inflate(idBin);
    g.idmap = new Uint16Array(idBytes.buffer, idBytes.byteOffset, TW * TH);
    const elev = await inflate(elevBin);
    g._init(elev);
    return g;
  }
  constructor(glCanvas, overlay, N) {
    this.c = glCanvas; this.o = overlay; this.N = N;
    this.gl = glCanvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
    if (!this.gl) throw new Error('WebGL2 is not available in this browser.');
    this.octx = overlay.getContext('2d');
    this.view = { lon: 60, lat: 25, scale: 1 };
    this.sel = 65535; this.selOwn = 0; this.borders = 1;
    this.rows = Math.ceil(N / 128);
  }
  _init(elev0) {
    let elev = elev0;
    const gl = this.gl;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    this.pr = pr; gl.useProgram(pr);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const tex = (unit, name) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(gl.getUniformLocation(pr, name), unit); return t; };
    const nearest = () => { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); };
    this.tId = tex(0, 'uId'); nearest();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16UI, TW, TH, 0, gl.RED_INTEGER, gl.UNSIGNED_SHORT, this.idmap);
    this.tOwn = tex(1, 'uOwn'); nearest();
    this.ownData = new Uint16Array(128 * this.rows);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16UI, 128, this.rows, 0, gl.RED_INTEGER, gl.UNSIGNED_SHORT, this.ownData);
    this.tCol = tex(2, 'uCol'); nearest();
    this.colData = new Uint8Array(128 * this.rows * 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 128, this.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.colData);
    // hill shading from the elevation grid (1800 x 900, 20 m steps)
    const EW = 1800, EH = 900, shade = new Uint8Array(EW * EH);
    // smooth the relief (the source image carries jpeg and hill-shade texture)
    let src = Float32Array.from(elev), tmp = new Float32Array(EW * EH);
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < EH; y++) for (let x = 0; x < EW; x++) {
        let s = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= EH) continue; for (let dx = -1; dx <= 1; dx++) { const v = src[yy * EW + (x + dx + EW) % EW]; if (v) { s += v; n++; } } }
        tmp[y * EW + x] = elev[y * EW + x] ? s / n : 0;
      }
      [src, tmp] = [tmp, src];
    }
    elev = src;
    for (let y = 0; y < EH; y++) for (let x = 0; x < EW; x++) {
      const i = y * EW + x, e = elev[i];
      if (!e) { shade[i] = 128; continue; }
      const ex = elev[y * EW + ((x + 1) % EW)] - elev[y * EW + ((x - 1 + EW) % EW)];
      const ey = elev[Math.min(EH - 1, y + 1) * EW + x] - elev[Math.max(0, y - 1) * EW + x];
      const coslat = Math.max(0.2, Math.cos(((y + 0.5) / EH * 180 - 90) * Math.PI / 180));
      const v = 0.5 - (ex / coslat * 0.7 - ey * 0.7) * 0.05 * Math.min(1, Math.max(0.15, (e - 15) / 45));           // light from the north-west
      shade[i] = Math.max(0, Math.min(255, v * 255 + e * 0.1));
    }
    this.tShade = tex(3, 'uShade');
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, EW, EH, 0, gl.RED, gl.UNSIGNED_BYTE, shade);
    this.u = {}; for (const n of ['uCenter', 'uR', 'uE', 'uN', 'uF', 'uSel', 'uSelOwn', 'uBorders']) this.u[n] = gl.getUniformLocation(pr, n);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  setData(colors, owners) {
    const gl = this.gl;
    this.colData.set(colors); this.ownData.set(owners);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tOwn);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 128, this.rows, gl.RED_INTEGER, gl.UNSIGNED_SHORT, this.ownData);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.tCol);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 128, this.rows, gl.RGBA, gl.UNSIGNED_BYTE, this.colData);
  }
  resize() {
    const r = this.c.parentElement.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    for (const cv of [this.c, this.o]) { cv.width = r.width * dpr; cv.height = r.height * dpr; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; }
    this.cssW = r.width; this.cssH = r.height; this.dpr = dpr;
    this.octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  basis() {
    const d = Math.PI / 180, lo = this.view.lon * d, la = this.view.lat * d;
    const F = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
    const E = [-Math.sin(lo), Math.cos(lo), 0];
    const N = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
    return { E, N, F };
  }
  radius() { return Math.min(this.cssW, this.cssH) * 0.46 * this.view.scale; }
  render() {
    const gl = this.gl, { E, N, F } = this.basis(), dpr = this.dpr;
    gl.viewport(0, 0, this.c.width, this.c.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.pr);
    gl.uniform2f(this.u.uCenter, this.c.width / 2, this.c.height / 2);
    gl.uniform1f(this.u.uR, this.radius() * dpr);
    gl.uniform3fv(this.u.uE, E); gl.uniform3fv(this.u.uN, N); gl.uniform3fv(this.u.uF, F);
    gl.uniform1ui(this.u.uSel, this.sel); gl.uniform1ui(this.u.uSelOwn, this.selOwn); gl.uniform1f(this.u.uBorders, this.borders);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  // lon/lat -> css pixel, or null if on the far side
  project(lon, lat) {
    const { E, N, F } = this._b || (this._b = this.basis());
    const d = Math.PI / 180, w = [Math.cos(lat * d) * Math.cos(lon * d), Math.cos(lat * d) * Math.sin(lon * d), Math.sin(lat * d)];
    const z = w[0] * F[0] + w[1] * F[1] + w[2] * F[2];
    if (z < 0.05) return null;
    const R = this.radius();
    return [this.cssW / 2 + (w[0] * E[0] + w[1] * E[1] + w[2] * E[2]) * R, this.cssH / 2 - (w[0] * N[0] + w[1] * N[1] + w[2] * N[2]) * R, z];
  }
  invert(x, y) {
    const R = this.radius(), px = (x - this.cssW / 2) / R, py = (this.cssH / 2 - y) / R, r2 = px * px + py * py;
    if (r2 > 1) return null;
    const z = Math.sqrt(1 - r2), { E, N, F } = this.basis();
    const w = [0, 1, 2].map(k => px * E[k] + py * N[k] + z * F[k]);
    return [Math.atan2(w[1], w[0]) * 180 / Math.PI, Math.asin(Math.max(-1, Math.min(1, w[2]))) * 180 / Math.PI];
  }
  idAt(lon, lat) {
    const x = Math.floor((lon + 180) / 360 * TW) % TW, y = Math.min(TH - 1, Math.floor((90 - lat) / 180 * TH));
    return this.idmap[y * TW + x];
  }
  beginOverlay() { this._b = this.basis(); this.octx.clearRect(0, 0, this.cssW, this.cssH); return this.octx; }
}
