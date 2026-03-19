/**
 * devices.js
 * Modela todos os equipamentos físicos da linha de envasamento:
 *  - Esteira transportadora (correia, rolos, suportes, motor)
 *  - Armário elétrico com CLP WEG PLC300
 *  - Inversor de Frequência WEG CFW700
 *  - Sensor Fotoelétrico WEG PS-F18
 *  - Caixas animadas sobre a esteira
 */

// ════════════════════════════════════════════════════════════
//  CONSTANTES DA ESTEIRA
// ════════════════════════════════════════════════════════════

const BELT_LEN = 18;  // comprimento total (metros)
const BELT_W   = 2.2; // largura útil
const BELT_H   = 0.95; // altura do plano da correia

// Textura da correia (usada também em main.js para scroll)
const beltTex = createBeltTexture();

// ════════════════════════════════════════════════════════════
//  ESTEIRA TRANSPORTADORA
// ════════════════════════════════════════════════════════════

function buildConveyor() {
  const frameMat = new THREE.MeshStandardMaterial({ ...metalTex(0x7a8898, .4) });

  // Trilhos laterais e apoios verticais
  [-BELT_W / 2, BELT_W / 2].forEach(z => {
    // Trilho horizontal
    const rail = new THREE.Mesh(new THREE.BoxGeometry(BELT_LEN, .1, .12), frameMat);
    rail.position.set(0, BELT_H, z);
    rail.castShadow = rail.receiveShadow = true;
    scene.add(rail);

    // Pernas de suporte a cada 2 metros
    for (let x = -7; x <= 7; x += 2) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(.08, BELT_H, .08), frameMat);
      leg.position.set(x, BELT_H / 2, z);
      leg.castShadow = leg.receiveShadow = true;
      scene.add(leg);
    }
  });

  // Travessas inferiores de estabilização
  for (let x = -7; x <= 7; x += 2) {
    const xbeam = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, BELT_W + .3), frameMat);
    xbeam.position.set(x, .12, 0);
    scene.add(xbeam);
  }

  // Travessas entre pernas (diagonal cross-bracing)
  for (let x = -7; x < 7; x += 2) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, BELT_W), frameMat);
    brace.position.set(x + 1, .3, 0);
    scene.add(brace);
  }

  // Superfície da correia (textura scrollável)
  const beltSurface = new THREE.Mesh(
    new THREE.BoxGeometry(BELT_LEN, .05, BELT_W - .15),
    new THREE.MeshStandardMaterial({ map: beltTex, roughness: .88, metalness: .05 })
  );
  beltSurface.position.set(0, BELT_H + .03, 0);
  beltSurface.castShadow = beltSurface.receiveShadow = true;
  scene.add(beltSurface);

  // Rolos nas extremidades
  const rollerMat = new THREE.MeshStandardMaterial({ ...metalTex(0x8898a8, .3) });
  [-BELT_LEN / 2, BELT_LEN / 2].forEach(x => {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(BELT_H * .18, BELT_H * .18, BELT_W + .1, 20),
      rollerMat
    );
    roller.rotation.z = Math.PI / 2;
    roller.position.set(x, BELT_H, 0);
    roller.castShadow = true;
    scene.add(roller);
  });
}

// ════════════════════════════════════════════════════════════
//  MOTOR DE ACIONAMENTO (extremidade esquerda da esteira)
// ════════════════════════════════════════════════════════════

function buildDriveMotor() {
  const motorGroup = new THREE.Group();
  const motorMat   = new THREE.MeshStandardMaterial({ ...metalTex(0x4a5060, .4) });
  const endCapMat  = new THREE.MeshStandardMaterial({ ...metalTex(0x606878, .35) });

  // Corpo cilíndrico do motor
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .55, 16), motorMat);
  body.rotation.z = Math.PI / 2;
  motorGroup.add(body);

  // Tampa de ventilação na traseira
  const endCap = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .12, 16), endCapMat);
  endCap.rotation.z = Math.PI / 2;
  endCap.position.x = .34;
  motorGroup.add(endCap);

  // Caixa de bornes no topo
  const termBox = new THREE.Mesh(
    new THREE.BoxGeometry(.2, .14, .22),
    new THREE.MeshStandardMaterial({ color: 0x2a2e38, roughness: .6, metalness: .3 })
  );
  termBox.position.y = .3;
  motorGroup.add(termBox);

  motorGroup.position.set(-BELT_LEN / 2 - .3, BELT_H, 0);
  motorGroup.castShadow = true;
  scene.add(motorGroup);

  return motorGroup;
}

