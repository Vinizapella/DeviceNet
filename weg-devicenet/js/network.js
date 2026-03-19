/**
 * network.js
 * Modela a rede DeviceNet física e anima os frames CAN:
 *  - Trunkline (cabo principal acima da esteira)
 *  - Droplines (derivações até cada dispositivo)
 *  - Conectores M12 nos pontos de junção
 *  - Pulsos de luz que representam frames CAN
 */

// ════════════════════════════════════════════════════════════
//  ALTURA DO TRUNKLINE (passagem aérea)
// ════════════════════════════════════════════════════════════

const TRUNK_Y = 2.4; // metros acima do chão

// ════════════════════════════════════════════════════════════
//  CONSTRUÇÃO DO CABO (segmentos de cilindro)
// ════════════════════════════════════════════════════════════

/**
 * Cria um conjunto de segmentos cilíndricos ligando uma lista de pontos.
 * @param {THREE.Vector3[]} points - Pontos de rota do cabo
 * @param {number}          radius - Raio do cabo
 * @param {THREE.Material}  mat    - Material a aplicar
 */
function buildCable(points, radius, mat) {
  const group = new THREE.Group();

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    const direction = b.clone().sub(a);
    const length    = direction.length();
    const midpoint  = a.clone().add(b).multiplyScalar(.5);

    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), mat);
    cyl.position.copy(midpoint);
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    cyl.castShadow = true;
    group.add(cyl);
  }

  scene.add(group);
  return group;
}

// ════════════════════════════════════════════════════════════
//  CONECTOR M12 (junção trunk → dropline)
// ════════════════════════════════════════════════════════════

function buildM12Connector(position) {
  // Corpo do conector
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(.06, .06, .15, 14),
    new THREE.MeshStandardMaterial({ ...metalTex(0x707880, .38) })
  );
  body.position.copy(position);
  body.castShadow = true;
  scene.add(body);

  // Porca sextavada de travamento
  const nut = new THREE.Mesh(
    new THREE.CylinderGeometry(.076, .076, .08, 6),
    new THREE.MeshStandardMaterial({ ...metalTex(0x888a90, .35) })
  );
  nut.position.copy(position).add(new THREE.Vector3(0, -.1, 0));
  scene.add(nut);
}

// ════════════════════════════════════════════════════════════
//  MONTAGEM DA REDE
// ════════════════════════════════════════════════════════════

function buildDeviceNetCables() {
  // Materiais dos cabos
  const trunkMat  = new THREE.MeshStandardMaterial({ ...rubberTex(0x1c2024), color: 0x1c2024 });
  const yellowMat = new THREE.MeshStandardMaterial({ ...rubberTex(0x483000), color: 0x483000 });
  const dropMat   = new THREE.MeshStandardMaterial({ ...rubberTex(0x1c2024), color: 0x1c2024 });

  // Pontos de rota do trunkline (percorre o comprimento da fábrica)
  const trunkPoints = [
    new THREE.Vector3(-9,           TRUNK_Y, -1),
    new THREE.Vector3(-8,           TRUNK_Y,  0),
    new THREE.Vector3(-BELT_LEN/2,  TRUNK_Y,  0),
    new THREE.Vector3( BELT_LEN/2-2,TRUNK_Y,  0),
    new THREE.Vector3( 6,           TRUNK_Y,  1),
  ];

  // Cabo principal (preto, blindado)
  buildCable(trunkPoints, .055, trunkMat);

  // Cabo de sinal (amarelo, característico DeviceNet)
  const yellowPoints = trunkPoints.map(p => new THREE.Vector3(p.x, p.y + .09, p.z));
  buildCable(yellowPoints, .032, yellowMat);

  // Bandejas porta-cabos ao longo do percurso
  const trayMat = new THREE.MeshStandardMaterial({ ...metalTex(0x7a8898, .4) });
  for (let x = -7; x <= 5; x += 4) {
    const tray = new THREE.Mesh(new THREE.BoxGeometry(.06, 4, .18), trayMat);
    tray.position.set(x, TRUNK_Y - .5, -.2);
    tray.castShadow = true;
    scene.add(tray);
  }

  // Droplines: trunk → cada dispositivo
  const droplines = [
    {
      from: new THREE.Vector3(-8,           TRUNK_Y, 0),
      to:   new THREE.Vector3(-8.8,         1.8,    -1.8),  // → armário CLP
    },
    {
      from: new THREE.Vector3(-BELT_LEN/2,  TRUNK_Y, 0),
      to:   new THREE.Vector3(-BELT_LEN/2,  1.6,    1.7),   // → inversor CFW700
    },
    {
      from: new THREE.Vector3(3,            TRUNK_Y, .3),
      to:   new THREE.Vector3(3,            1.0,    BELT_W/2 + .2), // → sensor PS-F
    },
  ];

  droplines.forEach(({ from, to }) => {
    buildCable([from, to], .038, dropMat);
    buildM12Connector(to);
  });
}

