/* FamilIA · contenido de la app (versión 1)
   Edades: [mínimo, máximo]. [0, 17] = toda la familia. */
window.FAMILIA_DATA = {
  rangosEdad: [
    { id: '0-5', label: '0 a 5 años', min: 0, max: 5 },
    { id: '6-9', label: '6 a 9 años', min: 6, max: 9 },
    { id: '10-12', label: '10 a 12 años', min: 10, max: 12 },
    { id: '13-17', label: '13 a 17 años', min: 13, max: 17 }
  ],

  ayudantes: [
    { id: 'whatsapp', label: 'El círculo azul de WhatsApp', hint: 'Ya viene en tu celular' },
    { id: 'chatgpt', label: 'ChatGPT', hint: 'App o web, versión gratuita' },
    { id: 'gemini', label: 'Gemini', hint: 'De Google' },
    { id: 'nose', label: 'No sé todavía', hint: 'Te ayudamos a elegir' }
  ],

  mascotas: [
    { id: 'unicornio', label: 'Unicornio', fondo: '#F3E9FF' },
    { id: 'conejo', label: 'Conejo', fondo: '#FFE3DA' },
    { id: 'perro', label: 'Perro', fondo: '#FFF1C7' },
    { id: 'gato', label: 'Gato', fondo: '#FFE9D6' },
    { id: 'zorro', label: 'Zorro', fondo: '#D6F5F1' },
    { id: 'futbolista', label: 'Futbolista', fondo: '#DDEEFF' }
  ],
  /* El unicornio no tiene "sorpresa": se usa "feliz" en su lugar. */
  expresionesFaltantes: { unicornio: ['sorpresa'] },
  nombresSugeridos: ['Luna', 'Nube', 'Chispa', 'Coco'],

  categorias: [
    { id: 'cocina', titulo: 'No sé qué cocinar', nombre: 'Cocina y compras', fondo: '#FFE3DA', icono: 'olla',
      bajada: 'Menús, listas del súper y recetas para cocinar en familia.' },
    { id: 'tarea', titulo: 'Ayuda con la tarea', nombre: 'Tarea y escuela', fondo: '#DDEEFF', icono: 'lapiz',
      bajada: 'Frases para que el ayudante explique, sin hacer la tarea por ellos.' },
    { id: 'pantallas', titulo: 'Peleas por las pantallas', nombre: 'Pantallas en familia', fondo: '#FFF1C7', icono: 'pantalla',
      bajada: 'El desafío de 7 días para usar la tecnología a favor de la familia.' },
    { id: 'dormir', titulo: 'Un cuento para dormir', nombre: 'Dormir y cuentos', fondo: '#ECE6FF', icono: 'luna',
      bajada: 'Cuentos, rutinas y charlas tranquilas antes de dormir.' },
    { id: 'organizar', titulo: 'Organizar la semana', nombre: 'Organización de la semana', fondo: '#D6F5F1', icono: 'calendario',
      bajada: 'Horarios, tareas de la casa, mensajes y cumpleaños.' },
    { id: 'planes', titulo: 'Planes sin pantallas', nombre: 'Planes sin pantallas', fondo: '#E3F6DC', icono: 'sol',
      bajada: 'Juegos, salidas y desafíos para hacer juntos.' },
    { id: 'charlas', titulo: 'Charlas difíciles', nombre: 'Charlas difíciles y seguridad', fondo: '#FDE2EC', icono: 'escudo',
      bajada: 'Para preparar la charla. La charla la tiene la familia, no el ayudante.' }
  ]
  /* El contenido (frases, datos, consejos, hábitos, teléfonos) está en contenido.json. */
};