// ════════════════════════════════════════════════════════════
//  ARMÁRIO ELÉTRICO COM CLP WEG PLC300
// ════════════════════════════════════════════════════════════

function buildElectricalCabinet() {
  const cabinetGroup = new THREE.Group();

  // Carcaça principal (aço RAL 7035)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(.7, 1.8, .5),
    new THREE.MeshStandardMaterial({ color: 0xc8cac8, roughness: .5, metalness: .6 })
  );
  body.castShadow = body.receiveShadow = true;
  cabinetGroup.add(body);

  // Porta frontal
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(.68, 1.76, .04),
    new THREE.MeshStandardMaterial({ color: 0xdcdede, roughness: .45, metalness: .55 })
  );
  door.position.z = .27;
  cabinetGroup.add(door);

  // Faixa azul WEG no topo da porta
  const wegStripe = new THREE.Mesh(
    new THREE.BoxGeometry(.66, .1, .05),
    new THREE.MeshStandardMaterial({
      color: 0x1a5fa0, roughness: .4, metalness: .3,
      emissive: 0x071d40, emissiveIntensity: .4
    })
  );
  wegStripe.position.set(0, .8, .29);
  cabinetGroup.add(wegStripe);

  // Janela de inspeção (acrílico escuro)
  const inspWindow = new THREE.Mesh(
    new THREE.BoxGeometry(.38, .45, .01),
    new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: .2, transparent: true, opacity: .85 })
  );
  inspWindow.position.set(0, .25, .3);
  cabinetGroup.add(inspWindow);

  // Manivela de abertura
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(.04, .2, .06),
    new THREE.MeshStandardMaterial({ ...metalTex(0x888888, .3) })
  );
  handle.position.set(.28, -.2, .29);
  cabinetGroup.add(handle);

  // LEDs indicadores: verde (energizado) e vermelho (falha)
  [[0x00ee60, .38], [0xff2020, .25]].forEach(([color, offsetY]) => {
    const led = new THREE.Mesh(
      new THREE.CylinderGeometry(.028, .028, .04, 12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.8 })
    );
    led.rotation.x = Math.PI / 2;
    led.position.set(.2, offsetY, .3);
    cabinetGroup.add(led);
  });

  cabinetGroup.position.set(-9, .9, -3.5);
  cabinetGroup.rotation.y = 0.25;
  scene.add(cabinetGroup);

  // CLP PLC300 visível através da janela de inspeção
  buildPLC300InsideWindow();

  return cabinetGroup;
}

function buildPLC300InsideWindow() {
  const plcGroup = new THREE.Group();

  // Corpo do CLP
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(.32, .45, .1),
    new THREE.MeshStandardMaterial({ color: 0x22252c, roughness: .6, metalness: .2 })
  );
  plcGroup.add(body);

  // Logotipo WEG (faixa azul)
  const logo = new THREE.Mesh(
    new THREE.BoxGeometry(.3, .055, .02),
    new THREE.MeshStandardMaterial({ color: 0x1a5fa0, emissive: 0x071d40, emissiveIntensity: .5 })
  );
  logo.position.set(0, .18, .06);
  plcGroup.add(logo);

  // Display do PLC
  const display = new THREE.Mesh(
    new THREE.BoxGeometry(.22, .14, .02),
    new THREE.MeshStandardMaterial({ color: 0x0a1a10, emissive: 0x003010, emissiveIntensity: .8 })
  );
  display.position.set(0, .03, .06);
  plcGroup.add(display);

  // LEDs de status (verde/verde/vermelho/vermelho)
  const ledColors = [0x00ff60, 0x00ff60, 0xff2020, 0xff2020];
  ledColors.forEach((color, i) => {
    const led = new THREE.Mesh(
      new THREE.CircleGeometry(.01, 8),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2 })
    );
    led.rotation.x = -Math.PI / 2;
    led.rotation.z =  Math.PI / 2;
    led.position.set(.08 - i * .055, -.1, .065);
    plcGroup.add(led);
  });

  plcGroup.position.set(-9, 1.15, -3.25);
  plcGroup.rotation.y = 0.25;
  scene.add(plcGroup);

  return plcGroup;
}

