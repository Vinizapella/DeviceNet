/**
 * ui.js
 * Toda a lógica de interface:
 *  - Raycaster (hover e clique nos dispositivos)
 *  - Abertura/fechamento do painel lateral
 *  - Transições suaves de câmera (lerp)
 *  - Simulação de dados em tempo real
 */

// ════════════════════════════════════════════════════════════
//  DEFINIÇÃO DOS DISPOSITIVOS CLICÁVEIS
//  Cada entrada descreve um equipamento WEG com:
//    - Posição da câmera no close-up
//    - Dados exibidos no painel lateral
//    - Referências aos THREE.Group para raycasting
// ════════════════════════════════════════════════════════════

const DEVICE_DATA = [
  {
    id:    'plc',
    name:  'CLP WEG PLC300',
    model: 'Controlador Lógico Programável',
    mac:   '00',
    state: 'RUN',

    // Posição da câmera ao clicar no dispositivo
    camPos:  new THREE.Vector3(-8.5, 2.5, -1.5),
    camLook: new THREE.Vector3(-9, 1.5, -3.5),

    // Dados em tempo real (atualizados por simulação)
    realtime: [
      { k: 'Status DeviceNet',  v: 'Online / Operacional', cls: 'ok' },
      { k: 'Modo de Operação',  v: 'Master — Scanner',     cls: ''   },
      { k: 'Nós Monitorados',   v: '2 (MAC 01, 02)',       cls: ''   },
      { k: 'Scan Rate',         v: '5 ms',                 cls: ''   },
      { k: 'Memória %I',        v: '87 bytes',             cls: ''   },
      { k: 'Temperatura CPU',   v: '42 °C',                cls: 'ok' },
    ],
    dn: [
      { k: 'Versão DeviceNet', v: '2.0'                },
      { k: 'Node Address',     v: 'MAC ID 00'          },
      { k: 'Baud Rate',        v: '125 kbps'           },
      { k: 'Vendor ID',        v: 'WEG #0x0109'        },
      { k: 'Device Type',      v: 'Programmable Device'},
    ],
    gauges: [
      { l: 'CPU Load',    v: 38,  max: 100, cls: 'gauge-blue'  },
      { l: 'Rede TX',     v: 62,  max: 100, cls: 'gauge-green' },
      { l: 'I/O Digital', v: 12,  max: 32,  cls: 'gauge-amber', suffix: '/32' },
    ],
    log: [
      { ts: '08:14:22', msg: '[ONLINE] MAC 01 CFW700 conectado'    },
      { ts: '08:14:23', msg: '[ONLINE] MAC 02 PS-F conectado'      },
      { ts: '08:14:30', msg: '[TX] Setpoint velocidade → 60Hz'     },
      { ts: '08:15:01', msg: '[RX] Sensor: objeto detectado'       },
      { ts: '08:15:45', msg: '[TX] Ajuste rampa aceleração 2s'     },
    ],

    // Quais grupos 3D fazem parte deste dispositivo
    objects: () => [cabinetGroup, plcSmall],
  },

  {
    id:    'inv',
    name:  'Inversor WEG CFW700',
    model: 'Inversor de Frequência',
    mac:   '01',
    state: 'FWD',

    camPos:  new THREE.Vector3(-BELT_LEN/2 - 1, 2.8, 4),
    camLook: new THREE.Vector3(-BELT_LEN/2, 1.4, 2),

    realtime: [
      { k: 'Status DeviceNet',    v: 'Online / Operacional', cls: 'ok'   },
      { k: 'Frequência de Saída', v: '60.0 Hz',              cls: ''     },
      { k: 'Corrente Motor',      v: '12.4 A',               cls: ''     },
      { k: 'Tensão de Barramento',v: '537 V',                cls: ''     },
      { k: 'Velocidade Motor',    v: '1780 RPM',             cls: 'ok'   },
      { k: 'Torque',              v: '94 %',                 cls: 'warn' },
    ],
    dn: [
      { k: 'Node Address', v: 'MAC ID 01'       },
      { k: 'Baud Rate',    v: '125 kbps'        },
      { k: 'Device Type',  v: 'AC Drive'        },
      { k: 'Vendor ID',    v: 'WEG #0x0109'     },
      { k: 'COS Trigger',  v: 'Change of State' },
    ],
    gauges: [
      { l: 'Frequência',  v: 60, max: 60,  cls: 'gauge-green', suffix: ' Hz' },
      { l: 'Corrente',    v: 74, max: 100, cls: 'gauge-amber'                },
      { l: 'Temperatura', v: 48, max: 100, cls: 'gauge-blue',  suffix: ' °C' },
    ],
    log: [
      { ts: '08:14:23', msg: '[ONLINE] CFW700 MAC 01 ativo'        },
      { ts: '08:14:30', msg: '[RX] Cmd: Start / 60Hz recebido'     },
      { ts: '08:14:31', msg: '[RUN] Rampa partida: 0→60Hz em 2s'  },
      { ts: '08:15:45', msg: '[RX] Ajuste rampa aceleração 2s'     },
      { ts: '08:16:00', msg: '[COS] Freq atual: 60.0Hz reportado'  },
    ],
    objects: () => [invGroup, motorGroup],
  },

  {
    id:    'sensor',
    name:  'Sensor WEG PS-F18',
    model: 'Sensor Fotoelétrico',
    mac:   '02',
    state: 'ON',

    camPos:  new THREE.Vector3(4.5, 2.2, BELT_W/2 + 3),
    camLook: new THREE.Vector3(3, 1, BELT_W/2 + .3),

    realtime: [
      { k: 'Status DeviceNet', v: 'Online / Operacional',    cls: 'ok' },
      { k: 'Objeto Detectado', v: 'SIM — PALETE',            cls: 'ok' },
      { k: 'Distância',        v: '320 mm',                  cls: ''   },
      { k: 'Modo Operação',    v: 'Difuso c/ supressão',     cls: ''   },
      { k: 'Saída Digital',    v: 'Q0 = HIGH',               cls: 'ok' },
      { k: 'Tempo Resposta',   v: '< 1 ms',                  cls: 'ok' },
    ],
    dn: [
      { k: 'Node Address', v: 'MAC ID 02'   },
      { k: 'Baud Rate',    v: '125 kbps'   },
      { k: 'Device Type',  v: 'Generic I/O'},
      { k: 'Vendor ID',    v: 'WEG #0x0109'},
      { k: 'I/O Mapping',  v: '1 byte IN'  },
    ],
    gauges: [
      { l: 'Confiança Sinal', v: 88,  max: 100, cls: 'gauge-green'              },
      { l: 'Temperatura',     v: 29,  max: 80,  cls: 'gauge-blue',  suffix: ' °C'},
      { l: 'Uptime',          v: 100, max: 100, cls: 'gauge-green'              },
    ],
    log: [
      { ts: '08:14:23', msg: '[ONLINE] PS-F MAC 02 ativo'         },
      { ts: '08:15:01', msg: '[COS] Objeto detectado: SIM'        },
      { ts: '08:15:01', msg: '[TX] Byte I/O → CLP: 0x01'         },
      { ts: '08:15:38', msg: '[COS] Objeto detectado: NÃO'        },
      { ts: '08:16:10', msg: '[COS] Objeto detectado: SIM'        },
    ],
    objects: () => [sensGroup],
  },
];

