require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const actividades = {
  FELIZ: [
    {
      nombre: 'Salida con amigos',
      descripcion: 'Organiza un plan con personas que quieras: café, paseo o simplemente conversar.',
      categoria: 'social',
    },
    {
      nombre: 'Baila tu canción favorita',
      descripcion: 'Pon música que te guste y muévete libremente por 10 minutos.',
      categoria: 'físico',
    },
    {
      nombre: 'Cocina algo especial',
      descripcion: 'Prepara una receta nueva o un plato que disfrutes como celebración del buen momento.',
      categoria: 'creativo',
    },
    {
      nombre: 'Fotografía urbana',
      descripcion: 'Sal con el celular a capturar cosas bonitas de tu entorno. El buen ánimo sharpens la mirada.',
      categoria: 'creativo',
    },
    {
      nombre: 'Escribe a alguien que aprecias',
      descripcion: 'Manda un mensaje a alguien diciéndole cuánto lo valoras. El buen ánimo se multiplica al compartirlo.',
      categoria: 'social',
    },
  ],
  TRISTE: [
    {
      nombre: 'Escribe en un diario',
      descripcion: 'Anota cómo te sientes sin juzgarte. Poner las emociones en palabras ayuda a procesarlas.',
      categoria: 'reflexión',
    },
    {
      nombre: 'Manta y película favorita',
      descripcion: 'Armate un rincón cómodo y pon una película que te guste o te traiga buenos recuerdos.',
      categoria: 'entretenimiento',
    },
    {
      nombre: 'Paseo corto al aire libre',
      descripcion: 'Sal 15 minutos a caminar sin destino. El movimiento y el aire fresco levantan el ánimo.',
      categoria: 'físico',
    },
    {
      nombre: 'Playlist tranquila',
      descripcion: 'Pon música suave o instrumental y deja que las emociones fluyan sin apuro. No tienes que "arreglarte" ahora.',
      categoria: 'entretenimiento',
    },
    {
      nombre: 'Prepara algo caliente',
      descripcion: 'El ritual de preparar un té, café o chocolate caliente y sentarte con ello es un pequeño ancla reconfortante.',
      categoria: 'relajación',
    },
  ],
  ANSIOSO: [
    {
      nombre: 'Respiración 4-7-8',
      descripcion: 'Inhala 4 segundos, sostén 7, exhala 8. Repite 4 veces. Activa el sistema nervioso parasimpático.',
      categoria: 'relajación',
    },
    {
      nombre: 'Meditación guiada de 5 minutos',
      descripcion: 'Usa una app o video para hacer una meditación corta. Solo enfócate en tu respiración.',
      categoria: 'mindfulness',
    },
    {
      nombre: 'Escribe tus preocupaciones',
      descripcion: 'Anota todo lo que te genera ansiedad. Sacarlo de la cabeza y al papel libera espacio mental.',
      categoria: 'reflexión',
    },
    {
      nombre: 'Scan corporal de 5 minutos',
      descripcion: 'Cierra los ojos y recorre tu cuerpo de pies a cabeza. Nota qué tensiones hay y suéltalas conscientemente.',
      categoria: 'mindfulness',
    },
    {
      nombre: 'Ordena un espacio pequeño',
      descripcion: 'Pon orden en un cajón o tu bolso. La acción concreta con resultados visibles calma la mente dispersa.',
      categoria: 'productividad',
    },
  ],
  CALMADO: [
    {
      nombre: 'Lee un libro',
      descripcion: 'Aprovecha la calma para sumergirte en una lectura que hayas querido empezar.',
      categoria: 'entretenimiento',
    },
    {
      nombre: 'Dibuja o colorea',
      descripcion: 'Crea algo con las manos: un dibujo libre, mandalas o lo que se te ocurra.',
      categoria: 'creativo',
    },
    {
      nombre: 'Cuida tus plantas o entorno',
      descripcion: 'Riega plantas, ordena tu escritorio o acomoda un espacio. Actividad meditativa de bajo esfuerzo.',
      categoria: 'productividad',
    },
    {
      nombre: 'Aprende algo en 10 minutos',
      descripcion: 'Busca un video corto sobre algo que te llame la atención. La calma es el mejor estado para absorber ideas.',
      categoria: 'productividad',
    },
    {
      nombre: 'Escribe tus metas de la semana',
      descripcion: 'Aprovecha la claridad mental para pensar qué quieres lograr. Sin presión — solo intenciones.',
      categoria: 'reflexión',
    },
  ],
  ENOJADO: [
    {
      nombre: 'Ejercicio intenso',
      descripcion: 'Sal a correr, haz burpees o salta la cuerda. El esfuerzo físico canaliza la adrenalina del enojo.',
      categoria: 'físico',
    },
    {
      nombre: 'Escribe sin filtro',
      descripcion: 'Redacta una carta que no enviarás. Di todo lo que sientes. Luego bórrala o guárdala.',
      categoria: 'reflexión',
    },
    {
      nombre: 'Estiramientos y respiración',
      descripcion: 'Haz 5 minutos de estiramientos lentos con respiraciones profundas. Baja la tensión corporal.',
      categoria: 'relajación',
    },
    {
      nombre: 'Descarga física controlada',
      descripcion: 'Golpea un cojín, grita con la cara en una almohada o haz sentadillas hasta el cansancio. Sana y privada.',
      categoria: 'físico',
    },
    {
      nombre: 'Camina rápido 10 minutos',
      descripcion: 'El ritmo acelerado consume la adrenalina del enojo de forma saludable. Sin destino, solo moverte.',
      categoria: 'físico',
    },
  ],
  NEUTRO: [
    {
      nombre: 'Aprende algo nuevo',
      descripcion: 'Mira un tutorial o lee sobre algo que te llame la atención. Un poco de curiosidad activa la mente.',
      categoria: 'productividad',
    },
    {
      nombre: 'Ordena un espacio',
      descripcion: 'Escoge un cajón, escritorio o rincón y déjalo impecable. La acción pequeña crea momentum.',
      categoria: 'productividad',
    },
    {
      nombre: 'Planifica algo que desees',
      descripcion: 'Busca un lugar que quieras visitar, un proyecto que quieras hacer o algo que te ilusione.',
      categoria: 'reflexión',
    },
    {
      nombre: 'Escucha un podcast nuevo',
      descripcion: 'Encuentra un tema que no conozcas y deja que algo nuevo capture tu interés. Sin presión de ser productivo.',
      categoria: 'entretenimiento',
    },
    {
      nombre: 'Reconecta con alguien',
      descripcion: 'Llama o escribe a alguien con quien no hayas hablado en un tiempo. Un momento neutro es perfecto para eso.',
      categoria: 'social',
    },
  ],
};

async function main() {
  // Limpia todo para reseed limpio (Suggestion depende de Activity, se borra primero)
  await prisma.suggestion.deleteMany();
  await prisma.activity.deleteMany(); // cascade a MoodActivity

  let total = 0;
  for (const [moodType, lista] of Object.entries(actividades)) {
    for (const act of lista) {
      await prisma.activity.create({
        data: {
          nombre: act.nombre,
          descripcion: act.descripcion,
          categoria: act.categoria,
          moodActivities: { create: { moodType } },
        },
      });
      total++;
    }
    console.log(`✓ ${moodType}: ${lista.length} actividades`);
  }

  console.log(`\nSeed completado — ${total} actividades insertadas.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
