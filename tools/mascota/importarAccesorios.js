// Importa los SVG de accesorios de app/mascota/assets/accesorios/ al pipeline
// de nodos de los sprites (objetos planos { t, ...attrs }, ver sprites/geometria.js).
//
// Se corre a mano y NUNCA se edita la salida:
//   node tools/mascota/importarAccesorios.js
//
// Por qué convertir en vez de importar el .svg en tiempo de ejecución: el sprite
// de la mascota se compone dentro de UN solo <Svg> (el rig agrupa cuerpo, cara y
// frente para animarlos juntos). Un componente SVG importado traería su propio
// <Svg> raíz, así que habría dos pipelines de render conviviendo. Convirtiendo a
// nodos, un accesorio es geometría más y el rig no se entera.
//
// Qué hace con cada archivo:
//   · extrae los <path d fill> en orden de dibujo
//   · normaliza todos los comandos a absolutos y redondea a 1 decimal (a escala
//     1024 eso es muy por debajo de un píxel una vez reducido a ~30 unidades)
//   · calcula el bounding box del arte y lo guarda como metadato
//
// El bbox se calcula sobre el casco de puntos de control: una curva de Bézier
// siempre queda contenida en la envolvente convexa de sus puntos, así que el
// resultado puede ser un pelo más grande que el ajustado, nunca más chico. Es lo
// que se quiere acá — sirve para centrar y escalar, no para recortar.
//
// Va un bbox POR VARIANTE, no uno unificado por accesorio. Las variantes de un
// mismo id no son recoloreos: son dibujos distintos, con siluetas de distinta
// altura. Con una caja común, la variante más chica queda flotando sobre la
// coronilla en vez de apoyarse. Que cada una se asiente bien vale más que que no
// se muevan entre sí al cambiar de color.
const fs = require('fs');
const path = require('path');

const ORIGEN = path.join(__dirname, '..', '..', 'app', 'mascota', 'assets', 'accesorios');
const DESTINO = path.join(
  __dirname, '..', '..', 'app', 'mascota', 'sprites', 'accesorios', 'trazos.generado.js',
);

// id del catálogo → archivos, en orden de variante. La variante 0 es la que se
// usa por defecto; la 1 es la alternativa de color que vino en el mismo pack.
const FUENTES = {
  'lentes-sol': ['cool-sunglasses.svg', 'cool-sunglasses (1).svg'],
  'sombrero-fiesta': ['cute-pastel-party-hat.svg', 'cute-pastel-party-hat (1).svg'],
  'gorrito-noche': [
    'isolated-cozy-sleeping-night-cap--standalone-item-.svg',
    'isolated-cozy-sleeping-night-cap--standalone-item- (1).svg',
  ],
};

// ── Parser de path data ─────────────────────────────────────────────────────
const ARGS = {
  M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0,
};

function tokenizar(d) {
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)/g;
  const tokens = [];
  let m = re.exec(d);
  while (m !== null) {
    tokens.push(m[1] ? { cmd: m[1] } : { num: parseFloat(m[2]) });
    m = re.exec(d);
  }
  return tokens;
}

// Devuelve segmentos absolutos: [{ cmd: 'M'|'L'|'C'|'Q'|'Z', args: [...] }].
// H/V se resuelven a L, y S/T a su C/Q equivalente reflejando el control previo,
// para que la emisión y el bbox trabajen con un alfabeto chico.
function aAbsolutos(d, archivo) {
  const tokens = tokenizar(d);
  const salida = [];
  let i = 0;
  let cmd = null;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  // Último control de C/S y de Q/T, para la reflexión de los comandos suaves.
  let ctrlC = null;
  let ctrlQ = null;

  const leer = (n) => {
    const args = [];
    for (let k = 0; k < n; k += 1) {
      const t = tokens[i];
      if (!t || t.num === undefined) {
        throw new Error(`${archivo}: faltan argumentos para "${cmd}"`);
      }
      args.push(t.num);
      i += 1;
    }
    return args;
  };

  while (i < tokens.length) {
    if (tokens[i].cmd) {
      cmd = tokens[i].cmd;
      i += 1;
    } else if (cmd === 'M') {
      cmd = 'L'; // pares extra de un moveto son linetos implícitos
    } else if (cmd === 'm') {
      cmd = 'l';
    } else if (!cmd) {
      throw new Error(`${archivo}: el path empieza sin comando`);
    }

    const may = cmd.toUpperCase();
    if (may === 'A') {
      throw new Error(`${archivo}: comando de arco "A" no soportado por el importador`);
    }
    if (ARGS[may] === undefined) throw new Error(`${archivo}: comando desconocido "${cmd}"`);

    const rel = cmd !== may;
    const a = leer(ARGS[may]);
    const px = rel ? x : 0;
    const py = rel ? y : 0;

    if (may === 'Z') {
      salida.push({ cmd: 'Z', args: [] });
      x = sx;
      y = sy;
      ctrlC = null;
      ctrlQ = null;
    } else if (may === 'M') {
      x = px + a[0];
      y = py + a[1];
      sx = x;
      sy = y;
      salida.push({ cmd: 'M', args: [x, y] });
      ctrlC = null;
      ctrlQ = null;
    } else if (may === 'L' || may === 'H' || may === 'V') {
      if (may === 'H') x = px + a[0];
      else if (may === 'V') y = py + a[0];
      else {
        x = px + a[0];
        y = py + a[1];
      }
      salida.push({ cmd: 'L', args: [x, y] });
      ctrlC = null;
      ctrlQ = null;
    } else if (may === 'C' || may === 'S') {
      let c1x;
      let c1y;
      let c2x;
      let c2y;
      if (may === 'C') {
        [c1x, c1y, c2x, c2y] = [px + a[0], py + a[1], px + a[2], py + a[3]];
        x = px + a[4];
        y = py + a[5];
      } else {
        // El primer control de S es el reflejo del segundo control anterior.
        c1x = ctrlC ? 2 * x - ctrlC[0] : x;
        c1y = ctrlC ? 2 * y - ctrlC[1] : y;
        [c2x, c2y] = [px + a[0], py + a[1]];
        x = px + a[2];
        y = py + a[3];
      }
      salida.push({ cmd: 'C', args: [c1x, c1y, c2x, c2y, x, y] });
      ctrlC = [c2x, c2y];
      ctrlQ = null;
    } else {
      let qx;
      let qy;
      if (may === 'Q') {
        [qx, qy] = [px + a[0], py + a[1]];
        x = px + a[2];
        y = py + a[3];
      } else {
        qx = ctrlQ ? 2 * x - ctrlQ[0] : x;
        qy = ctrlQ ? 2 * y - ctrlQ[1] : y;
        x = px + a[0];
        y = py + a[1];
      }
      salida.push({ cmd: 'Q', args: [qx, qy, x, y] });
      ctrlQ = [qx, qy];
      ctrlC = null;
    }
  }
  return salida;
}

