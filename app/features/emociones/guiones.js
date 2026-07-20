// Guiones del chat de emociones. Datos puros, sin imports de React Native.
//
// Reglas de tono (CLAUDE.md sección 2, verificadas mecánicamente en
// guiones.test.js): validar primero, nunca minimizar, nunca diagnosticar,
// cero positividad forzada en TRISTE/ANSIOSO/ENOJADO. La actividad se ofrece
// como "algo pequeño que acompaña", nunca como solución.
//
// Estructura: cada emoción comparte el esqueleto
//   validacion (1er intercambio) → rama según respuesta (2º) → cierre → sugerencia
// `bot` son VARIANTES del mismo mensaje (se elige una por conversación),
// no mensajes consecutivos. `textoLibre: true` habilita el TextInput del chat
// y `textoLibreNext` indica a qué paso avanza lo escrito.

export const SUGERENCIA = 'SUGERENCIA';

export const SALUDO = [
  'Hola 👋 Este es tu espacio. ¿Cómo estás hoy?',
  'Qué bueno verte por acá. ¿Cómo te sientes en este momento?',
  'Hola. Tómate un segundo antes de responder: ¿cómo estás hoy?',
];

export const DESPEDIDA = [
  'Me alegra haberte acompañado este rato. Aquí voy a estar cuando quieras volver.',
  'Gracias por darte este momento. Vuelve cuando lo necesites.',
  'Que el resto del día sea amable contigo. Hasta la próxima.',
];

export const ERROR_ENTRADA = [
  'No pude guardar tu registro — parece un problema de conexión. ¿Intentamos de nuevo?',
  'Algo falló al guardar. Revisa tu conexión y volvemos a intentarlo.',
];

export const ENTRADA_ENCOLADA = [
  'Guardé tu registro en este dispositivo. Se sincronizará automáticamente cuando vuelva la conexión.',
];

export const ENTRADA_SINCRONIZADA = [
  'Tu registro ya se sincronizó. La sugerencia está lista en tu espacio Para mí.',
];

export const ETIQUETAS = {
  reintentar: 'Intentar de nuevo',
  reiniciar: 'Registrar otra emoción',
  verSugerencia: 'Ver mi sugerencia',
  seguirSinConexion: 'Seguir sin conexión',
  placeholderTextoLibre: '…o cuéntame con tus palabras',
};