// ════════════════════════════════════════════════════════════
//  INVERSOR WEG CFW700 (parede ao lado do motor)
// ════════════════════════════════════════════════════════════

function buildInverter() {
  const invGroup = new THREE.Group();
  const finMat   = new THREE.MeshStandardMaterial({ ...metalTex(0x8898a8, .38) });

  // Placa de fixação na parede
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(.6, .72, .06),
    new THREE.MeshStandardMaterial({ ...metalTex(0x8898a8, .4) })
  );
  invGroup.add(plate);

  // Corpo principal do inversor
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(.52, .64, .36),
    new THREE.MeshStandardMaterial({ color: 0x28292e, roughness: .6, metalness: .25 })
  );
  body.position.z = .21;
  invGroup.add(body);

  // Aletas do dissipador de calor (alumínio)
  for (let i = 0; i < 7; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.5, .03, .18), finMat);
    fin.position.set(0, .24 - i * .1, .05);
    invGroup.add(fin);
  }

  // Faixa laranja WEG
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(.5, .045, .04),
    new THREE.MeshStandardMaterial({ color: 0xd45a00, roughness: .5, emissive: 0x401800, emissiveIntensity: .3 })
  );
  strip.position.set(0, .28, .39);
  invGroup.add(strip);

  // Display verde (frequência em tempo real)
  const displayTex = createDisplayTexture((ctx, w, h) => {
    ctx.fillStyle = '#04100a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#00e860';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('60.0 Hz', 6, 22);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#00b040';
    ctx.fillText('CFW700',    6, 38);
    ctx.fillText('MAC:01 FWD',6, 52);
    ctx.fillText('I=12.4A',   6, 66);
  });
  const display = new THREE.Mesh(
    new THREE.BoxGeometry(.32, .2, .02),
    new THREE.MeshStandardMaterial({ map: displayTex, roughness: .25, emissive: 0x002808, emissiveIntensity: .7 })
  );
  display.position.set(0, .06, .4);
  invGroup.add(display);

  // Botão STOP (vermelho)
  const stopBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(.032, .032, .025, 12),
    new THREE.MeshStandardMaterial({ color: 0xcc1010, emissive: 0x300000, emissiveIntensity: .4 })
  );
  stopBtn.rotation.x = Math.PI / 2;
  stopBtn.position.set(-.12, -.24, .4);
  invGroup.add(stopBtn);

  // Botão RUN (verde)
  const runBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(.032, .032, .025, 12),
    new THREE.MeshStandardMaterial({ color: 0x10aa20, emissive: 0x002800, emissiveIntensity: .5 })
  );
  runBtn.rotation.x = Math.PI / 2;
  runBtn.position.set(.08, -.24, .4);
  invGroup.add(runBtn);

  // Prensa-cabos na base
  for (let i = -1; i <= 1; i++) {
    const gland = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, .08, 10), finMat);
    gland.position.set(i * .16, -.36, .21);
    invGroup.add(gland);
  }

  invGroup.position.set(-BELT_LEN / 2 - .05, 1.4, 2.0);
  invGroup.rotation.y = Math.PI / 2;
  invGroup.traverse(c => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; } });
  scene.add(invGroup);

  return invGroup;
}

// ════════════════════════════════════════════════════════════
//  SENSOR FOTOELÉTRICO WEG PS-F18 (lateral da esteira)
// ════════════════════════════════════════════════════════════

