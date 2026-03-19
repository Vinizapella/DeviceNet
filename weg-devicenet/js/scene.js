/**
 * scene.js
 * Configura o renderer WebGL, câmera, OrbitControls,
 * iluminação e o ambiente físico da fábrica.
 */

// ════════════════════════════════════════════════════════════
//  RENDERER
// ════════════════════════════════════════════════════════════

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight - 44);
renderer.shadowMap.enabled   = true;
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// ════════════════════════════════════════════════════════════
//  CENA E CÂMERA
// ════════════════════════════════════════════════════════════

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09111e);
scene.fog = new THREE.FogExp2(0x09111e, 0.022);

const camera = new THREE.PerspectiveCamera(55, innerWidth / (innerHeight - 44), 0.1, 200);
camera.position.set(0, 12, 22);
camera.lookAt(0, 1, 0);

// Estado de lerp da câmera (compartilhado com ui.js e main.js)
let camLerping = false;
const lerpTarget = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
const lerpStart  = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
let lerpT        = 0;
const LERP_DURATION = 1.6; // segundos

// ════════════════════════════════════════════════════════════
//  ORBIT CONTROLS (embutido, sem dependência externa)
// ════════════════════════════════════════════════════════════

(function () {
  THREE.OrbitControls = function (obj, el) {
    var s = this, ST = { N: -1, R: 0, P: 2 }, st = ST.N;
    s.object = obj; s.domElement = el;
    s.enabled = true; s.target = new THREE.Vector3();
    s.minDistance = 4; s.maxDistance = 40;
    s.minPolarAngle = 0.1; s.maxPolarAngle = Math.PI * .82;
    s.enableDamping = true; s.dampingFactor = .06;
    s.enableZoom = true; s.zoomSpeed = 1;
    s.rotateSpeed = .8; s.panSpeed = .9;

    var sp = new THREE.Spherical(), dp = new THREE.Spherical(), sc = 1;
    var pn = new THREE.Vector3();
    var rs = new THREE.Vector2(), re = new THREE.Vector2(), rd = new THREE.Vector2();
    var ps = new THREE.Vector2(), pe = new THREE.Vector2(), pd = new THREE.Vector2();
    var EPS = 1e-6, lp = new THREE.Vector3(), lq = new THREE.Quaternion();
    var qt = new THREE.Quaternion().setFromUnitVectors(obj.up, new THREE.Vector3(0, 1, 0));
    var qi = qt.clone().inverse();

    function gz() { return Math.pow(.95, s.zoomSpeed); }
    function panL(d, m) { pn.add(new THREE.Vector3().setFromMatrixColumn(m, 0).multiplyScalar(-d)); }
    function panU(d, m) { pn.add(new THREE.Vector3().setFromMatrixColumn(m, 1).multiplyScalar(d)); }
    function dPan(dx, dy) {
      var l = new THREE.Vector3().copy(s.object.position).sub(s.target).length()
        * Math.tan(s.object.fov / 2 * Math.PI / 180);
      panL(2 * dx * l / el.clientHeight, s.object.matrix);
      panU(2 * dy * l / el.clientHeight, s.object.matrix);
    }

    s.update = (function () {
      return function () {
        var pos = s.object.position;
        var off = new THREE.Vector3().copy(pos).sub(s.target).applyQuaternion(qt);
        sp.setFromVector3(off);
        sp.theta += dp.theta; sp.phi += dp.phi;
        sp.phi = Math.max(s.minPolarAngle, Math.min(s.maxPolarAngle, sp.phi));
        sp.makeSafe();
        sp.radius = Math.max(s.minDistance, Math.min(s.maxDistance, sp.radius * sc));
        s.target.add(pn);
        off.setFromSpherical(sp).applyQuaternion(qi);
        pos.copy(s.target).add(off);
        s.object.lookAt(s.target);
        if (s.enableDamping) {
          dp.theta *= 1 - s.dampingFactor;
          dp.phi   *= 1 - s.dampingFactor;
          pn.multiplyScalar(1 - s.dampingFactor);
        } else {
          dp.set(0, 0, 0); pn.set(0, 0, 0);
        }
        sc = 1;
        var moved = lp.distanceToSquared(s.object.position) > EPS
          || 8 * (1 - lq.dot(s.object.quaternion)) > EPS;
        if (moved) { lp.copy(s.object.position); lq.copy(s.object.quaternion); return true; }
        return false;
      };
    })();

    function onDown(e) {
      if (!s.enabled || camLerping) return;
      e.preventDefault();
      if (e.button === 0) { st = ST.R; rs.set(e.clientX, e.clientY); }
      else if (e.button === 2) { st = ST.P; ps.set(e.clientX, e.clientY); }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    }
    function onMove(e) {
      if (!s.enabled || st === ST.N) return;
      e.preventDefault();
      if (st === ST.R) {
        re.set(e.clientX, e.clientY);
        rd.subVectors(re, rs).multiplyScalar(s.rotateSpeed);
        dp.theta -= 2 * Math.PI * rd.x / el.clientHeight;
        dp.phi   -= 2 * Math.PI * rd.y / el.clientHeight;
        rs.copy(re);
      } else if (st === ST.P) {
        pe.set(e.clientX, e.clientY);
        pd.subVectors(pe, ps).multiplyScalar(s.panSpeed);
        dPan(pd.x, pd.y);
        ps.copy(pe);
      }
      s.update();
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      st = ST.N;
    }
    function onWheel(e) {
      if (!s.enabled || !s.enableZoom) return;
      e.preventDefault();
      sc *= e.deltaY < 0 ? 1 / gz() : gz();
      s.update();
    }

    el.addEventListener('mousedown',   onDown);
    el.addEventListener('wheel',       onWheel, { passive: false });
    el.addEventListener('contextmenu', e => e.preventDefault());
    s.update();
  };
})();

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);