const redondear = (n) => Math.round(n * 10) / 10;

function emitir(segmentos) {
  return segmentos.map(({ cmd, args }) => {
    if (cmd === 'Z') return 'Z';
    const pares = [];
    for (let k = 0; k < args.length; k += 2) {
      pares.push(`${redondear(args[k])},${redondear(args[k + 1])}`);
    }
    return cmd + pares.join(' ');
  }).join('');
}

function puntosDe(segmentos) {
  const puntos = [];
  for (const { args } of segmentos) {
    for (let k = 0; k < args.length; k += 2) puntos.push([args[k], args[k + 1]]);
  }
  return puntos;
}

// ── Lectura de los SVG ──────────────────────────────────────────────────────
function leerSvg(archivo) {
  const xml = fs.readFileSync(path.join(ORIGEN, archivo), 'utf8');
  const paths = [...xml.matchAll(/<path\b([^>]*)\/?>/g)].map((m) => m[1]);
  if (!paths.length) throw new Error(`${archivo}: no tiene <path>`);

  const nodos = [];
  const puntos = [];
  for (const attrs of paths) {
    const d = /\bd="([^"]*)"/.exec(attrs)?.[1];
    const fill = /\bfill="([^"]*)"/.exec(attrs)?.[1];
    if (!d) throw new Error(`${archivo}: un <path> no tiene "d"`);
    const segmentos = aAbsolutos(d, archivo);
    nodos.push({ t: 'path', d: emitir(segmentos), fill: fill ?? '#000000' });
    puntos.push(...puntosDe(segmentos));
  }
  return { nodos, puntos };
}

function bbox(puntos) {
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return {
    ancho: redondear(x1 - x0),
    alto: redondear(y1 - y0),
    cx: redondear((x0 + x1) / 2),
    cy: redondear((y0 + y1) / 2),
  };
}

// ── Generación ──────────────────────────────────────────────────────────────
const CABECERA = `// ARCHIVO GENERADO — no editar a mano.
// Se regenera con:  node tools/mascota/importarAccesorios.js
// Fuente: app/mascota/assets/accesorios/*.svg
//
// Cada accesorio tiene una lista de variantes; cada variante trae su bounding
// box (en unidades del SVG original) y sus nodos, del mismo pipeline que las
// siluetas. Quien dibuja (accesorios/catalogoBase.js) las envuelve en un grupo
// con transform, así el path data nunca se reescribe.
`;

function generar() {
  const bloques = [];
  for (const [id, archivos] of Object.entries(FUENTES)) {
    const variantes = archivos.map((archivo) => {
      const { nodos, puntos } = leerSvg(archivo);
      return { ...bbox(puntos), nodos };
    });
    bloques.push({ id, variantes });
    process.stdout.write(`${id}:\n`);
    variantes.forEach((v, i) => process.stdout.write(
      `   v${i}: ${String(v.nodos.length).padStart(2)} paths, `
      + `bbox ${v.ancho}x${v.alto} centro (${v.cx}, ${v.cy})\n`,
    ));
  }

  const cuerpo = bloques.map(({ id, variantes }) => {
    const vs = variantes.map((v) => {
      const lineas = v.nodos.map((n) => `        { t: 'path', d: '${n.d}', fill: '${n.fill}' },`);
      return `    {\n      ancho: ${v.ancho}, alto: ${v.alto}, cx: ${v.cx}, cy: ${v.cy},\n`
        + `      nodos: [\n${lineas.join('\n')}\n      ],\n    },`;
    }).join('\n');
    return `  '${id}': [\n${vs}\n  ],`;
  }).join('\n');

  const salida = `${CABECERA}\nexport const TRAZOS_ACCESORIOS = {\n${cuerpo}\n};\n`;
  fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
  fs.writeFileSync(DESTINO, salida, 'utf8');
  process.stdout.write(`\n→ ${path.relative(path.join(__dirname, '..', '..'), DESTINO)} (${salida.length} bytes)\n`);
}

generar();