// ════════════════════════════════════════════════════════════
//  PULSOS DE DADOS (CAN FRAMES animados)
// ════════════════════════════════════════════════════════════

const PULSE_TRAIL_LENGTH = 7; // número de esferas na cauda

/**
 * Define os percursos dos pulsos e suas propriedades visuais.
 * Cada pulso representa um frame CAN trafegando na rede.
 */
const PULSE_DEFINITIONS = [
  // CLP → Inversor (ciano) — comando de velocidade
  {
    points: [
      new THREE.Vector3(-8, TRUNK_Y, 0),
      new THREE.Vector3(-BELT_LEN/2, TRUNK_Y, 0),
      new THREE.Vector3(-BELT_LEN/2, 1.6, 1.7),
    ],
    color: 0x00cfff,
    speed: .005,
    phase: 0,
  },
  {
    points: [
      new THREE.Vector3(-8, TRUNK_Y, 0),
      new THREE.Vector3(-BELT_LEN/2, TRUNK_Y, 0),
      new THREE.Vector3(-BELT_LEN/2, 1.6, 1.7),
    ],
    color: 0x00cfff,
    speed: .005,
    phase: .5, // defasado 180°
  },
  // CLP → Sensor (verde) — polling de presença
  {
    points: [
      new THREE.Vector3(-8, TRUNK_Y, 0),
      new THREE.Vector3(3, TRUNK_Y, .3),
      new THREE.Vector3(3, 1.0, BELT_W/2 + .2),
    ],
    color: 0x60ff90,
    speed: .004,
    phase: 0,
  },
  {
    points: [
      new THREE.Vector3(-8, TRUNK_Y, 0),
      new THREE.Vector3(3, TRUNK_Y, .3),
      new THREE.Vector3(3, 1.0, BELT_W/2 + .2),
    ],
    color: 0x60ff90,
    speed: .004,
    phase: .5,
  },
  // Sensor → CLP (laranja) — ACK / resposta de presença
  {
    points: [
      new THREE.Vector3(3, TRUNK_Y, .3),
      new THREE.Vector3(-8, TRUNK_Y, 0),
    ],
    color: 0xff9040,
    speed: .006,
    phase: 0,
  },
];

/** Cria todos os objetos 3D dos pulsos e retorna a lista para animação. */
function buildPulses() {
  return PULSE_DEFINITIONS.map(def => {
    const curve = new THREE.CatmullRomCurve3(def.points);
    const mat   = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: .9 });
    const mesh  = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 8), mat);
    scene.add(mesh);

    // Cauda de esferas decrescentes
    const trail = Array.from({ length: PULSE_TRAIL_LENGTH }, (_, i) => {
      const size   = .03 * (1 - i / PULSE_TRAIL_LENGTH);
      const opacity= .3  * (1 - i / PULSE_TRAIL_LENGTH);
      const tm = new THREE.Mesh(
        new THREE.SphereGeometry(size, 6, 6),
        new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity })
      );
      scene.add(tm);
      return tm;
    });

    return { mesh, mat, trail, curve, t: def.phase, speed: def.speed };
  });
}

// Inicialização
buildDeviceNetCables();
const pulseObjects = buildPulses();
