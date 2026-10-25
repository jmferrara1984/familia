# FamilIA

App web para que las familias usen la IA a su favor: frases listas para usar, el desafío de pantallas de 7 días, La semana en familia, Momentos clave, seguridad y una mascota que acompaña. Powered by Andexia.

- **Versión:** 1.2 (Fase 1, sin servidor)
- **Cómo funciona:** es una página web estática. No usa servidor ni base de datos; lo que elige cada familia queda guardado en su propio celular.
- **Guía completa:** ver [LEEME.md](LEEME.md) (qué es cada archivo, cómo actualizar el contenido y cómo publicar).

## Probarla en la computadora

```
python3 -m http.server 8000
```

Y abrir http://localhost:8000 en el navegador.

## Publicarla

Se puede publicar gratis en Netlify conectando este repositorio. No hace falta comando de build y la carpeta a publicar es la raíz del repo. Cada cambio que se sube a `main` se publica solo.
