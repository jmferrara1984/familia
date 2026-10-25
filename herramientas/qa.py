"""Recorre FamilIA en tamaño celular y saca capturas de cada pantalla."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1]
OUT = Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
errores = []

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, timezone_id='America/Argentina/Mendoza', locale='es-AR')
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errores.append(str(e)))
    pg.on('console', lambda m: errores.append(m.text) if m.type == 'error' else None)
    def foto(n): pg.wait_for_timeout(400); pg.screenshot(path=str(OUT / f'{n}.png'), full_page=True)

    pg.goto(BASE + '/index.html'); foto('01-bienvenida')
    pg.click('text=Siguiente'); foto('01b-sin-edad')
    pg.click('button[data-edad="6-9"]'); pg.click('button[data-edad="10-12"]')
    pg.click('text=Siguiente'); foto('02-mascota')
    pg.click('button[data-esp="zorro"]'); pg.fill('#nombre', 'Chispa'); foto('02b-mascota-zorro')
    pg.click('text=¡Listo, empecemos!'); foto('03-inicio')
    pg.fill('#buscar', 'dormir'); foto('03b-busqueda')
    pg.fill('#buscar', 'xyzw'); foto('03c-sin-resultados')
    pg.goto(BASE + '/index.html#/frases'); foto('04-frases')
    pg.goto(BASE + '/index.html#/categoria/tarea'); foto('05-categoria')
    pg.click('text=Todas'); foto('05b-categoria-todas')
    pg.goto(BASE + '/index.html#/frase/tarea-explique'); foto('06-frase')
    pg.fill('#h0', '10'); pg.fill('#h1', 'fracciones: 3/4 + 1/2'); foto('06b-frase-completa')
    pg.goto(BASE + '/index.html#/desafio'); foto('07-desafio')
    pg.goto(BASE + '/index.html#/frase/pantallas-1'); pg.click('text=Marcar el día 1 como hecho'); foto('07b-dia-hecho')
    pg.goto(BASE + '/index.html#/desafio'); foto('07c-desafio-progreso')
    pg.goto(BASE + '/index.html#/seguridad'); pg.click('input[data-hab="edades"]'); foto('08-seguridad')
    pg.goto(BASE + '/index.html#/ajustes'); foto('09-ajustes')
    pg.goto(BASE + '/index.html#/consejos'); foto('11-consejos')
    pg.click('button[data-f="seguridad"]'); foto('11b-consejos-seguridad')
    assert pg.locator('article.sabias').count() == 8, pg.locator('article.sabias').count()
    pg.goto(BASE + '/index.html#/inicio'); t1 = pg.inner_text('article.sabias .sabias-texto'); pg.click('button[data-otro]'); t2 = pg.inner_text('article.sabias .sabias-texto'); assert t1 != t2
    print('OK sabias: otro dato cambia el texto')
    pg.goto(BASE + '/index.html#/inicio'); foto('10-inicio-dia2')
    pg.reload(); pg.wait_for_timeout(300)
    estado = pg.evaluate("localStorage.getItem('familia.v1')")
    print('estado guardado:', estado[:160])
    b.close()
print('errores:', errores or 'ninguno')

# Pruebas extra: confirmación en dos toques y enlaces de ayudantes
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/index.html'); pg.click('button[data-edad="0-5"]'); pg.click('text=Siguiente'); pg.click('text=¡Listo, empecemos!')
    pg.click('a.tab[href="#/frases"]'); pg.click('text=Cocina y compras'); pg.click('text=Menú de la semana con lo que hay')
    pg.fill('#h0', '4'); print('wa href:', pg.get_attribute('a[data-dest="wa"]', 'href')[:80])
    pg.go_back(); pg.wait_for_timeout(200); print('volver ->', pg.evaluate('document.querySelector("h1").textContent'))
    pg.goto(BASE + '/index.html#/ajustes'); pg.wait_for_timeout(200)
    pg.click('button[data-acc="borrar"]'); print('1er toque:', pg.text_content('button[data-acc="borrar"]'))
    pg.click('button[data-acc="borrar"]'); pg.wait_for_timeout(200); print('después:', pg.evaluate('document.querySelector("h1").textContent'))
    print('errores extra:', errs or 'ninguno'); b.close()
