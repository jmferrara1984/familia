"""Arma dist-prueba/ (una sola página con todo adentro) para publicar la versión de prueba.
Uso: python3 herramientas/armar_prueba.py"""
import shutil
from pathlib import Path
R = Path(__file__).parent.parent
css = (R / 'styles.css').read_text()
js = ''.join('<script>\n' + (R / f).read_text() + '\n</script>\n' for f in ('data.js', 'contenido-base.js', 'app.js'))
cab = '''<title>FamilIA</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#FFC93C">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap">
'''
(R / 'dist-prueba').mkdir(exist_ok=True)
(R / 'dist-prueba/index.html').write_text(cab + '<style>\n' + css + '\n</style>\n<div id="app" class="app" aria-live="polite"></div>\n<div id="toast" class="toast" role="status" aria-live="polite"></div>\n' + js)
shutil.copy(R / 'contenido.json', R / 'dist-prueba/contenido.json')
print('dist-prueba listo')
