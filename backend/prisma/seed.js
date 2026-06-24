require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const actividades = {
  FELIZ: [
    { nombre: 'Salida con amigos', descripcion: 'Organiza un plan con personas que quieras: café, paseo o simplemente conversar.', categoria: 'social' },
    { nombre: 'Baila tu canción favorita', descripcion: 'Pon música que te guste y muévete libremente por 10 minutos.', categoria: 'físico' },
    { nombre: 'Cocina algo especial', descripcion: 'Prepara una receta nueva o un plato que disfrutes como celebración del buen momento.', categoria: 'creativo' },
    { nombre: 'Fotografía urbana', descripcion: 'Sal con el celular a capturar cosas bonitas de tu entorno. El buen ánimo agudiza la mirada.', categoria: 'creativo' },
    { nombre: 'Escribe a alguien que aprecias', descripcion: 'Manda un mensaje a alguien diciéndole cuánto lo valoras. El buen ánimo se multiplica al compartirlo.', categoria: 'social' },
    { nombre: 'Aprende algo que tenías pendiente', descripcion: 'El buen ánimo es el mejor combustible para aprender. Saca ese curso o tutorial que has postergado.', categoria: 'productividad' },
    { nombre: 'Dibuja o pinta con libertad', descripcion: 'Sin reglas ni presión. Colores, formas, lo que salga. El objetivo es disfrutar, no hacer una obra de arte.', categoria: 'creativo' },
    { nombre: 'Planifica un viaje soñado', descripcion: 'Aunque no sea ahora: busca destinos, anota ideas, imagina el itinerario. Planificar ilusiona.', categoria: 'reflexión' },
    { nombre: 'Ve una película o serie que te ilusione', descripcion: 'Reserva esa película que tienes guardada y disfrútala en un ambiente cómodo.', categoria: 'entretenimiento' },
    { nombre: 'Comparte tu energía positiva', descripcion: 'Llama a alguien que sabes que podría estar pasándola mal. Tu ánimo puede cambiar el suyo.', categoria: 'social' },
    { nombre: 'Ejercicio al aire libre', descripcion: 'Sal a correr, andar en bici o simplemente caminar con música. El movimiento amplifica la alegría.', categoria: 'físico' },
    { nombre: 'Escribe en tu diario', descripcion: 'Anota cómo te sientes hoy. Guardar los buenos momentos ayuda a revisitarlos cuando los necesites.', categoria: 'reflexión' },
    { nombre: 'Cocina para alguien', descripcion: 'Prepara algo rico y compártelo. Cocinar para otros es una forma concreta de demostrar cariño.', categoria: 'social' },
    { nombre: 'Reorganiza un espacio que te guste', descripcion: 'Ordena tu escritorio, estante o rincón favorito. Cuando estás bien, el entorno también mejora.', categoria: 'productividad' },
    { nombre: 'Ponte una meta pequeña y cúmplela hoy', descripcion: 'Elige algo concreto que puedas terminar hoy. El impulso de los días buenos se puede convertir en logros.', categoria: 'productividad' },
  ],
  TRISTE: [
    { nombre: 'Escribe en un diario', descripcion: 'Anota cómo te sientes sin juzgarte. Poner las emociones en palabras ayuda a procesarlas.', categoria: 'reflexión' },
    { nombre: 'Manta y película favorita', descripcion: 'Armate un rincón cómodo y pon una película que te guste o te traiga buenos recuerdos.', categoria: 'entretenimiento' },
    { nombre: 'Paseo corto al aire libre', descripcion: 'Sal 15 minutos a caminar sin destino. El movimiento y el aire fresco levantan el ánimo.', categoria: 'físico' },
    { nombre: 'Playlist tranquila', descripcion: 'Pon música suave o instrumental y deja que las emociones fluyan sin apuro. No tienes que "arreglarte" ahora.', categoria: 'entretenimiento' },
    { nombre: 'Prepara algo caliente', descripcion: 'El ritual de preparar un té, café o chocolate caliente y sentarte con ello es un pequeño ancla reconfortante.', categoria: 'relajación' },
    { nombre: 'Llama a alguien de confianza', descripcion: 'No para solucionar nada, solo para hablar. A veces lo que más ayuda es saber que no estamos solos.', categoria: 'social' },
    { nombre: 'Abraza algo suave', descripcion: 'Un cojín, una manta, tu mascota si tienes. El contacto físico calma el sistema nervioso.', categoria: 'relajación' },
    { nombre: 'Mira fotos bonitas', descripcion: 'Revisa recuerdos buenos: viajes, personas queridas, momentos felices. No para escapar, sino para recordar que existen.', categoria: 'reflexión' },
    { nombre: 'Cuídate físicamente', descripcion: 'Una ducha caliente, crema, tu ropa favorita. Cuidar el cuerpo cuando el ánimo está bajo es un acto de amor propio.', categoria: 'relajación' },
    { nombre: 'Lee algo liviano', descripcion: 'Una novela fácil, cómics, artículos cortos. No te exijas grandes lecturas. Solo distráete suavemente.', categoria: 'entretenimiento' },
    { nombre: 'Dibuja cómo te sientes', descripcion: 'No tiene que ser bonito. Formas, colores, manchas. Exteriorizar la emoción visualmente puede aliviar.', categoria: 'creativo' },
    { nombre: 'Respira profundo 5 minutos', descripcion: 'Inhala contando hasta 4, exhala contando hasta 6. Hazlo durante 5 minutos. El cuerpo se tranquiliza.', categoria: 'mindfulness' },
    { nombre: 'Haz una sola cosa pequeña', descripcion: 'Cuando todo parece pesado, hacer una cosa mínima (tendiste la cama, bebiste agua) es un logro real.', categoria: 'productividad' },
    { nombre: 'Permítete sentir sin pelear', descripcion: 'No tienes que estar bien ahora. Deja que la tristeza esté, sin intentar apagarla. Pasará.', categoria: 'mindfulness' },
    { nombre: 'Escucha tu canción de consuelo', descripcion: 'Esa canción que sientes que te entiende. Escúchala entera, con audífonos, sin interrupciones.', categoria: 'entretenimiento' },
  ],
  ANSIOSO: [
    { nombre: 'Respiración 4-7-8', descripcion: 'Inhala 4 segundos, sostén 7, exhala 8. Repite 4 veces. Activa el sistema nervioso parasimpático.', categoria: 'relajación' },
    { nombre: 'Meditación guiada de 5 minutos', descripcion: 'Usa una app o video para hacer una meditación corta. Solo enfócate en tu respiración.', categoria: 'mindfulness' },
    { nombre: 'Escribe tus preocupaciones', descripcion: 'Anota todo lo que te genera ansiedad. Sacarlo de la cabeza y al papel libera espacio mental.', categoria: 'reflexión' },
    { nombre: 'Scan corporal de 5 minutos', descripcion: 'Cierra los ojos y recorre tu cuerpo de pies a cabeza. Nota qué tensiones hay y suéltalas conscientemente.', categoria: 'mindfulness' },
    { nombre: 'Ordena un espacio pequeño', descripcion: 'Pon orden en un cajón o tu bolso. La acción concreta con resultados visibles calma la mente dispersa.', categoria: 'productividad' },
    { nombre: 'Estira el cuerpo', descripcion: 'La ansiedad se aloja en los músculos. 5 minutos de estiramiento suave libera tensión física acumulada.', categoria: 'físico' },
    { nombre: 'Método 5-4-3-2-1', descripcion: 'Nombra 5 cosas que ves, 4 que tocas, 3 que escuchas, 2 que hueles, 1 que saboreas. Ancla tu mente al presente.', categoria: 'mindfulness' },
    { nombre: 'Sal a caminar aunque sea 10 minutos', descripcion: 'Caminar activa el metabolismo del cortisol. No necesitas destino, solo moverte.', categoria: 'físico' },
    { nombre: 'Prepara una lista de lo que está en tu control', descripcion: 'Divide tu preocupación en "lo que puedo hacer" y "lo que no depende de mí". Actúa en lo primero, suelta lo segundo.', categoria: 'reflexión' },
    { nombre: 'Escucha sonidos de naturaleza', descripcion: 'Lluvia, río, bosque. Los sonidos naturales reducen la activación del sistema nervioso simpático.', categoria: 'relajación' },
    { nombre: 'Toma agua fría', descripcion: 'Beber agua fría activa el nervio vago y ayuda a bajar la frecuencia cardíaca elevada por la ansiedad.', categoria: 'relajación' },
    { nombre: 'Habla con alguien de confianza', descripcion: 'No para que te resuelvan el problema, sino para verbalizarlo. Decirlo en voz alta lo reduce.', categoria: 'social' },
    { nombre: 'Lee algo muy corto', descripcion: 'Un artículo de 3 minutos, un poema, algo que no exija mucha concentración pero que ocupe la mente.', categoria: 'entretenimiento' },
    { nombre: 'Haz algo con las manos', descripcion: 'Amasar, dibujar, escribir a mano, hacer origami. El trabajo manual ancla al presente y relaja.', categoria: 'creativo' },
    { nombre: 'Escribe tres cosas que salieron bien hoy', descripcion: 'Aunque sean pequeñas. El cerebro ansioso amplifica lo negativo; este ejercicio lo reequilibra.', categoria: 'reflexión' },
  ],
  CALMADO: [
    { nombre: 'Lee un libro', descripcion: 'Aprovecha la calma para sumergirte en una lectura que hayas querido empezar.', categoria: 'entretenimiento' },
    { nombre: 'Dibuja o colorea', descripcion: 'Crea algo con las manos: un dibujo libre, mandalas o lo que se te ocurra.', categoria: 'creativo' },
    { nombre: 'Cuida tus plantas o entorno', descripcion: 'Riega plantas, ordena tu escritorio o acomoda un espacio. Actividad meditativa de bajo esfuerzo.', categoria: 'productividad' },
    { nombre: 'Aprende algo en 10 minutos', descripcion: 'Busca un video corto sobre algo que te llame la atención. La calma es el mejor estado para absorber ideas.', categoria: 'productividad' },
    { nombre: 'Escribe tus metas de la semana', descripcion: 'Aprovecha la claridad mental para pensar qué quieres lograr. Sin presión — solo intenciones.', categoria: 'reflexión' },
    { nombre: 'Medita 10 minutos', descripcion: 'La calma es el estado ideal para meditar. Profundiza en ella con una sesión enfocada en el presente.', categoria: 'mindfulness' },
    { nombre: 'Escucha un álbum completo', descripcion: 'Sin hacer otra cosa. Solo escuchar música de principio a fin, con atención. Experiencia casi perdida hoy.', categoria: 'entretenimiento' },
    { nombre: 'Escribe una carta que no enviarás', descripcion: 'A alguien que quieres, a tu yo del futuro, o a ti mismo del pasado. La calma invita a la profundidad.', categoria: 'reflexión' },
    { nombre: 'Cocina sin apuro', descripcion: 'Elige una receta que requiera tiempo y hazla con calma. Cortar, mezclar, oler — cocinar como ritual.', categoria: 'creativo' },
    { nombre: 'Ve un documental', descripcion: 'Algo que te enseñe sobre el mundo. La calma es perfecta para absorber información sin que sature.', categoria: 'entretenimiento' },
    { nombre: 'Practica yoga suave', descripcion: 'No tiene que ser intenso. Posturas lentas y respiración consciente. 15 minutos son suficientes.', categoria: 'físico' },
    { nombre: 'Toma un baño largo', descripcion: 'Con agua caliente, sin apuro. El cuerpo calmado disfruta más este tipo de rituales.', categoria: 'relajación' },
    { nombre: 'Escribe un texto creativo', descripcion: 'Un poema, un relato corto, lo que salga. La mente en calma tiene acceso a capas más profundas.', categoria: 'creativo' },
    { nombre: 'Revisa tu progreso en algo', descripcion: 'Mira qué has logrado en un proyecto, meta o hábito. No para juzgarte, sino para reconocerte.', categoria: 'reflexión' },
    { nombre: 'Paseo lento por el barrio', descripcion: 'Sin destino, sin música si quieres. Solo caminar y observar. La calma se disfruta más en movimiento lento.', categoria: 'físico' },
  ],
  ENOJADO: [
    { nombre: 'Ejercicio intenso', descripcion: 'Sal a correr, haz burpees o salta la cuerda. El esfuerzo físico canaliza la adrenalina del enojo.', categoria: 'físico' },
    { nombre: 'Escribe sin filtro', descripcion: 'Redacta una carta que no enviarás. Di todo lo que sientes. Luego bórrala o guárdala.', categoria: 'reflexión' },
    { nombre: 'Estiramientos y respiración', descripcion: 'Haz 5 minutos de estiramientos lentos con respiraciones profundas. Baja la tensión corporal.', categoria: 'relajación' },
    { nombre: 'Descarga física controlada', descripcion: 'Golpea un cojín, grita con la cara en una almohada o haz sentadillas hasta el cansancio. Sana y privada.', categoria: 'físico' },
    { nombre: 'Camina rápido 10 minutos', descripcion: 'El ritmo acelerado consume la adrenalina del enojo de forma saludable. Sin destino, solo moverte.', categoria: 'físico' },
    { nombre: 'Respira antes de actuar', descripcion: 'Inhala 4 segundos, exhala 8. Hazlo 5 veces. El enojo empuja a reaccionar; la respiración crea pausa.', categoria: 'mindfulness' },
    { nombre: 'Toma agua fría', descripcion: 'El agua fría activa el nervio vago y frena la respuesta de pelea-o-fuga. Simple pero efectivo.', categoria: 'relajación' },
    { nombre: 'Escucha música que libere', descripcion: 'No necesariamente tranquila. A veces una canción potente que se alinee con tu emoción ayuda a procesarla.', categoria: 'entretenimiento' },
    { nombre: 'Aléjate físicamente de la situación', descripcion: 'Si puedes, sal del espacio donde ocurrió el enojo. El cambio de ambiente rompe el bucle mental.', categoria: 'mindfulness' },
    { nombre: 'Limpia con energía', descripcion: 'Fregar, barrer, lavar platos con fuerza. Canaliza la energía del enojo en algo que deja resultados visibles.', categoria: 'productividad' },
    { nombre: 'Dibuja o garabatea', descripcion: 'Sin intención artística. Solo trazar líneas fuertes, manchas de color. Exterioriza sin palabras.', categoria: 'creativo' },
    { nombre: 'Escribe qué desencadenó el enojo', descripcion: 'No para buscar culpables, sino para entender. ¿Qué necesidad detrás del enojo no fue satisfecha?', categoria: 'reflexión' },
    { nombre: 'Cuenta hasta 10 y elige una respuesta', descripcion: 'Literal: cuenta despacio. Luego decide cómo quieres responder. La pausa es donde está tu poder.', categoria: 'mindfulness' },
    { nombre: 'Baile libre con música fuerte', descripcion: 'Pon música alta y muévete como quieras. Es liberación física con componente expresivo.', categoria: 'físico' },
    { nombre: 'Habla cuando estés más calmado', descripcion: 'Si hay algo que decir, espera. Anota ahora lo que quieres expresar para cuando sea el momento.', categoria: 'reflexión' },
  ],
  NEUTRO: [
    { nombre: 'Aprende algo nuevo', descripcion: 'Mira un tutorial o lee sobre algo que te llame la atención. Un poco de curiosidad activa la mente.', categoria: 'productividad' },
    { nombre: 'Ordena un espacio', descripcion: 'Escoge un cajón, escritorio o rincón y déjalo impecable. La acción pequeña crea momentum.', categoria: 'productividad' },
    { nombre: 'Planifica algo que desees', descripcion: 'Busca un lugar que quieras visitar, un proyecto que quieras hacer o algo que te ilusione.', categoria: 'reflexión' },
    { nombre: 'Escucha un podcast nuevo', descripcion: 'Encuentra un tema que no conozcas y deja que algo nuevo capture tu interés. Sin presión de ser productivo.', categoria: 'entretenimiento' },
    { nombre: 'Reconecta con alguien', descripcion: 'Llama o escribe a alguien con quien no hayas hablado en un tiempo. Un momento neutro es perfecto para eso.', categoria: 'social' },
    { nombre: 'Haz una caminata tranquila', descripcion: 'Sin música si quieres. Solo caminar y observar. A veces el movimiento despierta algo dentro.', categoria: 'físico' },
    { nombre: 'Lee artículos de temas que te interesan', descripcion: 'Una hora de lectura libre sobre lo que te llame la atención. Sin agenda, solo explorar.', categoria: 'entretenimiento' },
    { nombre: 'Cocina algo nuevo', descripcion: 'Prueba una receta que nunca hayas hecho. El proceso de descubrir algo culinario despierta los sentidos.', categoria: 'creativo' },
    { nombre: 'Escribe en tu diario', descripcion: 'No tienes que sentir algo intenso para escribir. Los días neutros también merecen ser registrados.', categoria: 'reflexión' },
    { nombre: 'Reorganiza tus prioridades', descripcion: 'Revisa tus listas, metas y pendientes. El estado neutro es ideal para ver con claridad y reordenar.', categoria: 'productividad' },
    { nombre: 'Mueve el cuerpo 20 minutos', descripcion: 'Un entrenamiento suave, yoga, baile libre. El movimiento es la forma más directa de cambiar el estado.', categoria: 'físico' },
    { nombre: 'Mira el cielo un rato', descripcion: 'Literalmente. Sin celular. Nube por nube. A veces la mente neutra necesita algo sin propósito.', categoria: 'mindfulness' },
    { nombre: 'Empieza algo que has pospuesto', descripcion: 'Solo los primeros 5 minutos. No para terminarlo, sino para quitarle el peso de estar pendiente.', categoria: 'productividad' },
    { nombre: 'Ve algo que te dé risa', descripcion: 'Un capítulo de una comedia, clips graciosos, un video que sabes que te hace reír. La risa activa el ánimo.', categoria: 'entretenimiento' },
    { nombre: 'Organiza una salida para pronto', descripcion: 'Propón un plan a alguien: una salida, una comida, algo compartido. Algo que mirar hacia adelante cambia el ánimo.', categoria: 'social' },
  ],
};

async function main() {
  await prisma.suggestion.deleteMany();
  await prisma.activity.deleteMany();

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