// ════════════════════════════════════════════════════════════
//  RAYCASTER — mapeia meshes 3D → dispositivo
// ════════════════════════════════════════════════════════════

const raycaster     = new THREE.Raycaster();
const mouseNDC      = new THREE.Vector2(); // coordenadas normalizadas
let   mouseDownPos  = new THREE.Vector2();
let   isMouseDown   = false;

/** Constrói a lista de meshes clicáveis e os mapeia ao id do dispositivo. */
const raycastMeshes = [];

DEVICE_DATA.forEach(dev => {
  dev.objects().forEach(group => {
    group.traverse(child => {
      if (child.isMesh) {
        child.userData.deviceId = dev.id;
        raycastMeshes.push(child);
      }
    });
  });
});

// ════════════════════════════════════════════════════════════
//  PAINEL LATERAL — referências ao DOM
// ════════════════════════════════════════════════════════════

const panel       = document.getElementById('panel');
const panelName   = document.getElementById('panel-name');
const panelModel  = document.getElementById('panel-model');
const pillMacVal  = document.getElementById('pill-mac-val');
const pillRunVal  = document.getElementById('pill-run-val');
const rtRows      = document.getElementById('realtime-rows');
const dnRows      = document.getElementById('dn-rows');
const gaugesCont  = document.getElementById('gauges');
const logTerm     = document.getElementById('log-term');
const tooltip     = document.getElementById('tooltip');

let activeDevice = null;

/** Renderiza uma linha de dado (chave → valor) */
function renderDataRows(container, rows) {
  container.innerHTML = rows.map(r => `
    <div class="data-row">
      <span class="data-key">${r.k}</span>
      <span class="data-val ${r.cls || ''}">${r.v}</span>
    </div>
  `).join('');
}

