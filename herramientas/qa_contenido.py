"""Prueba de la actualización de contenido.
Uso: python3 herramientas/qa_contenido.py http://localhost:8000 carpeta-capturas
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1]
OUT = Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
original = json.loads((Path(__file__).parent.parent / 'contenido.json').read_text())
V0 = original['version']

def version(n, texto=None, romper=False):
    c = json.loads(json.dumps(original)); c['version'] = n; c['actualizado'] = '2026-11-%02d' % n
    if texto: c['sabias'].insert(0, {'id': 'nuevo', 'tipo': 'consejo', 'pais': 'global', 'revisado': '2026-11', 'texto': texto, 'accion': 'Acción de prueba.'})
    if romper: del c['frases']
    return json.dumps(c)

servido = {'cuerpo': None, 'caido': False}
def ruta(route):
    if servido['caido']: return route.abort()
    if servido['cuerpo'] is None: return route.continue_()
    route.fulfill(status=200, content_type='application/json', body=servido['cuerpo'])

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}, timezone_id='America/Argentina/Mendoza')
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/contenido.json*', ruta)
    pg.goto(BASE + '/index.html')
    pg.evaluate("localStorage.setItem('familia.v1', JSON.stringify({listo:true, edades:['6-9'], pais:'AR'})); location.reload()")
    pg.wait_for_timeout(500)

    def pie():
        pg.goto(BASE + '/index.html#/ajustes'); pg.reload(); pg.wait_for_timeout(500)
        return pg.inner_text('.pie')

    v = pie(); print('1) sin cambios:', v.replace('\n', ' ')); assert '(v%d)' % V0 in v

    servido['cuerpo'] = version(V0 + 1, 'DATO NUEVO DE PRUEBA')
    v = pie(); print('2) versión nueva publicada:', v.replace('\n', ' ')); assert '(v%d)' % (V0 + 1) in v
    pg.goto(BASE + '/index.html#/consejos'); pg.reload(); pg.wait_for_timeout(400)
    assert 'DATO NUEVO DE PRUEBA' in pg.inner_text('main'); pg.screenshot(path=str(OUT / 'c1-nuevo-dato.png'))
    print('   el dato nuevo aparece en ¿Sabías que?')

    servido['caido'] = True
    v = pie(); print('3) sin internet:', v.replace('\n', ' ')); assert '(v%d)' % (V0 + 1) in v

    servido['caido'] = False; servido['cuerpo'] = version(V0 + 2, romper=True)
    v = pie(); print('4) versión con errores:', v.replace('\n', ' ')); assert '(v%d)' % (V0 + 1) in v

    servido['cuerpo'] = None
    pg.goto(BASE + '/index.html#/seguridad'); pg.reload(); pg.wait_for_timeout(400)
    assert 'Teléfonos útiles (Argentina)' in pg.inner_text('main'); pg.screenshot(path=str(OUT / 'c2-seguridad-ar.png'), full_page=True)
    pg.goto(BASE + '/index.html#/ajustes'); pg.click('button[data-pais="otro"]'); pg.screenshot(path=str(OUT / 'c3-ajustes.png'), full_page=True)
    pg.goto(BASE + '/index.html#/seguridad'); pg.reload(); pg.wait_for_timeout(400)
    t = pg.inner_text('main'); assert 'Teléfonos útiles' not in t
    pg.goto(BASE + '/index.html#/consejos'); pg.reload(); pg.wait_for_timeout(400)
    t = pg.inner_text('main'); assert 'Ley 26.904' not in t and 'OMS' in t
    print('5) otro país: sin teléfonos ni datos solo de Argentina; quedan los globales')

    pg.goto(BASE + '/index.html#/ajustes'); pg.click('button[data-pais="AR"]')
    print('errores de la página:', errs or 'ninguno')
    b.close()
