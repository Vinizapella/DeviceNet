/**
 * main.js
 * Loop principal de animação (requestAnimationFrame).
 * Orquestra: câmera lerp, scroll da correia, pulsos de rede,
 * caixas de produto, iluminação dinâmica e renderização.
 */

// ── Utilitário de carregamento ─────────────────────────────
function setLoadProgress(pct, msg) {
  document.getElementById('loading-fill').style.width = pct + '%';
  if (msg) document.getElementById('loading-msg').textContent = msg;
}

// Indica que a cena está pronta
setLoadProgress(100, 'Pronto!');

// ════════════════════════════════════════════════════════════
//  LOOP DE ANIMAÇÃO
// ════════════════════════════════════════════════════════════

let frameCount = 0;

function animate() {
  requestAnimationFrame(animate);
  frameCount++;

  const time = frameCount * 0.016; // tempo em segundos (aprox. 60fps)

  // ── 1. Transição suave de câmera (lerp) ──────────────────
  if (camLerping) {
    lerpT = Math.min(1, lerpT + 0.016 / LERP_DURATION);
    const alpha = easeInOut(lerpT);

    camera.position.lerpVectors(lerpStart.pos, lerpTarget.pos, alpha);
    controls.target.lerpVectors(lerpStart.look, lerpTarget.look, alpha);
    controls.update();

    if (lerpT >= 1) {
      camLerping = false;
      controls.enabled = true;
      controls.target.copy(lerpTarget.look);
    }
  } else {
    controls.update();
  }

  // ── 2. Caixas de produto sobre a esteira ─────────────────
  productBoxes.forEach((box, i) => {
    // Move na direção X sincronizado com a frequência simulada
    box.position.x += 0.012 * (simHz / 60);

    // Volta ao início quando sai do final da esteira
    if (box.position.x > BELT_LEN / 2 + 1) {
      box.position.x = -BELT_LEN / 2 + 0.5;
      box.position.z = (Math.random() - 0.5) * 0.4;
    }

    // Pequeno balanço lateral (vibração da esteira)
    box.rotation.y = Math.sin(time * 0.3 + i * 0.8) * 0.015;
  });

  // ── 3. Scroll da textura da correia ──────────────────────
  beltTex.offset.x -= 0.003 * (simHz / 60);

  // ── 4. Pulsos de dados DeviceNet ─────────────────────────
  pulseObjects.forEach(p => {
    p.t += p.speed;

    // Quando completa o percurso, reinicia e conta o frame CAN
    if (p.t >= 1) {
      p.t -= 1;
      packetCount++;
      kpiPkts.textContent = packetCount;
    }

    // Posição atual na curva
    const pos = p.curve.getPoint(p.t);
    p.mesh.position.copy(pos);

    // Cintilação elétrica aleatória
    const flicker = 0.7 + Math.random() * 0.35;
    p.mat.opacity = flicker;
    p.mesh.scale.setScalar(0.85 + Math.sin(p.t * Math.PI * 10 + frameCount * 0.2) * 0.2);

    // Atualiza posição da cauda
    p.trail.forEach((trailMesh, i) => {
      const tPast = Math.max(0, p.t - i * 0.015);
      trailMesh.position.copy(p.curve.getPoint(tPast));
      trailMesh.material.opacity = (0.28 - i * 0.035) * flicker;
    });
  });

  // ── 5. Luzes de destaque dos dispositivos (pulsação) ─────
  plcLight.intensity  = 2.5 + Math.sin(time * 2.7) * 0.7;
  invLight.intensity  = 2.5 + Math.sin(time * 2.1 + 1.2) * 0.7;

  // Sensor pisca mais forte quando detecta objeto
  sensLight.intensity = (sensorDetected ? 3.5 : 1.5)
    + Math.sin(time * 3.5 + 2) * 0.5;

  // ── 6. Cintilação sutil das luminárias industriais ────────
  lampLights.forEach((lamp, i) => {
    lamp.intensity = 27 + Math.sin(time * 0.8 + i * 0.5) * 0.8;
  });

  // ── 7. Render final ───────────────────────────────────────
  renderer.render(scene, camera);
}

// ════════════════════════════════════════════════════════════
//  INICIALIZAÇÃO — oculta o loading e inicia o loop
// ════════════════════════════════════════════════════════════

setTimeout(() => {
  const loadingEl = document.getElementById('loading');
  loadingEl.style.opacity = '0';
  setTimeout(() => loadingEl.remove(), 700);
  animate();
}, 500);
