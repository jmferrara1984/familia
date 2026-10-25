"""Prueba de La semana en familia y Momentos clave.
Uso: python3 herramientas/qa_fase1.py http://localhost:8000 carpeta-capturas
"""
import json, sys
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1]
OUT = Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844}, timezone_id='America/Argentina/Mendoza', locale='es-AR')
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    def foto(n): pg.wait_for_timeout(300); pg.screenshot(path=str(OUT / f'{n}.png'), full_page=True)
    def estado(): return pg.evaluate("JSON.parse(localStorage.getItem('familia.v1'))")
    def poner(e): pg.evaluate("e => { localStorage.setItem('familia.v1', JSON.stringify(e)); }", e)
    def abrir(r): pg.goto('about:blank'); pg.goto(BASE + '/index.html#/' + r); pg.wait_for_timeout(400)

    pg.goto(BASE + '/index.html')
    poner({'listo': True, 'edades': ['10-12'], 'mascota': {'especie': 'perro', 'nombre': 'Coco'}, 'desafio': [1, 2, 3, 4, 5, 6, 7]})
    abrir('desafio'); pg.click('button[data-acc="empezar-semana"]'); pg.wait_for_timeout(300)
    assert 'Semana 1' in pg.text_content('main'); print('1) semana 1 iniciada desde el desafío completo')
    foto('f1-semana-inicio')

    pg.click('button[data-item="0"]'); pg.click('button[data-item="1"]')
    assert '2 de 4 hechas' in pg.text_content('main'); print('2) actividades marcadas: 2 de 4')
    assert pg.locator('.balance').count() == 0

    pg.click('.item-sem a[href^="#/frase/"]'); pg.wait_for_timeout(200)
    assert pg.get_attribute('.barra-sup a.btn-icono', 'href') == '#/semana'; print('3) desde la semana, "volver" regresa a la semana')

    e = estado(); e['semana']['desde'] = (date.today() - timedelta(days=4)).isoformat(); poner(e)
    abrir('semana'); assert pg.locator('.balance').count() == 1
    pg.click('button[data-animo="igual"]'); pg.click('button[data-dif="dormir"]'); foto('f2-balance')
    pg.click('button[data-acc="guardar-balance"]'); pg.wait_for_timeout(200)
    assert 'Rutina para dormir' in pg.text_content('main'); foto('f3-balance-guardado')
    print('4) balance guardado con sugerencia para "antes de dormir"')
    pg.click('button[data-acc="siguiente-semana"]'); pg.wait_for_timeout(200)
    assert 'Dormir mejor' in pg.text_content('main'); print('5) semana 2 adelantada: Dormir mejor')

    e = estado(); e['semana']['desde'] = (date.today() - timedelta(days=8)).isoformat(); poner(e)
    abrir('semana'); assert 'Crear en vez de mirar' in pg.text_content('main'); print('6) pasada una semana, arranca sola la semana 3')
    assert len(estado()['semana']['historial']) == 2

    abrir('inicio'); foto('f4-inicio'); assert 'Semana 3' in pg.text_content('main') and 'Su primer celular' in pg.text_content('main')
    print('7) inicio muestra la semana y los momentos clave')

    abrir('rutas'); foto('f5-rutas')
    abrir('ruta/primer-celular'); foto('f6-ruta')
    abrir('ruta/primer-celular/1'); pg.click('input[data-chk="p1:0"]'); pg.click('button[data-acc="paso"]'); foto('f7-paso1')
    assert estado()['rutas']['primer-celular']['hechos'].get('p1') and estado()['rutas']['primer-celular']['checks'].get('p1:0')
    print('8) paso 1 con checklist y marcado como hecho')

    abrir('ruta/primer-celular/4'); pg.click('button[data-regla="0"]'); pg.click('button[data-regla="4"]')
    pg.fill('#propia', 'Los domingos, película en familia'); pg.wait_for_timeout(200)
    href = pg.get_attribute('#acuerdo-vista a.btn-accion', 'href')
    assert 'pel%C3%ADcula' in href and 'acuerdo' in href; foto('f8-acuerdo')
    print('9) acuerdo con 3 reglas, listo para compartir')

    abrir('ruta/primer-celular'); foto('f9-ruta-progreso'); assert '1 de 6 pasos' in pg.text_content('main')
    abrir('seguridad'); assert 'Su primer celular' in pg.text_content('main')
    print('errores de la página:', errs or 'ninguno')
    b.close()
