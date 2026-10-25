#!/usr/bin/env node
/*
 * Revisa contenido.json y genera contenido-base.js (el respaldo que viaja dentro de la app).
 * Uso:  node herramientas/sincronizar.js
 * Correrlo cada vez que se cambia contenido.json, antes de publicar.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const archivo = path.join(raiz, 'contenido.json');
const errores = [];
const avisos = [];

let C;
try { C = JSON.parse(fs.readFileSync(archivo, 'utf8')); }
catch (e) { console.error('✗ contenido.json no es válido: ' + e.message); process.exit(1); }

global.window = {};
eval(fs.readFileSync(path.join(raiz, 'data.js'), 'utf8'));
const D = window.FAMILIA_DATA;
const cats = new Set(D.categorias.map(c => c.id));
const especies = new Set(D.mascotas.map(m => m.id));

function req(obj, campos, donde) {
  campos.forEach(c => { if (obj[c] === undefined || obj[c] === '') errores.push(donde + ': falta "' + c + '"'); });
}
function unicos(lista, nombre) {
  const vistos = new Set();
  lista.forEach(x => { if (vistos.has(x.id)) errores.push(nombre + ': id repetido "' + x.id + '"'); vistos.add(x.id); });
  return vistos;
}

if (!Number.isInteger(C.version) || C.version < 1) errores.push('"version" tiene que ser un número entero (1, 2, 3…)');
if (!/^\d{4}-\d{2}-\d{2}$/.test(C.actualizado || '')) errores.push('"actualizado" tiene que tener el formato AAAA-MM-DD');
['frases', 'seguridad', 'sabias', 'consejosInicio'].forEach(k => { if (!Array.isArray(C[k]) || !C[k].length) errores.push('falta la lista "' + k + '"'); });

if (!errores.length) {
  const idsFrases = unicos(C.frases, 'frases');
  C.frases.forEach(f => {
    const d = 'frase ' + f.id;
    req(f, ['id', 'cat', 'titulo', 'edad', 'etiqueta', 'cuando', 'frase', 'mascota'], d);
    if (!cats.has(f.cat)) errores.push(d + ': categoría desconocida "' + f.cat + '"');
    if (!Array.isArray(f.edad) || f.edad.length !== 2) errores.push(d + ': "edad" tiene que ser [mínimo, máximo]');
  });
  for (let dia = 1; dia <= 7; dia++) if (!C.frases.some(f => f.dia === dia)) errores.push('falta la frase del día ' + dia + ' del desafío');

  const idsSabias = new Set((C.sabias || []).map(s => s.id));
  const tipos = ['reto', 'plan', 'charla', 'frase', 'dato'];
  (C.semanas || []).forEach((s, i) => {
    const d = 'semana ' + (i + 1);
    req(s, ['tema', 'mision', 'items'], d);
    (s.items || []).forEach((it, j) => {
      const di = d + ', actividad ' + (j + 1);
      if (tipos.indexOf(it.tipo) < 0) errores.push(di + ': tipo desconocido "' + it.tipo + '"');
      if (it.tipo === 'reto' && !it.texto) errores.push(di + ': el reto necesita "texto"');
      if (it.tipo === 'dato' && !(it.sabias || []).length) errores.push(di + ': el dato necesita "sabias"');
      if (it.frase && !idsFrases.has(it.frase)) errores.push(di + ': la frase "' + it.frase + '" no existe');
      if (['plan', 'charla', 'frase'].indexOf(it.tipo) >= 0 && !it.frase) errores.push(di + ': falta "frase"');
      (it.sabias || []).forEach(id => { if (!idsSabias.has(id)) errores.push(di + ': el dato "' + id + '" no existe'); });
    });
  });
  ((C.balance && C.balance.dificultades) || []).forEach(x => { if (!idsFrases.has(x.frase)) errores.push('balance ' + x.id + ': la frase "' + x.frase + '" no existe'); });
  unicos(C.rutas || [], 'rutas');
  (C.rutas || []).forEach(r => {
    const d = 'ruta ' + r.id;
    req(r, ['id', 'titulo', 'bajada', 'icono', 'color'], d);
    if (r.proximamente) return;
    if (!(r.pasos || []).length) errores.push(d + ': no tiene pasos');
    unicos(r.pasos || [], d + ' pasos');
    (r.pasos || []).forEach((p, j) => {
      req(p, ['id', 'titulo', 'tipo', 'texto'], d + ', paso ' + (j + 1));
      if (p.frase && !idsFrases.has(p.frase)) errores.push(d + ', paso ' + (j + 1) + ': la frase "' + p.frase + '" no existe');
      (p.sabias || []).forEach(id => { if (!idsSabias.has(id)) errores.push(d + ', paso ' + (j + 1) + ': el dato "' + id + '" no existe'); });
    });
  });

  unicos(C.seguridad, 'seguridad');
  C.seguridad.forEach(s => req(s, ['id', 'titulo', 'texto'], 'hábito ' + s.id));

  unicos(C.sabias, 'sabias');
  const hoy = new Date();
  C.sabias.forEach(s => {
    const d = 'dato ' + s.id;
    req(s, ['id', 'tipo', 'texto', 'accion', 'pais', 'revisado'], d);
    if (['pantallas', 'seguridad', 'consejo'].indexOf(s.tipo) < 0) errores.push(d + ': "tipo" tiene que ser pantallas, seguridad o consejo');
    if (s.fuente && !/^https:\/\//.test(s.url || '')) errores.push(d + ': tiene fuente pero el link no empieza con https://');
    if (s.frase && !idsFrases.has(s.frase)) errores.push(d + ': la frase "' + s.frase + '" no existe');
    if (!/^\d{4}-\d{2}$/.test(s.revisado || '')) errores.push(d + ': "revisado" tiene que tener el formato AAAA-MM');
    else {
      const [a, m] = s.revisado.split('-').map(Number);
      const meses = (hoy.getFullYear() - a) * 12 + (hoy.getMonth() + 1 - m);
      if (meses >= 12) avisos.push(d + ': revisado hace ' + meses + ' meses, conviene verificarlo de nuevo');
    }
  });
}

if (errores.length) {
  console.error('✗ Hay ' + errores.length + ' problema(s). No se generó el respaldo:\n  - ' + errores.join('\n  - '));
  process.exit(1);
}
avisos.forEach(a => console.warn('! ' + a));

fs.writeFileSync(path.join(raiz, 'contenido-base.js'),
  '/* Generado por herramientas/sincronizar.js a partir de contenido.json. No editar a mano. */\n' +
  'window.FAMILIA_CONTENIDO_BASE = ' + JSON.stringify(C) + ';\n');
console.log('✓ contenido.json versión ' + C.version + ' (' + C.actualizado + '): ' + C.frases.length + ' frases, ' + C.sabias.length + ' datos, ' + C.seguridad.length + ' hábitos. Respaldo generado.');