function buildPhotoelectricSensor() {
  const sensGroup  = new THREE.Group();
  const bracketMat = new THREE.MeshStandardMaterial({ ...metalTex(0x7a8898, .35) });

  // Suporte vertical e braço horizontal
  const arm = new THREE.Mesh(new THREE.BoxGeometry(.05, 1.0, .05), bracketMat);
  arm.position.y = .5;
  sensGroup.add(arm);

  const bracket = new THREE.Mesh(new THREE.BoxGeometry(.45, .04, .04), bracketMat);
  bracket.position.set(.22, 1.02, 0);
  sensGroup.add(bracket);

  // Corpo do sensor (plástico PA66 preto)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(.38, .6, .28),
    new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: .65, metalness: .15 })
  );
  body.position.set(.44, 1.0, 0);
  sensGroup.add(body);

  // Lente âmbar (policarbonato)
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(.1, .1, .08, 20),
    new THREE.MeshStandardMaterial({
      color: 0x804000, roughness: .05,
      transparent: true, opacity: .85,
      emissive: 0x201000, emissiveIntensity: .5
    })
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.set(.64, 1.0, 0);
  sensGroup.add(lens);

  // Núcleo emissor (infravermelho visível)
  const emitter = new THREE.Mesh(
    new THREE.CircleGeometry(.07, 20),
    new THREE.MeshStandardMaterial({
      color: 0xffa000, emissive: 0xff6000,
      emissiveIntensity: 2.5, transparent: true, opacity: .9
    })
  );
  emitter.rotation.y = -Math.PI / 2;
  emitter.position.set(.69, 1.0, 0);
  sensGroup.add(emitter);

  // LED de status (verde)
  const statusLED = new THREE.Mesh(
    new THREE.CircleGeometry(.02, 10),
    new THREE.MeshStandardMaterial({ color: 0x00ff60, emissive: 0x00ff60, emissiveIntensity: 2.5 })
  );
  statusLED.rotation.y = Math.PI;
  statusLED.position.set(.26, 1.14, -.15);
  sensGroup.add(statusLED);

  // Etiqueta de identificação
  const label = new THREE.Mesh(
    new THREE.BoxGeometry(.34, .18, .005),
    new THREE.MeshStandardMaterial({ color: 0xc8ccd6, roughness: .9 })
  );
  label.position.set(.44, .83, -.145);
  sensGroup.add(label);

  // Cabo pigtail (segmentos curvados)
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(.018, .018, .1, 8),
      new THREE.MeshStandardMaterial(rubberTex(0x202428))
    );
    seg.position.set(.44, .62 - i * .09, 0);
    seg.rotation.z = Math.sin(i * .8) * .15; // curva natural
    sensGroup.add(seg);
  }

  sensGroup.position.set(3, 0, BELT_W / 2 + .1);
  sensGroup.traverse(c => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; } });
  scene.add(sensGroup);

  return sensGroup;
}

// ════════════════════════════════════════════════════════════
//  CAIXAS DE PRODUTO ANIMADAS NA ESTEIRA
// ════════════════════════════════════════════════════════════

const BOX_COLORS   = [0xe8c84a, 0x4a90e8, 0xd04040, 0x48c870, 0xe8883a, 0xd0d0d0];
const BOX_SPACING  = 4.5;
const NUM_BOXES    = 4;

function buildProductBoxes() {
  const boxes = [];

  for (let i = 0; i < NUM_BOXES; i++) {
    const group = new THREE.Group();
    const color = BOX_COLORS[i % BOX_COLORS.length];

    // Caixa de papelão
    const carton = new THREE.Mesh(
      new THREE.BoxGeometry(.7, .6, .55),
      new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: .02 })
    );
    carton.castShadow = carton.receiveShadow = true;
    group.add(carton);

    // Fita adesiva dourada
    const tape = new THREE.Mesh(
      new THREE.BoxGeometry(.72, .08, .56),
      new THREE.MeshStandardMaterial({ color: 0xd4a000, roughness: .7 })
    );
    tape.position.y = .1;
    group.add(tape);

    // Etiqueta frontal
    const sticker = new THREE.Mesh(
      new THREE.BoxGeometry(.4, .2, .01),
      new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: .9 })
    );
    sticker.position.set(0, 0, .285);
    group.add(sticker);

    group.position.set(
      -BELT_LEN / 2 + 1 + i * BOX_SPACING,
      BELT_H + .33,
      (Math.random() - .5) * .3
    );
    scene.add(group);
    boxes.push(group);
  }

  return boxes;
}

// ════════════════════════════════════════════════════════════
//  INSTANCIAR TUDO E EXPORTAR REFERÊNCIAS
// ════════════════════════════════════════════════════════════

const motorGroup    = buildDriveMotor();
const cabinetGroup  = buildElectricalCabinet();
const plcSmall      = buildPLC300InsideWindow();  // já chamado internamente, mas referenciado
const invGroup      = buildInverter();
const sensGroup     = buildPhotoelectricSensor();
const productBoxes  = buildProductBoxes();
buildConveyor();

// Posicionamento das luzes de destaque
plcLight.position.set(-9, 1.5, -2.5);
invLight.position.set(-BELT_LEN / 2, 1.5, 2.5);
sensLight.position.set(3, 1.5, BELT_W / 2 + 1);