export const GUIONES = {
  FELIZ: {
    pasoInicial: 'validacion',
    pasos: {
      validacion: {
        bot: [
          '¡Qué bueno leer eso! Los días buenos también merecen su espacio. ¿Hay algo en particular detrás de esa alegría?',
          'Me alegra que hoy venga con buen ánimo. ¿Qué lo hizo posible?',
        ],
        quickReplies: [
          { id: 'evento', label: 'Pasó algo bueno', next: 'evento' },
          { id: 'porquesi', label: 'Simplemente amanecí así', next: 'porquesi' },
          { id: 'compartido', label: 'Compartí con alguien', next: 'compartido' },
          { id: 'reserva', label: 'Solo quiero disfrutarlo', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      evento: {
        bot: [
          'Esas cosas merecen reconocerse — no las des por sentadas. ¿Qué te gustaría hacer con este buen momento?',
          'Qué bien. Date un segundo para registrarlo de verdad: lo bueno también se entrena. ¿Cómo quieres aprovecharlo?',
        ],
        quickReplies: [
          { id: 'celebrar', label: 'Celebrarlo de algún modo', next: 'cierre' },
          { id: 'contar', label: 'Contárselo a alguien', next: 'cierre' },
          { id: 'guardar', label: 'Guardarlo para mí', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      porquesi: {
        bot: [
          'Esos días que llegan bien sin motivo son un regalo. No hace falta explicarlos para aprovecharlos. ¿Qué te gustaría hacer con esa energía?',
          'A veces el ánimo simplemente acompaña, y está bien así. ¿Hacia dónde quieres llevar este impulso?',
        ],
        quickReplies: [
          { id: 'activo', label: 'Algo activo', next: 'cierre' },
          { id: 'tranquilo', label: 'Algo tranquilo', next: 'cierre' },
          { id: 'fluir', label: 'Lo que salga', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      compartido: {
        bot: [
          'Los buenos momentos compartidos suelen ser los que más duran en la memoria. Me alegra que hayas tenido uno.',
          'Qué bonito cuando la compañía suma. Esas conexiones también son bienestar.',
        ],
        quickReplies: [
          { id: 'buenrato', label: 'Sí, fue un buen rato', next: 'cierre' },
          { id: 'repetir', label: 'Quiero que se repita', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      cierre: {
        bot: [
          'Gracias por compartir tu buen momento. Te dejé una idea esperando en tu espacio Para mí, por si quieres sacarle todavía más brillo al día.',
          'Me quedo con esa buena energía. En tu espacio Para mí te dejé una propuesta para aprovecharla cuando quieras.',
        ],
        next: SUGERENCIA,
      },
    },
  },

  TRISTE: {
    pasoInicial: 'validacion',
    pasos: {
      validacion: {
        bot: [
          'Siento que hoy sea un día pesado. La tristeza es una emoción válida y no tienes que apurarte a salir de ella. ¿Tiene que ver con algo en particular?',
          'Gracias por contármelo — decirlo ya es un paso. Estoy aquí para acompañarte un momento. ¿Sabes qué la está trayendo?',
        ],
        quickReplies: [
          { id: 'evento', label: 'Pasó algo puntual', next: 'evento' },
          { id: 'difuso', label: 'No sé bien por qué', next: 'difuso' },
          { id: 'dias', label: 'Vengo así hace días', next: 'dias' },
          { id: 'reserva', label: 'Prefiero no entrar en eso', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      evento: {
        bot: [
          'Gracias por contármelo. Cuando algo concreto nos golpea, es normal que el ánimo se venga abajo — no significa que estés haciendo algo mal. ¿Cómo lo estás llevando?',
          'Lamento que haya pasado eso. Es entendible que te tenga así. ¿Cómo lo estás llevando?',
        ],
        quickReplies: [
          { id: 'masomenos', label: 'Más o menos', next: 'cierre' },
          { id: 'mal', label: 'Bastante mal', next: 'cierre' },
          { id: 'distraer', label: 'Intentando distraerme', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      difuso: {
        bot: [
          'A veces la tristeza no tiene una razón clara, y eso también está bien. No necesitas justificarla para que sea real.',
          'No siempre hay un porqué, y no por eso pesa menos. Gracias por ponerle nombre igual.',
        ],
        quickReplies: [
          { id: 'gracias', label: 'Gracias por decirlo', next: 'cierre' },
          { id: 'raro', label: 'Es raro sentirse así', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      dias: {
        bot: [
          'Llevar varios días así cansa. Gracias por decirlo — reconocerlo ya es cuidarte un poco.',
          'Cargar con esto varios días seguidos agota. Que lo estés registrando aquí también es una forma de cuidarte.',
        ],
        quickReplies: [
          { id: 'pesa', label: 'Sí, ya pesa', next: 'cierre' },
          { id: 'pase', label: 'Quiero que pase', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      cierre: {
        bot: [
          'Gracias por compartir esto conmigo. No voy a pretender arreglarlo con una frase. Te dejé algo pequeño y amable en tu espacio Para mí, por si en algún momento te hace sentido.',
          'Te agradezco la confianza. Sin apuro: cuando quieras, en tu espacio Para mí hay una idea suave esperándote.',
        ],
        next: SUGERENCIA,
      },
    },
  },

  ANSIOSO: {
    pasoInicial: 'validacion',
    pasos: {
      validacion: {
        bot: [
          'Siento que estés con esa inquietud. La ansiedad se siente en el cuerpo y agota. Estoy aquí. ¿Sabes qué la está despertando?',
          'Gracias por decirlo. Lo que sientes es real y tiene sentido prestarle atención. ¿Viene de algo en particular?',
        ],
        quickReplies: [
          { id: 'foco', label: 'Algo específico me preocupa', next: 'foco' },
          { id: 'general', label: 'Es una sensación general', next: 'general' },
          { id: 'carga', label: 'Tengo mucho encima', next: 'carga' },
          { id: 'reserva', label: 'Prefiero no detallar', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      foco: {
        bot: [
          'Tiene sentido que eso te inquiete. No tienes que resolverlo ahora. ¿Qué tan cerca está eso que te preocupa?',
          'Entiendo. Cuando algo concreto ronda la cabeza, cuesta pensar en otra cosa. Una cosa a la vez. ¿Qué tan encima lo sientes?',
        ],
        quickReplies: [
          { id: 'inminente', label: 'Está muy encima', next: 'cierre' },
          { id: 'falta', label: 'Aún queda tiempo', next: 'cierre' },
          { id: 'nodepende', label: 'No depende de mí', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      general: {
        bot: [
          'Esa inquietud sin nombre es incómoda. No estás inventando nada: se siente, y con eso basta.',
          'A veces el cuerpo se adelanta sin avisar por qué. No necesitas encontrarle explicación ahora.',
        ],
        quickReplies: [
          { id: 'cuerpo', label: 'Se siente en el cuerpo', next: 'cierre' },
          { id: 'concentrar', label: 'No me deja concentrarme', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      carga: {
        bot: [
          'Cargar mucho a la vez abruma a cualquiera. No es debilidad: es señal de que llevas rato empujando.',
          'Cuando todo se junta, es normal sentirse así. No tienes que poder con todo hoy.',
        ],
        quickReplies: [
          { id: 'demasiado', label: 'Sí, es demasiado', next: 'cierre' },
          { id: 'partir', label: 'No sé por dónde partir', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      cierre: {
        bot: [
          'Gracias por contarme. No tienes que resolverlo todo ahora. Te dejé algo pequeño y concreto en tu espacio Para mí, solo para este momento.',
          'Te escucho. Vamos paso a paso: en tu espacio Para mí te espera una idea simple, sin exigencias.',
        ],
        next: SUGERENCIA,
      },
    },
  },

  CALMADO: {
    pasoInicial: 'validacion',
    pasos: {
      validacion: {
        bot: [
          'Qué bien se lee esa calma. Es un buen lugar donde estar. ¿Sabes qué te trajo esta tranquilidad?',
          'Me alegra encontrarte así. La calma también merece registrarse. ¿De dónde viene hoy?',
        ],
        quickReplies: [
          { id: 'alivio', label: 'Solté algo pendiente', next: 'alivio' },
          { id: 'momento', label: 'Tuve un momento tranquilo', next: 'momento' },
          { id: 'racha', label: 'Vengo así hace días', next: 'racha' },
          { id: 'reserva', label: 'Solo quiero registrarlo', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      alivio: {
        bot: [
          'Ese alivio de cerrar algo pendiente es de las mejores sensaciones. Disfrútalo sin culpa.',
          'Qué bueno. Soltar peso también es avanzar.',
        ],
        quickReplies: [
          { id: 'liviano', label: 'Sí, se siente liviano', next: 'cierre' },
          { id: 'quedan', label: 'Quedan cosas, pero hoy no', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      momento: {
        bot: [
          'Esos momentos tranquilos valen oro. Qué bueno que lo notaste mientras pasaba, no después.',
          'Un buen rato de calma puede cambiar el color del día entero.',
        ],
        quickReplies: [
          { id: 'dure', label: 'Quiero que dure', next: 'cierre' },
          { id: 'breve', label: 'Fue breve pero bueno', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      racha: {
        bot: [
          'Una buena racha de calma se cuida y se agradece. Me alegra que la estés notando.',
          'Qué bueno que se mantenga. Registrarlo ayuda a reconocer qué la sostiene.',
        ],
        quickReplies: [
          { id: 'semana', label: 'Ha sido una buena semana', next: 'cierre' },
          { id: 'siga', label: 'Ojalá siga así', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      cierre: {
        bot: [
          'Gracias por compartir esa calma. Te dejé una idea suave en tu espacio Para mí, para sostenerla un rato más.',
          'Me quedo con esa serenidad. En tu espacio Para mí hay una propuesta acorde al momento, para cuando quieras.',
        ],
        next: SUGERENCIA,
      },
    },
  },

  ENOJADO: {
    pasoInicial: 'validacion',
    pasos: {
      validacion: {
        bot: [
          'Gracias por decirlo. Enojarse tiene sentido cuando algo nos parece injusto o nos pasa a llevar. ¿Quieres contarme qué pasó?',
          'Te leo. El enojo también informa: algo importante para ti fue tocado. ¿Qué lo encendió?',
        ],
        quickReplies: [
          { id: 'persona', label: 'Alguien me hizo enojar', next: 'persona' },
          { id: 'injusto', label: 'Una situación injusta', next: 'injusto' },
          { id: 'acumulado', label: 'Muchas cosas juntas', next: 'acumulado' },
          { id: 'reserva', label: 'Prefiero no revivirlo', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      persona: {
        bot: [
          'Es frustrante cuando el enojo viene de alguien cercano o con quien tienes que seguir tratando. Tu molestia es válida.',
          'Entiendo. Que una persona te lleve a este punto dice que algo ahí te importa o te afecta de verdad.',
        ],
        quickReplies: [
          { id: 'puntual', label: 'Fue algo puntual', next: 'cierre' },
          { id: 'siempre', label: 'Es de siempre', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      injusto: {
        bot: [
          'Las injusticias enojan, y está bien que te enojen — significa que te importa lo correcto.',
          'Tiene sentido. Cuando algo se siente injusto, el enojo es una respuesta honesta.',
        ],
        quickReplies: [
          { id: 'directo', label: 'Me afecta directamente', next: 'cierre' },
          { id: 'otro', label: 'Le pasó a alguien más', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      acumulado: {
        bot: [
          'Cuando se junta una cosa tras otra, cualquiera llega al límite. No estás reaccionando de más: es acumulación.',
          'Todo junto pesa distinto. Es entendible llegar así a esta altura del día.',
        ],
        quickReplies: [
          { id: 'junto', label: 'Sí, fue todo junto', next: 'cierre' },
          { id: 'venia', label: 'Venía acumulándose', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      cierre: {
        bot: [
          'Gracias por sacarlo aquí en vez de guardarlo. No te voy a pedir que lo dejes pasar. Te dejé una idea en tu espacio Para mí para soltar algo de esa energía, si te sirve.',
          'Te agradezco la franqueza. El enojo pide salida, no silencio. En tu espacio Para mí te espera algo para canalizarlo un poco.',
        ],
        next: SUGERENCIA,
      },
    },
  },

  NEUTRO: {
    pasoInicial: 'validacion',
    pasos: {
      validacion: {
        bot: [
          'Un día normal también cuenta, y registrarlo también vale. ¿Cómo describirías este momento?',
          'Gracias por pasar igual, aunque no haya mucho que reportar. ¿Cómo se siente el día?',
        ],
        quickReplies: [
          { id: 'sinmas', label: 'Tranquilo, sin más', next: 'sinmas' },
          { id: 'plano', label: 'Un poco plano', next: 'plano' },
          { id: 'automatico', label: 'En piloto automático', next: 'automatico' },
          { id: 'reserva', label: 'Solo quería registrar', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      sinmas: {
        bot: [
          'Los días sin sobresaltos también suman. No todo tiene que ser intenso para valer.',
          'Está bien que un día sea simplemente eso: un día.',
        ],
        quickReplies: [
          { id: 'bienasi', label: 'Sí, está bien así', next: 'cierre' },
          { id: 'agradece', label: 'Se agradece lo tranquilo', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      plano: {
        bot: [
          'Esos días grises sin ser malos también existen. No tienes que forzarte a sentir más.',
          'Lo plano a veces solo es descanso del ánimo. No le debes intensidad a nadie.',
        ],
        quickReplies: [
          { id: 'puedeser', label: 'Puede ser', next: 'cierre' },
          { id: 'varios', label: 'Llevo varios así', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      automatico: {
        bot: [
          'El piloto automático a veces es la forma de avanzar cuando hay mucho. Que lo notes ya es salir un poco de él.',
          'Pasa más seguido de lo que se cree. Darse cuenta es el primer gesto de presencia.',
        ],
        quickReplies: [
          { id: 'nonotaba', label: 'Cierto, no lo había notado', next: 'cierre' },
          { id: 'desconectar', label: 'Quiero desconectarme un rato', next: 'cierre' },
        ],
        textoLibre: true,
        textoLibreNext: 'cierre',
      },
      cierre: {
        bot: [
          'Gracias por el registro. Te dejé una idea simple en tu espacio Para mí, por si quieres darle un matiz al día.',
          'Anotado. En tu espacio Para mí quedó una propuesta pequeña, sin compromiso.',
        ],
        next: SUGERENCIA,
      },
    },
  },
};