/** Renderiza as barras de consumo */
function renderGauges(container, gauges) {
  container.innerHTML = gauges.map(g => {
    const pct   = Math.round(g.v / g.max * 100);
    const label = g.suffix ? g.v + g.suffix : pct + '%';
    return `
      <div class="gauge-wrap">
        <div class="gauge-label">
          <span>${g.l}</span><span>${label}</span>
        </div>
        <div class="gauge-track">
          <div class="gauge-fill ${g.cls}" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

/** Abre o painel com os dados do dispositivo selecionado */
function openPanel(dev) {
  activeDevice = dev;

  panelName.textContent  = dev.name;
  panelModel.textContent = dev.model;
  pillMacVal.textContent = '0' + dev.mac;
  pillRunVal.textContent = dev.state;

  renderDataRows(rtRows,   dev.realtime);
  renderDataRows(dnRows,   dev.dn);
  renderGauges(gaugesCont, dev.gauges);

  logTerm.innerHTML = dev.log.map(l =>
    `<div><span class="log-ts">${l.ts}</span>${l.msg}</div>`
  ).join('');
  logTerm.scrollTop = logTerm.scrollHeight;

  panel.classList.add('open');
}

function closePanel() {
  panel.classList.remove('open');
  activeDevice = null;
  resetCamera();
}

document.getElementById('panel-close').addEventListener('click', closePanel);
document.getElementById('btn-reset').addEventListener('click',   closePanel);

// ════════════════════════════════════════════════════════════
//  TRANSIÇÃO SUAVE DE CÂMERA (lerp com ease-in-out)
// ════════════════════════════════════════════════════════════

function easeInOut(t) {
  return t < .5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Inicia a transição da câmera para o close-up de um dispositivo */
function flyTo(dev) {
  lerpStart.pos.copy(camera.position);
  lerpStart.look.copy(controls.target);
  lerpTarget.pos.copy(dev.camPos);
  lerpTarget.look.copy(dev.camLook);
  lerpT       = 0;
  camLerping  = true;
  controls.enabled = false;
}

/** Retorna a câmera para a visão geral da fábrica */
function resetCamera() {
  lerpStart.pos.copy(camera.position);
  lerpStart.look.copy(controls.target);
  lerpTarget.pos.set(0, 12, 22);
  lerpTarget.look.set(0, 1, 0);
  lerpT       = 0;
  camLerping  = true;
  controls.enabled = false;
}

// ════════════════════════════════════════════════════════════
//  EVENTOS DE MOUSE — hover (tooltip) e clique
// ════════════════════════════════════════════════════════════

renderer.domElement.addEventListener('mousedown', e => {
  isMouseDown = true;
  mouseDownPos.set(e.clientX, e.clientY);
});

renderer.domElement.addEventListener('mousemove', e => {
  // Calcula NDC para raycasting
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(raycastMeshes, false);

  if (hits.length > 0) {
    const dev = DEVICE_DATA.find(d => d.id === hits[0].object.userData.deviceId);
    tooltip.textContent = 'Clique para inspecionar: ' + dev.name;
    tooltip.style.left  = e.clientX + 'px';
    tooltip.style.top   = (e.clientY - 10) + 'px';
    tooltip.classList.add('show');
    renderer.domElement.style.cursor = 'pointer';
  } else {
    tooltip.classList.remove('show');
    renderer.domElement.style.cursor = 'default';
  }
});

renderer.domElement.addEventListener('mouseup', e => {
  if (!isMouseDown) return;
  isMouseDown = false;

  // Ignora se foi um arrasto (drag > 5px)
  const dx = e.clientX - mouseDownPos.x;
  const dy = e.clientY - mouseDownPos.y;
  if (Math.sqrt(dx * dx + dy * dy) > 5) return;

  // Verifica hit no ponto do clique
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObjects(raycastMeshes, false);

  if (hits.length > 0) {
    const dev = DEVICE_DATA.find(d => d.id === hits[0].object.userData.deviceId);
    openPanel(dev);
    flyTo(dev);
  }
});

// ════════════════════════════════════════════════════════════
//  SIMULAÇÃO DE DADOS EM TEMPO REAL
// ════════════════════════════════════════════════════════════

let simHz      = 60.0;   // frequência simulada do inversor
let simHzDir   =  1;     // direção da variação
let sensorDetected = true;

const kpiVel  = document.getElementById('kpi-vel');
const kpiPkts = document.getElementById('kpi-pkts');
let packetCount = 0;

setInterval(() => {
  // Oscilação realista da frequência (±0.3 Hz)
  simHz += simHzDir * (Math.random() * .08);
  if (simHz > 60.3) simHzDir = -1;
  if (simHz < 59.7) simHzDir =  1;
  kpiVel.textContent = simHz.toFixed(1) + ' Hz';

  // Sensor alterna aleatoriamente (simula passagem de caixas)
  if (Math.random() < .12) sensorDetected = !sensorDetected;

  // Atualiza o painel se estiver aberto
  if (!activeDevice) return;

  if (activeDevice.id === 'inv') {
    const rt = activeDevice.realtime;
    rt[1].v = simHz.toFixed(1) + ' Hz';
    rt[2].v = (11.8 + Math.random() * .8).toFixed(1) + ' A';
    rt[4].v = Math.round(simHz / 60 * 1780) + ' RPM';
    renderDataRows(rtRows, rt);

    // Atualiza primeira barra de gauge (frequência)
    const fill = gaugesCont.querySelector('.gauge-fill');
    if (fill) fill.style.width = (simHz / 60 * 100) + '%';
  }

  if (activeDevice.id === 'sensor') {
    const label = sensorDetected ? 'SIM — PALETE' : 'NÃO — LIVRE';
    const cls   = sensorDetected ? 'ok'           : 'warn';
    activeDevice.realtime[1] = { k: 'Objeto Detectado', v: label, cls };
    activeDevice.realtime[4] = {
      k:   'Saída Digital',
      v:   sensorDetected ? 'Q0 = HIGH' : 'Q0 = LOW',
      cls: sensorDetected ? 'ok' : 'warn',
    };
    renderDataRows(rtRows, activeDevice.realtime);
  }

}, 800);