// ════════════════════════════════════════════════════════════
//  ILUMINAÇÃO PBR
// ════════════════════════════════════════════════════════════

// Luz ambiente fraca (preenchimento geral)
scene.add(new THREE.AmbientLight(0x1a2840, 1.2));

// Luz direcional principal (sol de estúdio)
const sunLight = new THREE.DirectionalLight(0xbbd5f0, 3.0);
sunLight.position.set(8, 18, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left   = -20;
sunLight.shadow.camera.right  =  20;
sunLight.shadow.camera.top    =  20;
sunLight.shadow.camera.bottom = -20;
sunLight.shadow.bias = -0.0003;
scene.add(sunLight);

// Luz de preenchimento lateral (evita sombras totalmente negras)
const fillLight = new THREE.DirectionalLight(0x304060, 1.0);
fillLight.position.set(-8, 6, -6);
scene.add(fillLight);

// Hemisfério (bounce do chão)
scene.add(new THREE.HemisphereLight(0x0a1428, 0x1a2840, 0.7));

// Luminárias industriais suspensas (5 pontos de luz)
const LAMP_POSITIONS = [[-6, 6, 0], [0, 6, 0], [6, 6, 0], [-6, 6, -5], [6, 6, -5]];
const lampLights = LAMP_POSITIONS.map(([x, y, z]) => {
  const pl = new THREE.PointLight(0xfff0d0, 28, 12, 2);
  pl.position.set(x, y, z);
  scene.add(pl);
  return pl;
});

// Luzes de destaque coloridas para cada dispositivo
const plcLight  = new THREE.PointLight(0x2a8ce6, 3, 6, 2);
const invLight  = new THREE.PointLight(0xd2a00a, 3, 6, 2);
const sensLight = new THREE.PointLight(0xc83232, 3, 6, 2);
scene.add(plcLight, invLight, sensLight);

// ════════════════════════════════════════════════════════════
//  AMBIENTE FÍSICO: CHÃO, PAREDES, VIGAS E LUMINÁRIAS
// ════════════════════════════════════════════════════════════

function buildEnvironment() {
  const floorTex = createFloorTexture();

  // Chão de placa diamante
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 30),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: .85, metalness: .12 })
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // Paredes (fundo e laterais)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x111822, roughness: .9, metalness: .05 });
  const walls = [
    { size: [40, 10], pos: [0, 5, -15], ry: 0 },
    { size: [30, 10], pos: [-20, 5, 0],  ry:  Math.PI / 2 },
    { size: [30, 10], pos: [ 20, 5, 0],  ry: -Math.PI / 2 },
  ];
  walls.forEach(({ size, pos, ry }) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(...size), wallMat);
    m.position.set(...pos);
    m.rotation.y = ry;
    m.receiveShadow = true;
    scene.add(m);
  });

  // Vigas estruturais do teto
  const beamMat = new THREE.MeshStandardMaterial({ ...metalTex(0x1e2530, 0.5) });
  [-4, 4].forEach(z => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(36, .18, .25), beamMat);
    beam.position.set(0, 7.5, z);
    beam.castShadow = true;
    scene.add(beam);
  });

  // Modelo 3D das luminárias (cúpula + globo + fio)
  LAMP_POSITIONS.forEach(([x, y, z]) => {
    // Cúpula metálica
    const dome = new THREE.Mesh(
      new THREE.CylinderGeometry(.4, .28, .35, 12),
      new THREE.MeshStandardMaterial({ ...metalTex(0x3a4050, .4) })
    );
    dome.position.set(x, y + .18, z);
    dome.castShadow = true;
    scene.add(dome);

    // Globo emissor de luz
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(.22, 12, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfffce0, emissive: 0xfff8a0,
        emissiveIntensity: 2.5, transparent: true, opacity: .9
      })
    );
    globe.position.set(x, y - .1, z);
    scene.add(globe);

    // Fio de suspensão
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(.01, .01, y - 7.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: .9, roughness: .3 })
    );
    wire.position.set(x, (7.4 + y) / 2, z);
    scene.add(wire);
  });
}

buildEnvironment();

// ════════════════════════════════════════════════════════════
//  REDIMENSIONAMENTO DA JANELA
// ════════════════════════════════════════════════════════════

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / (innerHeight - 44);
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight - 44);
});
