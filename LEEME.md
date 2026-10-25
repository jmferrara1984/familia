# FamilIA · versión 1.2

App web para que las familias usen la IA a su favor: 39 frases listas en 7 categorías, el desafío de pantallas de 7 días, **La semana en familia** (un tema nuevo por semana con reto, plan, charla, dato y balance), **Momentos clave** (recorridos paso a paso, como "Su primer celular", con acuerdo familiar para compartir), la sección de seguridad y un compañero (mascota) que la familia elige y nombra. Powered by Andexia.

## Qué incluye

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | Página de la app |
| `styles.css` | Diseño (colores, tipografía Nunito, componentes) |
| `contenido.json` | **El contenido que se actualiza**: frases, desafío, datos "¿Sabías que?", consejos, hábitos de seguridad y teléfonos de ayuda por país. |
| `contenido-base.js` | Copia de respaldo de `contenido.json` que viaja dentro de la app (se genera sola, no se edita a mano). |
| `data.js` | Configuración fija: edades, ayudantes, mascotas y categorías. |
| `app.js` | Pantallas, navegación y guardado |
| `sw.js` | Permite usarla sin conexión una vez instalada |
| `manifest.webmanifest` | Permite "Agregar a la pantalla de inicio" con ícono propio |
| `img/` | Mascotas (6 compañeros × 6 expresiones) e íconos |
| `herramientas/sincronizar.js` | Revisa `contenido.json` y genera el respaldo |
| `herramientas/qa.py` | Prueba automática que recorre todas las pantallas |
| `herramientas/qa_fase1.py` | Prueba de La semana en familia, el balance, los Momentos clave y el acuerdo |
| `herramientas/armar_prueba.py` | Arma la versión de prueba de una sola página (`dist-prueba/`) |
| `herramientas/qa_contenido.py` | Prueba de la actualización de contenido (versión nueva, sin internet, archivo con errores, país) |

No usa servidor ni base de datos: todo lo que elige la familia queda guardado en su propio celular. No pide nombres, fotos ni datos de los chicos.

## Probarla en la computadora

```
cd familia
python3 -m http.server 8000
```

Abrir http://localhost:8000 en el navegador (mejor en modo celular de las herramientas de desarrollo).

## Publicarla (gratis, en unos minutos)

Opción más simple, **Netlify**:
1. Crear una cuenta en netlify.com.
2. En "Sites", arrastrar la carpeta `familia` completa.
3. Netlify da una dirección pública con https. Desde "Domain settings" se conecta el dominio propio (por ejemplo familia.app o el que se registre).

Alternativas equivalentes: Cloudflare Pages o Vercel (también permiten subir la carpeta tal cual).

Una vez publicada, en el celular: abrir la dirección y elegir "Agregar a la pantalla de inicio". Queda como una app con el ícono del unicornio.

## Actualizar el contenido (sin tocar la app)

Cada vez que alguien abre la app, esta muestra lo último que tiene guardado y, en segundo plano, mira si hay un `contenido.json` con **número de versión mayor**. Si lo hay y no tiene errores, lo guarda y lo usa. Sin internet, o si el archivo está mal, sigue con lo que tenía: nunca queda vacía.

Pasos para publicar un cambio:
1. Editar `contenido.json` (agregar o corregir un dato, una frase, un teléfono).
2. Subir el número de `"version"` (por ejemplo de 1 a 2) y poner la fecha en `"actualizado"`.
3. Correr `node herramientas/sincronizar.js`. Revisa que no falte nada (ids repetidos, links, frases que no existen, los 7 días del desafío) y avisa qué datos tienen más de 12 meses sin revisar.
4. Subir solo `contenido.json` y `contenido-base.js` al hosting. Los celulares toman la versión nueva la próxima vez que abren la app o vuelven a ella.

Campos de cada dato "¿Sabías que?": `id` (único), `tipo` (pantallas, seguridad o consejo), `texto`, `accion` (qué hacer), `fuente` y `url` (si es un dato), `frase` (id de una frase relacionada, opcional), `pais` (`global` o `AR`) y `revisado` (AAAA-MM, se muestra en la tarjeta).

