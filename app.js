/* FamilIA · app (sin servidor: lo de la familia queda guardado en el celular; el contenido se actualiza solo) */
(function () {
  'use strict';
  var D = window.FAMILIA_DATA;
  var CLAVE = 'familia.v1';
  var app = document.getElementById('app');

  /* ---------- Contenido actualizable ----------
     Frases, datos, consejos, hábitos y teléfonos viven en contenido.json.
     1) Al abrir se usa lo último guardado en el celular (o el respaldo incluido, contenido-base.js).
     2) En segundo plano se busca contenido.json; si trae una versión mayor y es válida, se guarda y se aplica.
     3) Si no hay internet o el archivo tiene errores, la app sigue con lo que ya tenía. */
  var CLAVE_CONT = 'familia.contenido';
  var URL_CONT = 'contenido.json';
  var CLAVES_CONT = ['frases', 'seguridad', 'sabias', 'consejosInicio', 'telefonos', 'semanas', 'balance', 'reglasAcuerdo', 'rutas'];
  function contenidoValido(c) {
    try {
      if (!c || typeof c.version !== 'number' || c.version < 1) return false;
      if (!['frases', 'seguridad', 'sabias', 'consejosInicio'].every(function (k) { return Array.isArray(c[k]) && c[k].length; })) return false;
      var cats = D.categorias.map(function (x) { return x.id; });
      if (!c.frases.every(function (f) { return f.id && f.titulo && f.frase && cats.indexOf(f.cat) >= 0 && f.edad && f.edad.length === 2; })) return false;
      for (var d = 1; d <= 7; d++) if (!c.frases.some(function (f) { return f.dia === d; })) return false;
      if (!c.sabias.every(function (s) { return s.id && s.texto && s.accion && ['pantallas', 'seguridad', 'consejo'].indexOf(s.tipo) >= 0 && (!s.url || /^https:\/\//.test(s.url)); })) return false;
      if (c.semanas && !c.semanas.every(function (w) { return w.tema && w.mision && Array.isArray(w.items) && w.items.length; })) return false;
      if (c.rutas && !c.rutas.every(function (r) { return r.id && r.titulo && (r.proximamente || (Array.isArray(r.pasos) && r.pasos.every(function (p) { return p.id && p.titulo && p.texto; }))); })) return false;
      return c.seguridad.every(function (h) { return h.id && h.titulo; });
    } catch (e) { return false; }
  }
  function aplicarContenido(c) {
    CLAVES_CONT.forEach(function (k) { D[k] = c[k] || (k === 'telefonos' || k === 'balance' ? {} : []); });
    D.contVersion = c.version; D.contFecha = c.actualizado || '';
  }
  (function () {
    var base = window.FAMILIA_CONTENIDO_BASE, guardado = null;
    try { guardado = JSON.parse(localStorage.getItem(CLAVE_CONT) || 'null'); } catch (e) { /* sin guardado */ }
    aplicarContenido(guardado && contenidoValido(guardado) && guardado.version > base.version ? guardado : base);
  })();
  var contPendiente = null;
  function buscarActualizacion() {
    if (!window.fetch) return;
    fetch(URL_CONT + '?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) {
        if (!c || c.version <= D.contVersion || !contenidoValido(c)) return;
        try { localStorage.setItem(CLAVE_CONT, JSON.stringify(c)); } catch (e) { /* se aplica igual en esta sesión */ }
        contPendiente = c;
        if (ruta().n !== 'frase') render();   /* si está completando una frase, se aplica al cambiar de pantalla */
      })
      .catch(function () { /* sin conexión: seguimos con lo que hay */ });
  }

  /* ---------- Estado guardado en el dispositivo ---------- */
  function paisDetectado() {
    try {
      var zona = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (zona.indexOf('America/Argentina') === 0 || zona === 'America/Buenos_Aires') return 'AR';
    } catch (e) { /* sin zona horaria */ }
    return /-AR$/i.test(navigator.language || '') ? 'AR' : 'otro';
  }
  var porDefecto = {
    listo: false,
    edades: [],
    ayudante: 'whatsapp',
    mascota: { especie: 'unicornio', nombre: 'Luna' },
    desafio: [],
    seguridad: {},
    rellenos: {},
    pais: paisDetectado(),
    semana: null,
    rutas: {},
    acuerdo: { reglas: [], propia: '', fecha: '' }
  };
  function cargar() {
    try {
      var s = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      return Object.assign(JSON.parse(JSON.stringify(porDefecto)), s || {});
    } catch (e) { return JSON.parse(JSON.stringify(porDefecto)); }
  }
  var E = cargar();
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(E)); } catch (e) { /* sin guardado */ } }

  /* ---------- Utilidades ---------- */
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function porId(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return null; }
  function mascota() { return porId(D.mascotas, E.mascota.especie) || D.mascotas[0]; }
  function nombreMascota() { return (E.mascota.nombre || '').trim() || 'tu compañero'; }
  function imgMascota(especie, expr) {
    var falt = D.expresionesFaltantes[especie] || [];
    if (falt.indexOf(expr) >= 0) expr = 'feliz';
    return 'img/mascotas/' + especie + '-' + expr + '.webp';
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('ver');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('ver'); }, 2600);
  }
  var rutaActual = '';
  function ir(r) {
    r = r.replace(/^#?\/?/, '');
    rutaActual = r;
    try { history.pushState(null, '', '#/' + r); } catch (e) { /* vista sin historial */ }
    render();
  }
  /* Confirmación en dos toques, sin ventanas emergentes */
  function confirmar(btn, texto) {
    if (btn.dataset.confirmando) return true;
    btn.dataset.confirmando = '1'; btn.dataset.original = btn.textContent;
    btn.textContent = texto; btn.classList.add('btn-alerta');
    setTimeout(function () { if (btn.isConnected) { delete btn.dataset.confirmando; btn.textContent = btn.dataset.original; btn.classList.remove('btn-alerta'); } }, 4000);
    return false;
  }
  function edadesActivas() {
    return D.rangosEdad.filter(function (r) { return E.edades.indexOf(r.id) >= 0; });
  }
  function fraseAplica(f, rangos) {
    if (!rangos.length) return true;
    return rangos.some(function (r) { return f.edad[0] <= r.max && f.edad[1] >= r.min; });
  }
  function textoEdades() {
    var r = edadesActivas();
    if (!r.length) return 'Elegir edades';
    return 'Hijos: ' + r.map(function (x) { return x.min + '–' + x.max; }).join(' y ');
  }
  function diaDeHoy() {
    for (var d = 1; d <= 7; d++) if (E.desafio.indexOf(d) < 0) return d;
    return 0;
  }

  /* ---------- Íconos ---------- */
  var I = {
    atras: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    flecha: '<svg class="flecha" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 5 L16 12 L9 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ajustes: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5 V5.5 M12 18.5 V21.5 M2.5 12 H5.5 M18.5 12 H21.5 M5.3 5.3 L7.4 7.4 M16.6 16.6 L18.7 18.7 M5.3 18.7 L7.4 16.6 M16.6 7.4 L18.7 5.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    buscar: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="#5A5170" stroke-width="2.2"/><path d="M16.5 16.5 L21 21" stroke="#5A5170" stroke-width="2.2" stroke-linecap="round"/></svg>',
    info: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#FFF1C7" stroke="#2B2140" stroke-width="2"/><path d="M12 8 V13 M12 16.5 V16.6" stroke="#2B2140" stroke-width="2.4" stroke-linecap="round"/></svg>',
    candado: '<svg aria-hidden="true" viewBox="0 0 24 24" style="width:18px;height:18px"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11 V8 C8 5.8 9.8 4 12 4 C14.2 4 16 5.8 16 8 V11" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    check: '<svg aria-hidden="true" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M5 12 L10 17 L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    externo: '<svg aria-hidden="true" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M14 4 H20 V10 M20 4 L11 13 M18 14 V20 H4 V6 H10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    olla: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 11 H20 V14 C20 17.3 17.3 20 14 20 H10 C6.7 20 4 17.3 4 14 Z M2 11 H22 M9 7 C9 5.5 10 5 10 4 M13 7 C13 5.5 14 5 14 4" fill="none" stroke="#2B2140" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lapiz: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 20 L8 19 L19 8 L16 5 L5 16 Z M14 7 L17 10 M4 20 H20" fill="none" stroke="#2B2140" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pantalla: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="#2B2140" stroke-width="2"/><path d="M8 20 H16 M12 16 V20 M9 8 L15 12 M15 8 L9 12" fill="none" stroke="#2B2140" stroke-width="2" stroke-linecap="round"/></svg>',
    luna: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 3 C10.5 3.6 7.5 7.4 7.5 12 C7.5 16.8 11.3 20.5 16 20.5 C17.5 20.5 19 20.1 20.2 19.4 C15 18.8 11.6 15.3 11.6 11.2 C11.6 7.7 13 5 15 3 Z" fill="none" stroke="#2B2140" stroke-width="2" stroke-linejoin="round"/></svg>',
    calendario: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2.5" fill="none" stroke="#2B2140" stroke-width="2"/><path d="M3 10 H21 M8 3 V7 M16 3 V7 M8 14 H10 M12 14 H14 M8 17 H10" fill="none" stroke="#2B2140" stroke-width="2" stroke-linecap="round"/></svg>',
    sol: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" fill="none" stroke="#2B2140" stroke-width="2"/><path d="M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.3 5.3 L7 7 M17 17 L18.7 18.7 M5.3 18.7 L7 17 M17 7 L18.7 5.3" stroke="#2B2140" stroke-width="2" stroke-linecap="round"/></svg>',
    foco: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 18 H15 M10 21 H14 M12 3 C8.7 3 6 5.6 6 8.9 C6 11.1 7.2 12.6 8.4 13.7 C9 14.3 9.3 15 9.3 15.8 H14.7 C14.7 15 15 14.3 15.6 13.7 C16.8 12.6 18 11.1 18 8.9 C18 5.6 15.3 3 12 3 Z" fill="#FFC93C" stroke="#2B2140" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    celular: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" fill="none" stroke="#2B2140" stroke-width="2"/><path d="M10.5 18.5 H13.5" stroke="#2B2140" stroke-width="2" stroke-linecap="round"/></svg>',
    burbujas: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 5 H15 V13 H8 L4.5 16 V13 H3 Z M17 9 H21 V17 H19.5 V19.5 L16.5 17 H10 V15" fill="none" stroke="#2B2140" stroke-width="2" stroke-linejoin="round"/></svg>',
    joystick: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 8 H17 C19.8 8 21.5 10.5 21.5 14 C21.5 16.5 20.3 18 18.8 18 C17.3 18 16.6 16.6 15.5 15.5 H8.5 C7.4 16.6 6.7 18 5.2 18 C3.7 18 2.5 16.5 2.5 14 C2.5 10.5 4.2 8 7 8 Z M7.5 11 V14 M6 12.5 H9 M15.5 12 H15.6 M17.5 13.5 H17.6" fill="none" stroke="#2B2140" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chispa: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 L13.8 9.2 L20 11 L13.8 12.8 L12 19 L10.2 12.8 L4 11 L10.2 9.2 Z M18.5 16 L19.2 18 L21 18.6 L19.2 19.3 L18.5 21 L17.8 19.3 L16 18.6 L17.8 18 Z" fill="none" stroke="#2B2140" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    escudo: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 L20 6 V11 C20 16 16.5 19.5 12 21 C7.5 19.5 4 16 4 11 V6 Z" fill="none" stroke="#2B2140" stroke-width="2" stroke-linejoin="round"/></svg>'
  };
  var TABS = [
    { r: 'inicio', t: 'Inicio', ic: '<path d="M3 11 L12 4 L21 11 V20 H14 V14 H10 V20 H3 Z" stroke-linejoin="round"/>' },
    { r: 'frases', t: 'Frases', ic: '<path d="M4 5 H20 V16 H11 L6 20 V16 H4 Z" stroke-linejoin="round"/>' },
    { r: 'desafio', t: 'Desafío', ic: '<path d="M6 21 V4 M6 4 H18 L15 8 L18 12 H6" stroke-linecap="round" stroke-linejoin="round"/>' },
    { r: 'seguridad', t: 'Seguridad', ic: '<path d="M12 3 L20 6 V11 C20 16 16.5 19.5 12 21 C7.5 19.5 4 16 4 11 V6 Z" stroke-linejoin="round"/>' }
  ];
  function tabs(activa) {
    var lista = TABS.slice();
    if (E.semana) lista[2] = { r: 'semana', t: 'Semana', ic: '<rect x="3" y="5" width="18" height="16" rx="2.5" stroke-linejoin="round"/><path d="M3 10 H21 M8 3 V7 M16 3 V7" stroke-linecap="round"/>' };
    return '<nav class="tabs" aria-label="Secciones">' + lista.map(function (t, i) {
      var on = t.r === activa || (i === 2 && (activa === 'desafio' || activa === 'semana'));
      return '<a class="tab" href="#/' + t.r + '"' + (on ? ' aria-current="page"' : '') + '><svg aria-hidden="true" viewBox="0 0 24 24" fill="' + (on ? '#FFE3DA' : 'none') + '" stroke="currentColor" stroke-width="2">' + t.ic + '</svg>' + t.t + '</a>';
    }).join('') + '</nav>';
  }
  function volver(href, etiqueta) {
    return '<a class="btn-icono" href="' + href + '" aria-label="' + esc(etiqueta || 'Volver') + '">' + I.atras + '</a>';
  }
  function comentario(texto, expr, fondo) {
    var m = mascota();
    return '<div class="comentario"><div class="avatar" style="background:' + (fondo || m.fondo) + '"><img src="' + imgMascota(m.id, expr) + '" alt="' + esc(m.label) + '"></div>' +
      '<div class="burbuja"><span class="quien">' + esc(nombreMascota()) + '</span>' + texto + '</div></div>';
  }
  function tarjetaFrase(f, desde) {
    return '<a class="tarjeta' + (f.destacada ? ' destacada' : '') + '" href="#/frase/' + f.id + '"' + (desde ? ' data-desde="' + desde + '"' : '') + '><span class="cuerpo">' +
      (f.destacada ? '<span class="etiqueta">La más usada</span>' : '') +
      '<span class="tit">' + esc(f.titulo) + '</span><span class="sub">' + esc(f.cuando) + ' · ' + esc(f.etiqueta) + '</span></span>' + I.flecha + '</a>';
  }

  /* ---------- Pantallas ---------- */
  var V = {};

  /* ---------- ¿Sabías que? ---------- */
  var ROT_SABIAS = { pantallas: '¿Sabías que?', seguridad: '¿Sabías que?', consejo: 'Consejo' };
  var turnoSabias = {};
  function sabiasDelPais() { return D.sabias.filter(function (s) { return !s.pais || s.pais === 'global' || s.pais === E.pais; }); }
  function listaSabias(tipos) { return sabiasDelPais().filter(function (s) { return tipos.indexOf(s.tipo) >= 0; }); }
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fechaLarga(t) { var p = String(t || '').split('-'); return p.length === 3 ? (+p[2]) + '/' + (+p[1]) + '/' + p[0] : t; }
  function mesAnio(t) { var p = String(t || '').split('-'); return p.length >= 2 ? MESES[+p[1] - 1] + ' ' + p[0] : ''; }
  function tarjetaSabias(s, extra) {
    var frase = s.frase && porId(D.frases, s.frase);
    return '<article class="sabias sabias-' + s.tipo + '"><div class="sabias-cab">' + I.foco + '<span class="rotulo">' + ROT_SABIAS[s.tipo] + '</span></div>' +
      '<p class="sabias-texto">' + esc(s.texto) + '</p>' +
      '<div class="sabias-accion"><b>Qué hacer</b><span>' + esc(s.accion) + '</span></div>' +
      ((s.fuente || s.revisado || frase || extra) ? '<div class="sabias-pie">' +
        (s.fuente ? '<a class="sabias-fuente" href="' + esc(s.url) + '" target="_blank" rel="noopener">Fuente: ' + esc(s.fuente) + I.externo + '</a>' : '') +
        (s.revisado ? '<span class="sabias-revisado">Revisado: ' + mesAnio(s.revisado) + '</span>' : '') +
        '<div class="sabias-botones">' + (frase ? '<a class="chip" href="#/frase/' + frase.id + '">Ver una frase para esto</a>' : '') + (extra || '') + '</div></div>' : '') +
      '</article>';
  }
  function sabiasDelDia(clave, tipos) {
    var lista = listaSabias(tipos);
    if (turnoSabias[clave] == null) turnoSabias[clave] = (new Date().getDate() + clave.length) % lista.length;
    var s = lista[turnoSabias[clave] % lista.length];
    return tarjetaSabias(s, '<button type="button" class="chip" data-otro="' + clave + '">Otro dato</button>');
  }

  V.bienvenida = function () {
    var edades = D.rangosEdad.map(function (r) {
      var on = E.edades.indexOf(r.id) >= 0;
      return '<button type="button" class="op" data-edad="' + r.id + '" aria-pressed="' + on + '">' + r.label + '</button>';
    }).join('');
    var ays = D.ayudantes.map(function (a) {
      var on = E.ayudante === a.id;
      return '<button type="button" class="radio" role="radio" data-ay="' + a.id + '" aria-checked="' + on + '"><span class="punto"></span><span><span class="tit">' + a.label + '</span><span class="sub">' + a.hint + '</span></span></button>';
    }).join('');
    return '<main class="pantalla">' +
      '<div class="cabecera-color" style="background:var(--sol)"><div class="barra-sup"><span class="marca">Famil<span>IA</span></span><span class="ayuda-chica" style="color:var(--tinta)">powered by Andexia</span></div>' +
      '<h1>Que la tecnología trabaje para tu familia</h1><p class="bajada" style="color:var(--tinta);font-weight:600">Paso 1 de 2: contanos un poco de tu familia.</p></div>' +
      '<section aria-labelledby="t-edades" style="display:flex;flex-direction:column;gap:10px"><h2 id="t-edades">¿Qué edades tienen tus hijos?</h2><p class="ayuda-chica" style="margin:-4px 0 0">Podés elegir más de una.</p><div class="grilla-2">' + edades + '</div></section>' +
      '<section aria-labelledby="t-ay" style="display:flex;flex-direction:column;gap:10px"><h2 id="t-ay">¿Qué ayudante tenés a mano?</h2><div role="radiogroup" aria-labelledby="t-ay" style="display:flex;flex-direction:column;gap:8px">' + ays + '</div></section>' +
      '<button type="button" class="btn btn-primario mt-auto" data-acc="siguiente">Siguiente</button></main>';
  };
  V.bienvenida.on = function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.edad) {
      var i = E.edades.indexOf(b.dataset.edad);
      if (i >= 0) E.edades.splice(i, 1); else E.edades.push(b.dataset.edad);
      guardar(); b.setAttribute('aria-pressed', i < 0);
    } else if (b.dataset.ay) {
      E.ayudante = b.dataset.ay; guardar(); render();
    } else if (b.dataset.acc === 'siguiente') {
      if (!E.edades.length) { toast('Elegí al menos una edad.'); return; }
      ir('/mascota');
    }
  };

  V.mascota = function () {
    var m = mascota();
    var ops = D.mascotas.map(function (x) {
      return '<button type="button" class="mascota-op" data-esp="' + x.id + '" aria-pressed="' + (x.id === m.id) + '"><img src="' + imgMascota(x.id, 'feliz') + '" alt="">' + x.label + '</button>';
    }).join('');
    var sug = D.nombresSugeridos.map(function (n) { return '<button type="button" class="chip" data-nom="' + n + '">' + n + '</button>'; }).join('');
    return '<main class="pantalla"><div class="barra-sup">' + volver(E.listo ? '#/ajustes' : '#/bienvenida') + '<span class="ayuda-chica">' + (E.listo ? 'Cambiar compañero' : 'Paso 2 de 2') + '</span></div>' +
      '<div style="display:flex;flex-direction:column;gap:4px"><h1>Elijan a su compañero</h1><p class="bajada">Los va a acompañar con ideas y consejos. Decidan en familia quién es y cómo se llama.</p></div>' +
      '<div class="saludo-grande" style="background:' + m.fondo + '"><img id="m-grande" src="' + imgMascota(m.id, 'saluda') + '" alt="' + esc(m.label) + ' saludando"><div class="burbuja">¡Hola! Soy <b id="m-nombre" style="color:var(--coral)">' + esc(nombreMascota()) + '</b>. ¡Qué lindo conocerlos!</div></div>' +
      '<div class="grilla-3">' + ops + '</div><p class="ayuda-chica" style="margin:-6px 0 0">Muy pronto: ninja y extraterrestre.</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px"><label for="nombre" style="font-weight:800">¿Cómo se va a llamar?</label><input id="nombre" class="campo" maxlength="20" autocomplete="off" value="' + esc(E.mascota.nombre) + '" placeholder="Escriban un nombre"><div class="chips">' + sug + '</div></div>' +
      '<button type="button" class="btn btn-primario mt-auto" data-acc="listo">' + (E.listo ? 'Guardar' : '¡Listo, empecemos!') + '</button></main>';
  };
  V.mascota.on = function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.esp) { E.mascota.especie = b.dataset.esp; guardar(); render(); }
    else if (b.dataset.nom) { E.mascota.nombre = b.dataset.nom; guardar(); render(); }
    else if (b.dataset.acc === 'listo') {
      if (!(E.mascota.nombre || '').trim()) { toast('Pónganle un nombre a su compañero.'); return; }
      var primera = !E.listo; E.listo = true; guardar();
      ir('/inicio'); if (primera) toast('¡Bienvenidos a FamilIA!');
    }
  };
  V.mascota.input = function (ev) {
    if (ev.target.id === 'nombre') {
      E.mascota.nombre = ev.target.value.slice(0, 20); guardar();
      var n = document.getElementById('m-nombre'); if (n) n.textContent = nombreMascota();
    }
  };

  V.inicio = function () {
    var hoy = diaDeHoy(), hechos = E.desafio.length, sem = semanaActual();
    var tip = sem ? sem.mision : hoy === 1 ? '¿Arrancamos el desafío de pantallas? El día 1 lleva 10 minutos.'
      : hoy > 1 ? 'Hoy toca el día ' + hoy + ' del desafío. ¿Lo hacemos después de cenar?'
      : D.consejosInicio[new Date().getDate() % D.consejosInicio.length];
    var mos = D.categorias.map(function (c) {
      var href = c.id === 'pantallas' ? (E.semana ? '#/semana' : '#/desafio') : '#/categoria/' + c.id;
      return '<a class="mosaico" href="' + href + '" style="background:' + c.fondo + '">' + I[c.icono] + '<span>' + esc(c.titulo) + '</span></a>';
    }).join('') + '<a class="mosaico" href="#/seguridad" style="background:var(--verde-suave)">' + I.escudo + '<span>Cuidar a la familia</span></a>';
    var tarjetaDesafio = sem ? tarjetaSemanaInicio() : hoy
      ? '<a class="tarjeta-oscura" href="#/desafio"><div class="barra-sup"><span class="rotulo">Desafío · Día ' + hoy + ' de 7</span><span class="ayuda-chica" style="color:#D9D3EA">' + hechos + ' completado' + (hechos === 1 ? '' : 's') + '</span></div><div style="font-size:18px;font-weight:800">' + esc(porDia(hoy).titulo) + '</div><div class="progreso"><div style="width:' + Math.round(hechos / 7 * 100) + '%"></div></div></a>'
      : '<a class="tarjeta-oscura" href="#/semana"><span class="rotulo">Desafío completo</span><div style="font-size:18px;font-weight:800">¡Terminaron los 7 días! Sigamos con La semana en familia</div></a>';
    var momentos = rutasActivas().length ? '<div class="barra-sup"><span class="rotulo">Momentos clave</span><a class="ayuda-chica enlace" href="#/rutas">Ver todos</a></div>' + rutasActivas().map(tarjetaRuta).join('') : '';
    return '<main class="pantalla con-barra"><div class="barra-sup"><span class="marca">Famil<span>IA</span></span><div style="display:flex;gap:8px;align-items:center"><a class="chip-info" href="#/ajustes">' + esc(textoEdades()) + '</a><a class="btn-icono" href="#/ajustes" aria-label="Ajustes">' + I.ajustes + '</a></div></div>' +
      '<h1>¿Qué necesitás hoy?</h1>' + comentario(esc(tip), sem ? 'guino' : hoy > 1 ? 'festeja' : 'saluda') +
      '<label class="buscador"><span class="sr">Buscar una situación</span>' + I.buscar + '<input id="buscar" type="search" placeholder="Ej.: no quiere dormir" autocomplete="off"></label>' +
      '<div id="resultados" style="display:none;flex-direction:column;gap:10px"></div>' +
      '<div id="mosaicos" class="grilla-2">' + mos + '</div>' + tarjetaDesafio + momentos +
      sabiasDelDia('inicio', ['pantallas', 'seguridad', 'consejo']) + '<a class="btn btn-borde" href="#/consejos">Ver todos los datos y consejos</a>' +
      '<p class="pie">FamilIA · powered by Andexia</p></main>' + tabs('inicio');
  };
  V.inicio.input = function (ev) {
    if (ev.target.id !== 'buscar') return;
    var q = ev.target.value.trim().toLowerCase();
    var res = document.getElementById('resultados'), mos = document.getElementById('mosaicos');
    if (!q) { res.style.display = 'none'; mos.style.display = ''; return; }
    var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    var nq = norm(q);
    var hits = D.frases.filter(function (f) { return norm(f.titulo + ' ' + f.cuando + ' ' + f.frase).indexOf(nq) >= 0; });
    mos.style.display = 'none'; res.style.display = 'flex';
    res.innerHTML = hits.length ? hits.map(function (f) { return tarjetaFrase(f); }).join('')
      : '<div class="vacio"><img src="' + imgMascota(mascota().id, 'sorpresa') + '" alt=""><b>No encontré esa situación</b><span class="ayuda-chica">Probá con otra palabra, como "cena", "tarea" o "dormir".</span></div>';
  };

  V.frases = function () {
    var cats = D.categorias.map(function (c) {
      var n = D.frases.filter(function (f) { return f.cat === c.id; }).length;
      var href = c.id === 'pantallas' ? '#/desafio' : '#/categoria/' + c.id;
      return '<a class="tarjeta" href="' + href + '"><span class="avatar" style="width:48px;height:48px;border-radius:14px;background:' + c.fondo + '">' + I[c.icono] + '</span><span class="cuerpo"><span class="tit">' + esc(c.nombre) + '</span><span class="sub">' + n + ' frases listas</span></span>' + I.flecha + '</a>';
    }).join('');
    return '<main class="pantalla con-barra"><h1>Frases listas</h1><p class="bajada">Elegí una situación. Cada frase se copia y se manda a tu ayudante.</p>' + cats + '</main>' + tabs('frases');
  };

  V.categoria = function (id) {
    var c = porId(D.categorias, id); if (!c) return V.frases();
    var filtro = V.categoria.filtro || 'mias';
    var rangos = filtro === 'todas' ? [] : edadesActivas();
    var lista = D.frases.filter(function (f) { return f.cat === id && fraseAplica(f, rangos); });
    var chips = '<button type="button" class="chip" data-f="mias" aria-pressed="' + (filtro === 'mias') + '">Para mis hijos</button><button type="button" class="chip" data-f="todas" aria-pressed="' + (filtro === 'todas') + '">Todas</button>';
    return '<main class="pantalla con-barra"><div class="cabecera-color" style="background:' + c.fondo + '">' + volver('#/frases') + '<h1>' + esc(c.nombre) + '</h1><p class="bajada">' + esc(c.bajada) + '</p><div class="chips">' + chips + '</div></div>' +
      (lista.length ? lista.map(function (f) { return tarjetaFrase(f); }).join('') : '<div class="vacio"><b>No hay frases para esas edades</b><span class="ayuda-chica">Tocá "Todas" para ver el resto.</span></div>') + '</main>' + tabs('frases');
  };
  V.categoria.on = function (ev) {
    var b = ev.target.closest('button[data-f]'); if (!b) return;
    V.categoria.filtro = b.dataset.f; render();
  };

  function porDia(d) { for (var i = 0; i < D.frases.length; i++) if (D.frases[i].dia === d) return D.frases[i]; return null; }

  V.frase = function (id) {
    var f = porId(D.frases, id); if (!f) return V.frases();
    var c = porId(D.categorias, f.cat);
    var guardados = E.rellenos[id] || {};
    var n = 0;
    var cuerpo = esc(f.frase).replace(/\[([^\]]+)\]/g, function (_, etq) {
      var i = n++, val = guardados[i] || '';
      var largo = Math.max((val || etq).length, 4);
      return '<label class="sr" for="h' + i + '">' + etq + '</label><input id="h' + i + '" class="hueco' + (val ? ' lleno' : '') + '" data-i="' + i + '" size="' + largo + '" placeholder="' + etq + '" value="' + esc(val) + '" autocomplete="off">';
    });
    var ay = E.ayudante, txt0 = textoFinal(id);
    var botones;
    var bWa = '<a class="btn ' + (ay === 'whatsapp' ? 'btn-accion' : 'btn-borde') + '" data-acc="wa" data-dest="wa" target="_blank" rel="noopener" href="' + esc(destino('wa', txt0)) + '">' + (ay === 'whatsapp' ? 'Copiar y abrir WhatsApp' : 'WhatsApp') + '</a>';
    var bGpt = '<a class="btn ' + (ay === 'chatgpt' ? 'btn-accion' : 'btn-borde') + '" data-acc="gpt" data-dest="gpt" target="_blank" rel="noopener" href="' + esc(destino('gpt', txt0)) + '">' + (ay === 'chatgpt' ? 'Abrir en ChatGPT' : 'ChatGPT') + I.externo + '</a>';
    var bGem = '<a class="btn ' + (ay === 'gemini' ? 'btn-accion' : 'btn-borde') + '" data-acc="gem" data-dest="gem" target="_blank" rel="noopener" href="' + esc(destino('gem', txt0)) + '">' + (ay === 'gemini' ? 'Copiar y abrir Gemini' : 'Gemini') + I.externo + '</a>';
    var bCopiar = '<button type="button" class="btn btn-primario" data-acc="copiar">Copiar la frase</button>';
    if (ay === 'whatsapp') botones = bWa + '<div class="fila-btns">' + bGpt + bGem + '</div>';
    else if (ay === 'chatgpt') botones = bGpt + '<div class="fila-btns">' + bWa + bGem + '</div>';
    else if (ay === 'gemini') botones = bGem + '<div class="fila-btns">' + bWa + bGpt + '</div>';
    else botones = bCopiar + '<div class="fila-btns">' + bWa + bGpt + '</div>';
    if (ay !== 'nose') botones += '<button type="button" class="btn btn-suave" data-acc="copiar">Solo copiar la frase</button>';
    var pista = ay === 'whatsapp' ? '<p class="ayuda-chica" style="margin:0">En WhatsApp elegí el chat de Meta AI (el círculo azul) y pegá o enviá la frase.</p>' : '';
    var marcarDia = f.dia ? (E.desafio.indexOf(f.dia) >= 0
      ? '<button type="button" class="btn btn-ok" data-acc="desmarcar">' + I.check + ' Día ' + f.dia + ' hecho</button>'
      : '<button type="button" class="btn btn-suave" data-acc="marcar">Marcar el día ' + f.dia + ' como hecho</button>') : '';
    return '<main class="pantalla"><div class="barra-sup" style="justify-content:flex-start">' + volver(V.frase.desde || (f.dia ? '#/desafio' : '#/categoria/' + f.cat)) + '<span class="chip-info" style="background:' + c.fondo + ';color:var(--tinta)">' + (f.dia ? 'Desafío · Día ' + f.dia : esc(c.nombre)) + ' · ' + esc(f.etiqueta) + '</span></div>' +
      '<h1>' + esc(f.titulo) + '</h1><div class="aviso">' + I.info + '<span><b>Cuándo usarla:</b> ' + esc(f.cuando) + '</span></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px"><span class="rotulo">La frase lista</span><div class="frase-caja" id="frase">' + cuerpo + '</div>' +
      (n ? '<span class="ayuda-chica">Tocá lo amarillo y completalo antes de enviar. Edades sí, nombres no.</span>' : '') + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' + botones + pista + '</div>' + marcarDia +
      comentario(esc(f.mascota), 'guino') + '</main>';
  };
  function textoFinal(id) {
    var f = porId(D.frases, id), g = E.rellenos[id] || {}, n = 0;
    return f.frase.replace(/\[([^\]]+)\]/g, function (m) { var v = (g[n++] || '').trim(); return v || m; });
  }
  function faltantes(id) { return (textoFinal(id).match(/\[[^\]]+\]/g) || []).length; }
  function destino(tipo, txt) {
    if (tipo === 'wa') return 'https://wa.me/?text=' + encodeURIComponent(txt);
    if (tipo === 'gpt') return 'https://chatgpt.com/?q=' + encodeURIComponent(txt);
    return 'https://gemini.google.com/app';
  }
  function copiarRespaldo(texto) {
    var t = document.createElement('textarea'); t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } document.body.removeChild(t);
    return ok;
  }
  function copiar(texto, alTerminar) {
    var fin = alTerminar || function () {};
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(function () { fin(true); }, function () { fin(copiarRespaldo(texto)); });
        return;
      }
    } catch (e) { /* sigue al respaldo */ }
    fin(copiarRespaldo(texto));
  }
  V.frase.on = function (ev) {
    var b = ev.target.closest('[data-acc]'); if (!b) return;
    var id = ruta().p[1], txt = textoFinal(id), falt = faltantes(id);
    var aviso = falt ? ' Ojo: quedan ' + falt + ' partes entre corchetes para completar.' : '';
    switch (b.dataset.acc) {
      case 'copiar': copiar(txt, function (ok) { toast(ok ? '¡Copiada! Ahora pegala en tu ayudante.' + aviso : 'No se pudo copiar. Mantené apretada la frase para copiarla.'); }); break;
      case 'wa': copiar(txt); toast('Elegí el chat de Meta AI y enviá la frase.' + aviso); break;
      case 'gpt': copiar(txt); if (falt) toast(aviso.trim()); break;
      case 'gem': copiar(txt); toast('Frase copiada: pegala en Gemini.' + aviso); break;
      case 'marcar': var f = porId(D.frases, id); if (E.desafio.indexOf(f.dia) < 0) E.desafio.push(f.dia); guardar(); toast('¡Día ' + f.dia + ' completado!'); render(); break;
      case 'desmarcar': var g = porId(D.frases, id); E.desafio = E.desafio.filter(function (d) { return d !== g.dia; }); guardar(); render(); break;
    }
  };
  V.frase.input = function (ev) {
    var el = ev.target; if (!el.classList.contains('hueco')) return;
    var id = ruta().p[1];
    E.rellenos[id] = E.rellenos[id] || {};
    E.rellenos[id][el.dataset.i] = el.value; guardar();
    el.size = Math.max((el.value || el.placeholder).length, 4);
    el.classList.toggle('lleno', !!el.value);
    var txt = textoFinal(id);
    Array.prototype.forEach.call(document.querySelectorAll('a[data-dest]'), function (a) { a.href = destino(a.dataset.dest, txt); });
  };

  V.desafio = function () {
    var hechos = E.desafio.length, hoy = diaDeHoy();
    var circ = 2 * Math.PI * 40, largo = circ * hechos / 7;
    var dias = [];
    for (var d = 1; d <= 7; d++) {
      var f = porDia(d), hecho = E.desafio.indexOf(d) >= 0, esHoy = d === hoy;
      dias.push('<a class="dia' + (hecho ? ' hecho' : '') + (esHoy ? ' hoy' : '') + '" href="#/frase/' + f.id + '"><span class="num">' + (hecho ? I.check : d) + '</span><span style="flex:1"><span class="ayuda-chica" style="display:block;color:inherit;opacity:.8;font-weight:800">DÍA ' + d + (esHoy ? ' · HOY' : '') + '</span><span style="font-weight:800">' + esc(f.titulo) + '</span></span>' + (hecho ? '<span class="estado">Hecho</span>' : I.flecha) + '</a>');
    }
    var tip = hechos === 0 ? 'Empiecen por el mapa: son 10 minutos y se responde entre todos.'
      : hechos === 7 ? '¡Lo lograron! Elijan qué regla mantener para siempre.'
      : '¡Van ' + hechos + ' de 7! Hoy toca: ' + esc(porDia(hoy).titulo).toLowerCase() + '.';
    return '<main class="pantalla con-barra"><div class="cabecera-color" style="background:var(--sol);flex-direction:row;align-items:center;gap:16px"><div style="flex:1;display:flex;flex-direction:column;gap:6px"><span class="rotulo" style="color:var(--tinta)">Desafío de 7 días</span><h1>Pantallas en familia</h1><p class="bajada" style="color:var(--tinta);font-weight:600">No se trata de prohibir: se trata de compartir.</p></div>' +
      '<svg role="img" aria-label="' + hechos + ' de 7 días completados" viewBox="0 0 100 100" style="width:92px;height:92px;flex:none"><circle cx="50" cy="50" r="40" fill="#fff" stroke="#FFE7A0" stroke-width="12"/><circle cx="50" cy="50" r="40" fill="none" stroke="#2B2140" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + largo.toFixed(1) + ' ' + circ.toFixed(1) + '" transform="rotate(-90 50 50)"/><text x="50" y="52" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="24" fill="#2B2140">' + hechos + '/7</text><text x="50" y="69" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="700" font-size="11" fill="#2B2140">días</text></svg></div>' +
      comentario(tip, hechos ? 'festeja' : 'feliz') + '<div style="display:flex;flex-direction:column;gap:8px">' + dias.join('') + '</div>' + sabiasDelDia('desafio', ['pantallas']) +
      (E.semana ? '<a class="btn btn-accion" href="#/semana">Volver a La semana en familia</a>'
        : hechos === 7 ? '<button type="button" class="btn btn-accion" data-acc="empezar-semana">Empezar La semana en familia</button>'
        : '<a class="btn btn-borde" href="#/semana">¿Ya lo hicieron? Pasar a La semana en familia</a>') +
      (hechos ? '<button type="button" class="btn btn-suave" data-acc="reiniciar">Empezar el desafío de nuevo</button>' : '') + '</main>' + tabs('desafio');
  };
  V.desafio.on = function (ev) {
    if (ev.target.closest('button[data-acc="empezar-semana"]')) { empezarSemana(); ir('semana'); toast('¡Arrancó la semana 1!'); return; }
    var b = ev.target.closest('button[data-acc="reiniciar"]'); if (!b) return;
    if (confirmar(b, 'Tocá de nuevo para borrar el progreso')) { E.desafio = []; guardar(); render(); toast('Desafío reiniciado.'); }
  };

  var NOMBRE_PAIS = { AR: 'Argentina' };
  function telefonos() {
    var t = D.telefonos && D.telefonos[E.pais];
    if (!t || !t.length) return '';
    return '<section class="aviso" style="flex-direction:column;gap:6px"><b>Teléfonos útiles (' + esc(NOMBRE_PAIS[E.pais] || E.pais) + ')</b><span class="ayuda-chica" style="font-size:14px">' +
      t.map(function (x) { return '<a class="tel" href="tel:' + esc(x.numero) + '"><b>' + esc(x.numero) + '</b></a> · ' + esc(x.texto); }).join('<br>') + '</span></section>';
  }
  V.seguridad = function () {
    var hechos = D.seguridad.filter(function (s) { return E.seguridad[s.id]; }).length;
    var items = D.seguridad.map(function (s) {
      var on = !!E.seguridad[s.id];
      return '<label class="habito' + (on ? ' on' : '') + '"><input type="checkbox" data-hab="' + s.id + '"' + (on ? ' checked' : '') + '><span><span class="tit">' + esc(s.titulo) + '</span><span class="sub">' + esc(s.texto) + '</span></span></label>';
    }).join('');
    var total = D.seguridad.length;
    var tip = hechos === total ? '¡Todos los hábitos activados! Repásenlos cada tanto.' : 'Tocá cada hábito cuando lo hablen en familia.';
    var charlas = D.frases.filter(function (f) { return f.cat === 'charlas'; }).slice(1, 5).map(function (f) { return tarjetaFrase(f); }).join('');
    return '<main class="pantalla con-barra"><div class="barra-sup" style="justify-content:flex-start;gap:14px"><span class="avatar" style="width:56px;height:56px;border-radius:18px;background:var(--turquesa-suave)">' + I.escudo + '</span><div><h1 style="font-size:26px">Cuidar a tu familia</h1><span class="ayuda-chica" style="font-size:14px;font-weight:700">' + hechos + ' de ' + total + ' hábitos activados</span></div></div>' +
      '<div class="progreso claro"><div style="width:' + Math.round(hechos / total * 100) + '%"></div></div>' + comentario(esc(tip), 'pensando', 'var(--verde-suave)') +
      '<div style="display:flex;flex-direction:column;gap:8px">' + items + '</div>' + sabiasDelDia('seguridad', ['seguridad']) + (rutasActivas().length ? '<span class="rotulo">Momentos clave</span>' + rutasActivas().map(tarjetaRuta).join('') : '') + '<span class="rotulo">¿Qué hago si…?</span>' + charlas +
      '<a class="btn btn-borde" href="#/consejos/seguridad">Ver todos los datos de seguridad</a>' + telefonos() + '</main>' + tabs('seguridad');
  };
  V.seguridad.change = function (ev) {
    var id = ev.target.dataset && ev.target.dataset.hab; if (!id) return;
    E.seguridad[id] = ev.target.checked; guardar(); render();
  };

  V.consejos = function (filtroUrl) {
    var filtro = V.consejos.filtro || filtroUrl || 'todos';
    var ops = [['todos', 'Todos'], ['pantallas', 'Pantallas'], ['seguridad', 'Seguridad'], ['consejo', 'Consejos']];
    var chips = ops.map(function (o) { return '<button type="button" class="chip" data-f="' + o[0] + '" aria-pressed="' + (filtro === o[0]) + '">' + o[1] + '</button>'; }).join('');
    var lista = filtro === 'todos' ? sabiasDelPais() : listaSabias([filtro]);
    return '<main class="pantalla con-barra"><div class="cabecera-color" style="background:var(--sol-suave)">' + volver('#/inicio') + '<h1>¿Sabías que?</h1><p class="bajada">Datos reales y consejos simples para acompañar a los chicos con las pantallas y en internet.</p><div class="chips">' + chips + '</div></div>' +
      comentario(filtro === 'seguridad' ? 'Lo más importante: que sepan que pueden contarte cualquier cosa sin ser retados.' : 'Elegí un dato y charlalo hoy en la cena.', 'pensando') +
      lista.map(function (s) { return tarjetaSabias(s); }).join('') + '</main>' + tabs('inicio');
  };
  V.consejos.on = function (ev) {
    var b = ev.target.closest('button[data-f]'); if (!b) return;
    V.consejos.filtro = b.dataset.f; render();
  };

  /* ---------- Fechas ---------- */
  function hoyISO(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function aFecha(iso) { var p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function diasDesde(iso) { return Math.round((aFecha(hoyISO()) - aFecha(iso)) / 86400000); }
  function sumarDias(iso, n) { var d = aFecha(iso); d.setDate(d.getDate() + n); return d; }
  var DIAS_SEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function fechaCorta(d) { return d.getDate() + '/' + (d.getMonth() + 1); }

  /* ---------- La semana en familia ---------- */
  var ROT_ITEM = { reto: 'Reto', plan: 'Plan', charla: 'Charla', frase: 'Frase', dato: 'Dato' };
  var COLOR_ITEM = { reto: '#FFC93C', plan: '#BFE8B0', charla: '#F9C6D8', frase: '#C9DDF7', dato: '#FFE3A3' };
  function semanaActual() {
    if (!E.semana || !D.semanas || !D.semanas.length) return null;
    return D.semanas[(E.semana.n - 1) % D.semanas.length];
  }
  function itemsSemana(sem) {
    var visibles = sabiasDelPais();
    return sem.items.map(function (it, j) {
      if (it.tipo === 'reto') return { j: j, tipo: 'reto', titulo: it.texto };
      if (it.tipo === 'dato') {
        var s = null;
        (it.sabias || []).some(function (id) { s = porId(visibles, id); return !!s; });
        return s ? { j: j, tipo: 'dato', titulo: 'Leer y charlar este dato', sabia: s } : null;
      }
      var f = porId(D.frases, it.frase);
      return f ? { j: j, tipo: it.tipo, titulo: f.titulo, frase: f } : null;
    }).filter(Boolean);
  }
  function empezarSemana() {
    E.semana = { n: 1, desde: hoyISO(), hechos: {}, balance: null, dificultades: [], historial: [] };
    guardar();
  }
  function avanzarSemana() {
    var s = E.semana, sem = semanaActual();
    var total = sem ? itemsSemana(sem).length : 0, hechas = Object.keys(s.hechos).length;
    s.historial.push({ n: s.n, hechas: hechas, total: total, balance: s.balance });
    s.n++; s.desde = hoyISO(); s.hechos = {}; s.balance = null; s.dificultades = [];
    guardar();
  }
  function revisarSemana() { if (E.semana && diasDesde(E.semana.desde) >= 7) avanzarSemana(); }
  var CARA = {
    mejor: '<path d="M8 14 C9.5 16.5 14.5 16.5 16 14" fill="none" stroke="#2B2140" stroke-width="2" stroke-linecap="round"/>',
    igual: '<path d="M8.5 15 H15.5" stroke="#2B2140" stroke-width="2" stroke-linecap="round"/>',
    peor: '<path d="M8 16.5 C9.5 14 14.5 14 16 16.5" fill="none" stroke="#2B2140" stroke-width="2" stroke-linecap="round"/>'
  };
  var FONDO_CARA = { mejor: '#BFE8B0', igual: '#FFE3A3', peor: '#FFD0C2' };
  function cara(animo, tam) {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" style="width:' + tam + 'px;height:' + tam + 'px"><circle cx="12" cy="12" r="10" fill="' + FONDO_CARA[animo] + '" stroke="#2B2140" stroke-width="1.6"/><circle cx="9" cy="10" r="1.3" fill="#2B2140"/><circle cx="15" cy="10" r="1.3" fill="#2B2140"/>' + CARA[animo] + '</svg>';
  }
  var ANIMOS = [['mejor', 'Mejor'], ['igual', 'Igual'], ['peor', 'Más difícil']];
  var REACCION = {
    mejor: ['¡Qué bien! Lo que funcionó, guárdenlo como regla de la casa.', 'festeja'],
    igual: ['Igual también suma: cambiar hábitos lleva tiempo. Elijan una sola cosa para mejorar.', 'pensando'],
    peor: ['Hay semanas difíciles y les pasa a todas las familias. Vamos con algo chico para la próxima.', 'saluda']
  };
  function racha() {
    var h = E.semana.historial.slice(-7);
    var puntos = h.map(function (x) {
      return '<span class="punto-racha" title="Semana ' + x.n + '" style="background:' + (x.balance ? FONDO_CARA[x.balance] : (x.hechas ? '#FFF' : 'transparent')) + '">' + (x.hechas ? x.hechas : '') + '</span>';
    }).join('');
    return '<div class="racha" aria-label="Semanas anteriores">' + puntos + '<span class="punto-racha actual">' + E.semana.n + '</span></div>';
  }
  function tarjetaSemanaInicio() {
    var sem = semanaActual(); if (!sem) return '';
    var items = itemsSemana(sem), hechas = items.filter(function (x) { return E.semana.hechos[x.j]; }).length;
    return '<a class="tarjeta-semana" href="#/semana" style="background:' + sem.color + '"><div class="barra-sup"><span class="rotulo" style="color:var(--tinta)">La semana en familia · Semana ' + E.semana.n + '</span><span class="ayuda-chica" style="color:var(--tinta);font-weight:800">' + hechas + ' de ' + items.length + '</span></div>' +
      '<div style="font-size:19px;font-weight:900">' + esc(sem.tema) + '</div><div class="progreso claro"><div style="width:' + Math.round(hechas / Math.max(items.length, 1) * 100) + '%"></div></div></a>';
  }

  V.semana = function () {
    if (!E.semana) {
      return '<main class="pantalla con-barra"><div class="cabecera-color" style="background:var(--sol)"><span class="rotulo" style="color:var(--tinta)">Después del desafío</span><h1>La semana en familia</h1><p class="bajada" style="color:var(--tinta);font-weight:600">Cada semana, un tema nuevo con un reto, un plan, una charla y un dato. Al final, un balance de 3 toques.</p></div>' +
        comentario('Son 4 cosas chiquitas por semana. Las hacemos cuando puedan, sin apuro.', 'saluda') +
        '<div class="grilla-2">' + ['reto', 'plan', 'charla', 'dato'].map(function (t) { return '<div class="mini-item" style="background:' + COLOR_ITEM[t] + '"><b>' + ROT_ITEM[t] + '</b><span>' + { reto: 'Algo para cumplir entre todos', plan: 'Un momento sin pantallas', charla: 'Una conversación preparada', dato: 'Algo para saber y charlar' }[t] + '</span></div>'; }).join('') + '</div>' +
        '<button type="button" class="btn btn-accion" data-acc="empezar-semana">Empezar la semana 1</button>' +
        '<a class="btn btn-suave" href="#/desafio">Primero hacer el desafío de 7 días</a></main>' + tabs('semana');
    }
    var s = E.semana, sem = semanaActual(), items = itemsSemana(sem);
    var hechas = items.filter(function (x) { return s.hechos[x.j]; }).length, todo = hechas === items.length;
    var dias = diasDesde(s.desde), fin = sumarDias(s.desde, 6), proxima = sumarDias(s.desde, 7);
    var filas = items.map(function (it) {
      var on = !!s.hechos[it.j];
      var titulo = '<span class="it-cuerpo"><span class="it-tipo" style="background:' + COLOR_ITEM[it.tipo] + '">' + ROT_ITEM[it.tipo] + '</span><span class="it-tit">' + esc(it.titulo) + '</span></span>';
      var fila = '<div class="item-sem' + (on ? ' hecho' : '') + '"><button type="button" class="check-redondo" data-item="' + it.j + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Desmarcar' : 'Marcar como hecho') + ': ' + esc(it.titulo) + '">' + I.check + '</button>' +
        (it.frase ? '<a class="it-link" href="#/frase/' + it.frase.id + '" data-desde="#/semana">' + titulo + I.flecha + '</a>' : '<div class="it-link">' + titulo + '</div>') + '</div>';
      return fila + (it.sabia ? tarjetaSabias(it.sabia) : '');
    }).join('');
    var balance;
    if (s.balance) {
      var r = REACCION[s.balance];
      var sugeridas = (s.dificultades || []).map(function (id) { var x = porId((D.balance && D.balance.dificultades) || [], id); return x && porId(D.frases, x.frase); }).filter(Boolean);
      balance = '<section class="balance"><div class="barra-sup"><span class="rotulo">Balance de la semana</span>' + cara(s.balance, 34) + '</div>' + comentario(r[0], r[1]) +
        (sugeridas.length ? '<span class="rotulo">Para lo que costó</span>' + sugeridas.map(function (f) { return tarjetaFrase(f, '#/semana'); }).join('') : '') +
        '<button type="button" class="btn btn-accion" data-acc="siguiente-semana">Empezar la semana ' + (s.n + 1) + ' ahora</button><span class="ayuda-chica" style="text-align:center">Si no, arranca sola el ' + DIAS_SEM[proxima.getDay()] + ' ' + fechaCorta(proxima) + '.</span></section>';
    } else if (dias >= 4 || todo) {
      var tmp = V.semana.tmp || { animo: null, difs: [] };
      balance = '<section class="balance"><span class="rotulo">Balance de la semana</span><h2>¿Cómo estuvieron las pantallas esta semana?</h2><div class="animos">' +
        ANIMOS.map(function (a) { return '<button type="button" class="animo" data-animo="' + a[0] + '" aria-pressed="' + (tmp.animo === a[0]) + '">' + cara(a[0], 44) + '<span>' + a[1] + '</span></button>'; }).join('') + '</div>' +
        '<span class="ayuda-chica" style="font-weight:700">¿Qué costó más? (opcional)</span><div class="chips">' +
        ((D.balance && D.balance.dificultades) || []).map(function (x) { return '<button type="button" class="chip" data-dif="' + x.id + '" aria-pressed="' + (tmp.difs.indexOf(x.id) >= 0) + '">' + esc(x.texto) + '</button>'; }).join('') + '</div>' +
        '<button type="button" class="btn btn-primario" data-acc="guardar-balance"' + (tmp.animo ? '' : ' disabled') + '>Guardar el balance</button></section>';
    } else {
      var habil = sumarDias(s.desde, 4);
      balance = '<div class="aviso">' + I.calendario + '<span>El balance de la semana se habilita el <b>' + DIAS_SEM[habil.getDay()] + ' ' + fechaCorta(habil) + '</b>, o antes si completan todo.</span></div>';
    }
    var expr = todo ? 'festeja' : hechas ? 'guino' : 'saluda';
    return '<main class="pantalla con-barra"><div class="cabecera-color" style="background:' + sem.color + '"><div class="barra-sup"><span class="rotulo" style="color:var(--tinta)">Semana ' + s.n + ' · hasta el ' + DIAS_SEM[fin.getDay()] + ' ' + fechaCorta(fin) + '</span>' + racha() + '</div>' +
      '<h1>' + esc(sem.tema) + '</h1><div class="progreso claro" style="background:rgba(255,255,255,.7)"><div style="width:' + Math.round(hechas / Math.max(items.length, 1) * 100) + '%"></div></div><span class="ayuda-chica" style="color:var(--tinta);font-weight:800">' + hechas + ' de ' + items.length + ' hechas</span></div>' +
      comentario(esc(sem.mision), expr) + '<div style="display:flex;flex-direction:column;gap:10px">' + filas + '</div>' + balance +
      '<a class="btn btn-suave" href="#/desafio">Repetir el desafío de 7 días</a></main>' + tabs('semana');
  };
  V.semana.on = function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var tmp = V.semana.tmp = V.semana.tmp || { animo: null, difs: [] };
    if (b.dataset.acc === 'empezar-semana') { empezarSemana(); render(); toast('¡Arrancó la semana 1!'); }
    else if (b.dataset.item != null) {
      var j = b.dataset.item;
      if (E.semana.hechos[j]) delete E.semana.hechos[j]; else E.semana.hechos[j] = true;
      guardar(); render();
    } else if (b.dataset.animo) { tmp.animo = b.dataset.animo; render(); }
    else if (b.dataset.dif) { var i = tmp.difs.indexOf(b.dataset.dif); if (i >= 0) tmp.difs.splice(i, 1); else tmp.difs.push(b.dataset.dif); render(); }
    else if (b.dataset.acc === 'guardar-balance' && tmp.animo) {
      E.semana.balance = tmp.animo; E.semana.dificultades = tmp.difs.slice(); V.semana.tmp = null; guardar(); render();
    } else if (b.dataset.acc === 'siguiente-semana') { avanzarSemana(); window.scrollTo(0, 0); render(); toast('¡Arrancó la semana ' + E.semana.n + '!'); }
  };

  /* ---------- Momentos clave (rutas) ---------- */
  function estadoRuta(id) { return E.rutas[id] || (E.rutas[id] = { hechos: {}, checks: {} }); }
  function rutasActivas() { return (D.rutas || []).filter(function (r) { return !r.proximamente && r.pasos && r.pasos.length; }); }
  function pasosHechos(r) { var st = E.rutas[r.id]; return st ? r.pasos.filter(function (p) { return st.hechos[p.id]; }).length : 0; }
  function tarjetaRuta(r) {
    var icono = I[r.icono] || I.escudo;
    if (r.proximamente) return '<div class="tarjeta tarjeta-prox"><span class="avatar" style="width:48px;height:48px;border-radius:14px;background:' + r.color + '">' + icono + '</span><span class="cuerpo"><span class="tit">' + esc(r.titulo) + '</span><span class="sub">' + esc(r.bajada) + '</span></span><span class="etiqueta">Pronto</span></div>';
    var n = pasosHechos(r), t = r.pasos.length;
    return '<a class="tarjeta" href="#/ruta/' + r.id + '"><span class="avatar" style="width:48px;height:48px;border-radius:14px;background:' + r.color + '">' + icono + '</span><span class="cuerpo"><span class="tit">' + esc(r.titulo) + '</span><span class="sub">' + (n ? n + ' de ' + t + ' pasos hechos' : t + ' pasos · ' + esc(r.bajada)) + '</span>' +
      (n ? '<span class="progreso claro" style="height:6px"><span style="display:block;height:100%;width:' + Math.round(n / t * 100) + '%;background:var(--verde);border-radius:3px"></span></span>' : '') + '</span>' + I.flecha + '</a>';
  }
  V.rutas = function () {
    var act = rutasActivas(), prox = (D.rutas || []).filter(function (r) { return r.proximamente; });
    return '<main class="pantalla con-barra"><div class="cabecera-color" style="background:var(--turquesa-suave)">' + volver('#/inicio') + '<h1>Momentos clave</h1><p class="bajada">Guías paso a paso para las situaciones que más preocupan. Qué hablar, qué configurar y qué acordar.</p></div>' +
      comentario('Elegí el momento que están viviendo. Lo hacemos de a un paso.', 'saluda') +
      act.map(tarjetaRuta).join('') + (prox.length ? '<span class="rotulo">Próximamente</span>' + prox.map(tarjetaRuta).join('') : '') + '</main>' + tabs('inicio');
  };
  V.ruta = function (id, num) {
    var r = porId(rutasActivas(), id); if (!r) return V.rutas();
    if (num) return pasoRuta(r, Math.max(1, Math.min(r.pasos.length, +num || 1)));
    var st = estadoRuta(r.id), n = pasosHechos(r), t = r.pasos.length, siguiente = -1;
    r.pasos.some(function (p, i) { if (!st.hechos[p.id]) { siguiente = i; return true; } return false; });
    var filas = r.pasos.map(function (p, i) {
      var hecho = !!st.hechos[p.id], esSig = i === siguiente;
      return '<a class="dia' + (hecho ? ' hecho' : '') + (esSig ? ' hoy' : '') + '" href="#/ruta/' + r.id + '/' + (i + 1) + '"><span class="num">' + (hecho ? I.check : i + 1) + '</span><span style="flex:1"><span class="ayuda-chica" style="display:block;color:inherit;opacity:.8;font-weight:800">' + esc(p.tipo).toUpperCase() + (esSig ? ' · SIGUIENTE' : '') + '</span><span style="font-weight:800">' + esc(p.titulo) + '</span></span>' + (hecho ? '<span class="estado">Hecho</span>' : I.flecha) + '</a>';
    }).join('');
    var tip = n === t ? '¡Recorrido completo! Revisen el acuerdo cada tres meses.' : n ? 'Van ' + n + ' de ' + t + '. Sigamos con: ' + esc(r.pasos[siguiente].titulo).toLowerCase() + '.' : 'Empecemos por el principio: no hay apuro.';
    return '<main class="pantalla con-barra"><div class="cabecera-color" style="background:' + r.color + '">' + volver('#/rutas') + '<span class="rotulo" style="color:var(--tinta)">Momento clave</span><h1>' + esc(r.titulo) + '</h1><p class="bajada">' + esc(r.bajada) + '</p>' +
      '<div class="progreso claro" style="background:rgba(255,255,255,.7)"><div style="width:' + Math.round(n / t * 100) + '%"></div></div><span class="ayuda-chica" style="color:var(--tinta);font-weight:800">' + n + ' de ' + t + ' pasos</span></div>' +
      comentario(tip, n === t ? 'festeja' : 'pensando') + '<div style="display:flex;flex-direction:column;gap:8px">' + filas + '</div>' +
      (E.acuerdo.reglas.length || E.acuerdo.propia ? '<span class="rotulo">Su acuerdo</span>' + acuerdoTarjeta() : '') + '</main>' + tabs('inicio');
  };
  function pasoRuta(r, num) {
    var p = r.pasos[num - 1], st = estadoRuta(r.id), hecho = !!st.hechos[p.id], aqui = '#/ruta/' + r.id + '/' + num;
    var checks = (p.checklist || []).map(function (c, i) {
      var k = p.id + ':' + i, on = !!st.checks[k];
      return '<label class="habito' + (on ? ' on' : '') + '"><input type="checkbox" data-chk="' + k + '"' + (on ? ' checked' : '') + '><span class="tit">' + esc(c) + '</span></label>';
    }).join('');
    var f = p.frase && porId(D.frases, p.frase), s = null;
    (p.sabias || []).some(function (id) { s = porId(sabiasDelPais(), id); return !!s; });
    var ult = num === r.pasos.length;
    return '<main class="pantalla"><div class="barra-sup" style="justify-content:flex-start">' + volver('#/ruta/' + r.id) + '<span class="chip-info" style="background:' + r.color + ';color:var(--tinta)">Paso ' + num + ' de ' + r.pasos.length + ' · ' + esc(p.tipo) + '</span></div>' +
      '<h1>' + esc(p.titulo) + '</h1><p class="bajada">' + esc(p.texto) + '</p>' +
      (checks ? '<div style="display:flex;flex-direction:column;gap:8px">' + checks + '</div>' : '') +
      (p.nota ? '<div class="aviso">' + I.info + '<span>' + esc(p.nota) + '</span></div>' : '') +
      (f ? '<span class="rotulo">Frase lista para tu ayudante</span>' + tarjetaFrase(f, aqui) : '') +
      (p.acuerdo ? acuerdoEditor() : '') + (s ? tarjetaSabias(s) : '') +
      (hecho ? '<button type="button" class="btn btn-ok" data-acc="paso">' + I.check + ' Paso hecho</button>' : '<button type="button" class="btn btn-primario" data-acc="paso">Marcar este paso como hecho</button>') +
      (ult ? '<a class="btn btn-borde" href="#/ruta/' + r.id + '">Ver el recorrido</a>' : '<a class="btn btn-borde" href="#/ruta/' + r.id + '/' + (num + 1) + '">Siguiente paso: ' + esc(r.pasos[num].titulo) + '</a>') + '</main>';
  }
  V.ruta.on = function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var p = ruta().p, r = porId(rutasActivas(), p[1]); if (!r) return;
    if (b.dataset.acc === 'paso') {
      var paso = r.pasos[(+p[2] || 1) - 1], st = estadoRuta(r.id);
      if (st.hechos[paso.id]) delete st.hechos[paso.id]; else { st.hechos[paso.id] = true; toast(pasosHechos(r) === r.pasos.length ? '¡Recorrido completo!' : '¡Paso hecho!'); }
      guardar(); render();
    } else if (b.dataset.regla != null) {
      var txt = D.reglasAcuerdo[+b.dataset.regla], i = E.acuerdo.reglas.indexOf(txt);
      if (i >= 0) E.acuerdo.reglas.splice(i, 1); else E.acuerdo.reglas.push(txt);
      E.acuerdo.fecha = hoyISO(); guardar(); render();
    } else if (b.dataset.acc === 'copiar-acuerdo') {
      copiar(textoAcuerdo(), function (ok) { toast(ok ? '¡Acuerdo copiado!' : 'No se pudo copiar.'); });
    }
  };
  V.ruta.change = function (ev) {
    var k = ev.target.dataset && ev.target.dataset.chk; if (!k) return;
    var st = estadoRuta(ruta().p[1]);
    if (ev.target.checked) st.checks[k] = true; else delete st.checks[k];
    guardar(); ev.target.closest('.habito').classList.toggle('on', ev.target.checked);
  };
  V.ruta.input = function (ev) {
    if (!ev.target.dataset || ev.target.dataset.propia == null) return;
    E.acuerdo.propia = ev.target.value.slice(0, 90); E.acuerdo.fecha = hoyISO(); guardar();
    var v = document.getElementById('acuerdo-vista'); if (v) v.outerHTML = acuerdoTarjeta();
  };

  /* ---------- Acuerdo familiar ---------- */
  function reglasAcuerdo() { return E.acuerdo.reglas.concat((E.acuerdo.propia || '').trim() ? [E.acuerdo.propia.trim()] : []); }
  function textoAcuerdo() {
    return 'Nuestro acuerdo de pantallas\n' + reglasAcuerdo().map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n') + '\nLo armamos en familia el ' + fechaLarga(E.acuerdo.fecha || hoyISO()) + '.';
  }
  function acuerdoTarjeta() {
    var reglas = reglasAcuerdo(), m = mascota();
    if (!reglas.length) return '<div id="acuerdo-vista" class="acuerdo vacio-acuerdo"><b>Nuestro acuerdo de pantallas</b><span class="ayuda-chica">Elegí al menos una regla y acá aparece el acuerdo listo para compartir.</span></div>';
    return '<div id="acuerdo-vista" class="acuerdo"><div class="acuerdo-cab"><img src="' + imgMascota(m.id, 'festeja') + '" alt=""><div><span class="rotulo" style="color:var(--coral)">Familia · ' + esc(nombreMascota()) + ' es testigo</span><b>Nuestro acuerdo de pantallas</b></div></div>' +
      '<ol>' + reglas.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
      '<span class="ayuda-chica">Lo armamos en familia el ' + esc(fechaLarga(E.acuerdo.fecha || hoyISO())) + '.</span>' +
      '<div class="fila-btns"><a class="btn btn-accion" target="_blank" rel="noopener" href="' + esc(destino('wa', textoAcuerdo())) + '">Compartir</a><button type="button" class="btn btn-borde" data-acc="copiar-acuerdo">Copiar</button></div></div>';
  }
  function acuerdoEditor() {
    return '<section style="display:flex;flex-direction:column;gap:10px"><span class="rotulo">Elijan sus reglas</span><div class="reglas">' +
      D.reglasAcuerdo.map(function (x, i) { return '<button type="button" class="op op-regla" data-regla="' + i + '" aria-pressed="' + (E.acuerdo.reglas.indexOf(x) >= 0) + '">' + esc(x) + '</button>'; }).join('') + '</div>' +
      '<label class="ayuda-chica" for="propia" style="font-weight:800">Una regla propia (opcional)</label><input id="propia" class="campo" data-propia="1" maxlength="90" placeholder="Ej.: los domingos, película en familia" value="' + esc(E.acuerdo.propia || '') + '" autocomplete="off">' +
      acuerdoTarjeta() + '</section>';
  }

  V.ajustes = function () {
    var m = mascota();
    var edades = D.rangosEdad.map(function (r) { return '<button type="button" class="op" data-edad="' + r.id + '" aria-pressed="' + (E.edades.indexOf(r.id) >= 0) + '">' + r.label + '</button>'; }).join('');
    var ays = D.ayudantes.map(function (a) { return '<button type="button" class="radio" role="radio" data-ay="' + a.id + '" aria-checked="' + (E.ayudante === a.id) + '"><span class="punto"></span><span class="tit">' + a.label + '</span></button>'; }).join('');
    return '<main class="pantalla">' + '<div class="barra-sup" style="justify-content:flex-start">' + volver('#/inicio') + '<h1 style="font-size:24px">Ajustes</h1></div>' +
      '<a class="tarjeta" href="#/mascota"><span class="avatar" style="background:' + m.fondo + '"><img src="' + imgMascota(m.id, 'feliz') + '" alt=""></span><span class="cuerpo"><span class="tit">' + esc(nombreMascota()) + '</span><span class="sub">' + esc(m.label) + ' · Cambiar compañero o nombre</span></span>' + I.flecha + '</a>' +
      '<section style="display:flex;flex-direction:column;gap:10px"><h2>Edades de los hijos</h2><div class="grilla-2">' + edades + '</div></section>' +
      '<section style="display:flex;flex-direction:column;gap:10px"><h2>Ayudante que usamos</h2><div role="radiogroup" style="display:flex;flex-direction:column;gap:8px">' + ays + '</div></section>' +
      '<section style="display:flex;flex-direction:column;gap:10px"><h2>País</h2><p class="ayuda-chica" style="margin:0">Para mostrarte datos y teléfonos de ayuda de tu país.</p><div class="grilla-2">' +
        [['AR', 'Argentina'], ['otro', 'Otro país']].map(function (o) { return '<button type="button" class="op" data-pais="' + o[0] + '" aria-pressed="' + (E.pais === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></section>' +
      '<section class="aviso" style="flex-direction:column;gap:6px"><b>Tu privacidad</b><span class="ayuda-chica" style="font-size:14px">FamilIA guarda todo solo en este celular. No pedimos nombres, fotos ni datos de tus hijos.</span><span class="ayuda-chica" style="font-size:14px">Para mejorar la app contamos, sin saber quién sos, cuántas familias la usan y cuántas vuelven después de una semana o un mes. No se envía nada de lo que elegís o escribís.</span></section>' +
      '<button type="button" class="btn btn-suave" data-acc="borrar">Borrar todo y empezar de cero</button><p class="pie">FamilIA · contenido actualizado al ' + esc(fechaLarga(D.contFecha)) + ' (v' + D.contVersion + ')<br>powered by Andexia</p></main>';
  };
  V.ajustes.on = function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.edad) { var i = E.edades.indexOf(b.dataset.edad); if (i >= 0) E.edades.splice(i, 1); else E.edades.push(b.dataset.edad); guardar(); render(); }
    else if (b.dataset.pais) { E.pais = b.dataset.pais; guardar(); render(); }
    else if (b.dataset.ay) { E.ayudante = b.dataset.ay; guardar(); render(); }
    else if (b.dataset.acc === 'borrar' && confirmar(b, 'Tocá de nuevo para borrar todo')) {
      try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ }
      E = JSON.parse(JSON.stringify(porDefecto)); ir('/bienvenida');
    }
  };

  /* ---------- Navegación ---------- */
  function ruta() {
    var p = rutaActual.split('/').filter(Boolean);
    return { n: p[0] || '', p: p };
  }
  function desdeUrl() {
    var h = location.hash || '';
    return h.indexOf('#/') === 0 ? h.slice(2) : '';
  }
  var actual = null;
  function render() {
    var r = ruta();
    if (contPendiente && r.n !== 'frase') { aplicarContenido(contPendiente); contPendiente = null; }
    revisarSemana();
    if (!E.listo && r.n !== 'bienvenida' && r.n !== 'mascota') { ir('bienvenida'); return; }
    if (E.listo && !r.n) { ir('inicio'); return; }
    var vista = V[r.n] || V.inicio;
    var cambio = actual !== rutaActual; actual = rutaActual;
    app.innerHTML = vista(r.p[1], r.p[2]);
    app._vista = vista;
    if (cambio) window.scrollTo(0, 0);
    if (E.listo) medir();
  }
  app.addEventListener('click', function (ev) {
    var a = ev.target.closest('a[href^="#/"]');
    if (a) {
      ev.preventDefault();
      var destinoRuta = a.getAttribute('href');
      if (destinoRuta.indexOf('#/consejos') === 0) V.consejos.filtro = null;
      if (destinoRuta.indexOf('#/frase/') === 0) V.frase.desde = a.dataset.desde || null;
      ir(destinoRuta); return;
    }
    var otro = ev.target.closest('button[data-otro]');
    if (otro) { turnoSabias[otro.dataset.otro]++; render(); return; }
    if (app._vista && app._vista.on) app._vista.on(ev);
  });
  app.addEventListener('input', function (ev) { if (app._vista && app._vista.input) app._vista.input(ev); });
  app.addEventListener('change', function (ev) { if (app._vista && app._vista.change) app._vista.change(ev); });
  function alVolver() { var r = desdeUrl(); if (r !== rutaActual) { rutaActual = r; render(); } }
  window.addEventListener('popstate', alVolver);
  window.addEventListener('hashchange', alVolver);
  /* ---------- Medición anónima (cuántas familias vuelven) ----------
     Solo en la dirección publicada. Cada celular avisa una vez cada cosa: que abrió por primera vez,
     que terminó la bienvenida y que volvió a los 7 y a los 30 días. Va con la semana en que empezó,
     para comparar grupos. No se manda nada de lo que la familia elige ni escribe.
     Se guarda aparte de lo de la familia: "Borrar todo" no la cuenta como nueva otra vez. */
  var MEDIR_URL = 'https://familiaengine.goatcounter.com/count';
  var MEDIR_EN = ['familiaengine.netlify.app'];
  var CLAVE_MED = 'familia.medicion';
  var medEnCurso = {};
  function medir() {
    if (MEDIR_EN.indexOf(location.hostname) < 0) return;
    var M = null;
    try { M = JSON.parse(localStorage.getItem(CLAVE_MED) || 'null'); } catch (e) { return; }
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (!M || !M.inicio) {
      var lunes = new Date(hoy); lunes.setDate(hoy.getDate() - (hoy.getDay() + 6) % 7);
      M = { inicio: hoy.getTime(), semana: lunes.getFullYear() + '-' + ('0' + (lunes.getMonth() + 1)).slice(-2) + '-' + ('0' + lunes.getDate()).slice(-2), enviados: [] };
    }
    function guardarM() { try { localStorage.setItem(CLAVE_MED, JSON.stringify(M)); } catch (e) { /* sin guardado */ } }
    guardarM();
    var dias = Math.round((hoy.getTime() - M.inicio) / 864e5);
    var toca = ['nueva'];
    if (E.listo) toca.push('empezo');
    if (dias >= 7) toca.push('volvio-7');
    if (dias >= 30) toca.push('volvio-30');
    toca.forEach(function (ev) {
      if (M.enviados.indexOf(ev) >= 0 || medEnCurso[ev]) return;
      medEnCurso[ev] = true;
      var img = new Image();
      img.onload = function () { if (M.enviados.indexOf(ev) < 0) { M.enviados.push(ev); guardarM(); } };
      img.onerror = function () { medEnCurso[ev] = false; };   /* sin internet: se reintenta la próxima vez */
      img.src = MEDIR_URL + '?e=true&p=' + encodeURIComponent('evento/' + ev + '/' + M.semana) + '&t=' + encodeURIComponent(ev) + '&rnd=' + Date.now();
    });
  }

  rutaActual = desdeUrl();
  render();
  buscarActualizacion();
  medir();
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') buscarActualizacion(); });

  /* ---------- Funcionamiento sin conexión ---------- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* opcional */ }); });
  }
})();
