/**
 * textures.js
 * Geração procedural de texturas usando Canvas 2D.
 * Cada função retorna um THREE.MeshStandardMaterial ou THREE.Texture pronto para uso.
 */

// ── Utilitários ────────────────────────────────────────────────────

/** Cria um canvas e executa uma função de desenho nele. */
function mkCanvas(w, h, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  drawFn(canvas.getContext('2d'), w, h);
  return canvas;
}

/** Cria um THREE.CanvasTexture repetível a partir de uma função de desenho. */
function mkTex(w, h, drawFn) {
  const tex = new THREE.CanvasTexture(mkCanvas(w, h, drawFn));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ── Texturas do ambiente ───────────────────────────────────────────

/**
 * Chão de placa diamante (diamond plate) em grade metálica.
 * Retorna um THREE.Texture configurado com repeat.
 */
function createFloorTexture() {
  const tex = mkTex(256, 256, (ctx, w, h) => {
    // Fundo azul-escuro
    ctx.fillStyle = '#1a1e26';
    ctx.fillRect(0, 0, w, h);

    // Grade de linhas metálicas
    ctx.strokeStyle = 'rgba(80, 100, 130, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= w; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let j = 0; j <= h; j += 16) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
    }

    // Losangos (diamantes) em cada interseção
    for (let gx = 8; gx < w; gx += 16) {
      for (let gy = 8; gy < h; gy += 16) {
        ctx.fillStyle = 'rgba(100, 130, 170, 0.12)';
        ctx.beginPath();
        ctx.moveTo(gx, gy - 4);
        ctx.lineTo(gx + 4, gy);
        ctx.lineTo(gx, gy + 4);
        ctx.lineTo(gx - 4, gy);
        ctx.closePath();
        ctx.fill();
      }
    }
  });

  tex.repeat.set(10, 10);
  return tex;
}

/**
 * Superfície da correia transportadora com nervuras horizontais.
 * Retorna um THREE.Texture configurado com repeat.
 */
function createBeltTexture() {
  const tex = mkTex(64, 512, (ctx, w, h) => {
    ctx.fillStyle = '#1c1e1a';
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y += 18) {
      // Nervura escura
      ctx.fillStyle = 'rgba(60, 65, 55, 0.7)';
      ctx.fillRect(0, y, w, 4);
      // Espaço entre nervuras
      ctx.fillStyle = 'rgba(30, 32, 28, 0.4)';
      ctx.fillRect(0, y + 4, w, 14);
    }
  });

  tex.repeat.set(1, 6);
  return tex;
}

// ── Texturas de materiais ──────────────────────────────────────────

/**
 * Retorna as propriedades de um material metálico escovado (brushed metal).
 * @param {number} hexColor - Cor base em hexadecimal (ex: 0x8898a8)
 * @param {number} roughness - Rugosidade (0 = espelho, 1 = muito fosco)
 */
function metalTex(hexColor, roughness = 0.35) {
  const tex = mkTex(256, 128, (ctx, w, h) => {
    const color = new THREE.Color(hexColor);
    ctx.fillStyle = `rgb(${(color.r * 255) | 0}, ${(color.g * 255) | 0}, ${(color.b * 255) | 0})`;
    ctx.fillRect(0, 0, w, h);

    // Linhas horizontais finas simulando escovado
    for (let y = 0; y < h; y++) {
      const brightness = (Math.random() - 0.5) * 20;
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.abs(brightness) / 500})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  });

  tex.repeat.set(2, 1);
  return { map: tex, roughness, metalness: 0.8 };
}

/**
 * Retorna as propriedades de um material de borracha industrial (cabos, vedações).
 * @param {number} hexColor - Cor base
 */
function rubberTex(hexColor) {
  const tex = mkTex(64, 256, (ctx, w, h) => {
    const color = new THREE.Color(hexColor);
    ctx.fillStyle = `rgb(${(color.r * 255) | 0}, ${(color.g * 255) | 0}, ${(color.b * 255) | 0})`;
    ctx.fillRect(0, 0, w, h);

    // Nervuras verticais da borracha
    for (let x = 0; x < w; x += 5) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
  });

  tex.repeat.set(3, 1);
  return { map: tex, roughness: 0.88, metalness: 0.02 };
}

/**
 * Cria um canvas de texto para displays LCD/LED industriais.
 * @param {Function} drawFn - Função que recebe (ctx, w, h) e desenha o conteúdo
 */
function createDisplayTexture(drawFn) {
  return new THREE.CanvasTexture(mkCanvas(128, 80, drawFn));
}