Semanas y momentos clave (también en `contenido.json`):
- `semanas`: cada una tiene `tema`, `mision` (lo que dice la mascota), `color` e `items`. Cada item es un `reto` (con `texto`), un `plan`, una `charla` o una `frase` (con el id de `frase`), o un `dato` (con una lista de ids de `sabias`; se muestra el primero que corresponda al país). Al terminar la última semana, la lista vuelve a empezar.
- `balance.dificultades`: las opciones de "¿Qué costó más?" y la frase que se sugiere para cada una.
- `reglasAcuerdo`: las reglas para elegir en el acuerdo familiar.
- `rutas`: cada momento clave con sus `pasos` (`titulo`, `tipo`, `texto`, y opcionalmente `checklist`, `nota`, `frase`, `sabias` y `acuerdo: true`). Con `"proximamente": true` aparece como "Pronto" sin pasos.

Cómo avanza la semana: empieza cuando la familia termina el desafío (o la elige antes). El balance se habilita a los 4 días o al completar todo. A los 7 días arranca sola la siguiente; también se puede adelantar después del balance.

Países: los datos con `pais: "AR"` y los teléfonos de `telefonos.AR` solo se muestran a quien tiene Argentina en Ajustes (se detecta solo por la zona horaria). Para sumar otro país, agregar sus datos con su código (por ejemplo `"MX"`) y sus teléfonos en `telefonos`, y sumar la opción en Ajustes.

## Medir cuántas familias vuelven

La app cuenta, sin saber quién es cada familia, cuatro cosas por celular y una sola vez cada una: `nueva` (abrió por primera vez), `empezo` (terminó la bienvenida), `volvio-7` y `volvio-30` (la abrió de nuevo 7 o 30 días después de empezar). Cada aviso lleva la semana en que empezó (el lunes de esa semana), por ejemplo `evento/volvio-7/2026-10-26`.

- Los avisos van a GoatCounter, un contador de visitas sin cookies, en la cuenta `familiaengine` (https://familiaengine.goatcounter.com).
- Solo se mide en la dirección publicada (`MEDIR_EN` en `app.js`). Probarla en la computadora no suma.
- Sin internet, el aviso se reintenta la próxima vez que se abre la app.
- "Borrar todo" no vuelve a contar a la familia como nueva.
- Cómo leerlo: familias que vuelven al día 7 de una semana = `volvio-7/<semana>` ÷ `empezo/<semana>`.
- Para medir también en un dominio propio, sumarlo a `MEDIR_EN`.

## Cambios frecuentes

- **Agregar o editar frases:** en `contenido.json`, copiar un bloque de `frases` y cambiar `id` (único), `cat`, `titulo`, `edad` [mínimo, máximo], `etiqueta`, `cuando`, `frase` y `mascota`. Lo que va entre [corchetes] aparece como campo amarillo para completar.
- **Agregar una mascota:** guardar sus 6 imágenes en `img/mascotas/` con el nombre `especie-expresion.webp` (feliz, saluda, guino, pensando, festeja, sorpresa) y sumarla en `mascotas` dentro de `data.js`. Si falta alguna expresión, anotarla en `expresionesFaltantes`.
- Si se cambia la app (diseño, pantallas, `app.js`, `styles.css`, `data.js`), subir de nuevo la carpeta y aumentar el número en `CACHE = 'familia-v4'` dentro de `sw.js`, para que los celulares tomen la versión nueva. Para cambios de contenido no hace falta.

## Próximos pasos sugeridos

1. **Cobro y acceso:** link de pago de Mercado Pago + código de acceso por comprador (versión simple), o cuentas de usuario con Supabase o Firebase.
2. **Medición:** ya cuenta familias nuevas y las que vuelven (ver arriba). Falta saber qué frases se usan.
3. **Tiendas de apps:** empaquetar esta misma app con Capacitor para App Store y Google Play.
4. **Planilla de edición:** una planilla de Google con una fila por dato y estado "borrador/aprobado", que genere `contenido.json` automáticamente.
5. **Agente de revisión mensual:** revisa las fuentes, avisa vencimientos y propone datos nuevos en borrador.
6. **IA propia (versión premium):** un pequeño servidor que guarde la clave de la API y responda dentro de la app.
