# Dietas compartidas MVP - Diseño

## Propósito

Crear una aplicación web progresiva (PWA) para que una persona cargue y revise un plan de alimentación semanal, consulte cada comida, organice las compras y la preparación, y comparta información limitada con familiares o personas que cocinan.

El MVP prioriza la precisión y la revisión humana sobre automatizar de manera opaca una prescripción nutricional. No diagnostica, calcula calorías ni emite recomendaciones clínicas.

## Alcance del MVP

- Crear un plan semanal manualmente desde la aplicación.
- Cargar un PDF como archivo de referencia asociado al plan.
- Capturar y editar comidas por día y por momento: desayuno, almuerzo, colación matutina, comida, colación vespertina y cena.
- Registrar ingredientes con cantidad, unidad, categoría y una bandera de preparación (lavar, cortar, cocer o dejar listo).
- Generar una lista de compras agrupada por categoría y una lista de preparación semanal.
- Marcar compras y tareas como terminadas.
- Configurar recordatorios locales en la aplicación para las comidas del día.
- Generar un resumen portable de solo lectura del plan, compras y preparación mediante la función de compartir del dispositivo.

## Fuera de alcance del MVP

- Diagnóstico, cálculo nutricional, seguimiento clínico o recomendaciones personalizadas generadas por IA.
- OCR y conversión automática del PDF a un menú definitivo. Se diseñará la estructura para añadirlo después; en el MVP el PDF se adjunta y el usuario captura o confirma los datos.
- Notificaciones push del sistema operativo, sincronización en tiempo real y acceso sin conexión. La interfaz será PWA-instalable y el recordatorio será visible dentro de la sesión; estas capacidades se incorporarán tras validar el flujo central.
- Sustituciones automáticas. El modelo de datos reservará sustituciones explícitas por ingrediente para una etapa posterior, con catálogo validado por un profesional.

## Usuarios y permisos

El MVP es local y tiene un único propietario en el navegador. Puede crear, editar y eliminar sus planes, ingredientes, tareas, adjuntos y horarios. La persona que recibe un resumen compartido no recibe acceso a la aplicación ni a sus datos locales.

## Flujos principales

### Crear un plan

1. El propietario asigna nombre, semana inicial y meta de agua diaria.
2. Agrega comidas por día y momento.
3. En cada comida agrega ingredientes estructurados, notas y una hora opcional de recordatorio.
4. La aplicación valida que cada ingrediente tenga nombre y una cantidad positiva cuando se indique una unidad.

### Obtener compras y preparación

1. La aplicación recorre todos los ingredientes del plan.
2. Agrupa elementos por categoría y por nombre normalizado.
3. Suma solo ingredientes que usan la misma unidad; unidades distintas se mantienen como renglones separados.
4. Muestra como preparación cada ingrediente con una acción marcada, agrupada por acción y día de consumo.
5. El usuario puede marcar cada renglón como realizado sin alterar el menú.

### Compartir el resumen

1. El propietario elige compartir desde la vista de compras o preparación.
2. La aplicación genera texto legible que el sistema operativo puede enviar por mensajería, correo u otra aplicación.
3. El resumen contiene solo el plan elegido y no expone archivos adjuntos ni datos de perfil.

## Arquitectura

Se implementará una aplicación Next.js con TypeScript y App Router. El MVP usará almacenamiento local del navegador para entregar un flujo demostrable sin depender de una cuenta, servidor ni credenciales externas. Una interfaz de repositorio separará el almacenamiento de la lógica de dominio para que una etapa posterior sustituya localStorage por PostgreSQL, autenticación y almacenamiento de PDF privado.

La lógica de dominio se mantiene independiente de la UI:

- `domain/`: tipos, normalización y agregación de compras/preparación.
- `storage/`: persistencia local y carga de un plan de ejemplo.
- `app/`: pantallas y rutas de la PWA.
- `components/`: formularios y listas accesibles.

## Modelo de datos

```ts
type MealSlot = 'breakfast' | 'lunch' | 'morningSnack' | 'mainMeal' | 'afternoonSnack' | 'dinner'
type PreparationAction = 'wash' | 'cut' | 'cook' | 'prep'
type Ingredient = { id: string; name: string; quantity?: number; unit?: string; category: GroceryCategory; preparationAction?: PreparationAction }
type Meal = { id: string; slot: MealSlot; time?: string; title: string; notes?: string; ingredients: Ingredient[] }
type DayPlan = { date: string; meals: Meal[] }
type DietPlan = { id: string; name: string; startsOn: string; waterGoalLiters?: number; days: DayPlan[] }
```

## Interfaz

La navegación principal tendrá cuatro vistas: **Hoy**, **Semana**, **Compras** y **Preparación**. En móvil usará una barra inferior; en pantalla amplia se mostrará una barra lateral. El flujo de alta se realizará desde la vista Semana mediante un formulario de comida, evitando una tabla compleja.

Los estados vacíos explicarán cómo añadir la primera comida. Cada control tendrá etiqueta visible, foco por teclado y contrastes suficientes.

## Manejo de errores y privacidad

- Rechazar adjuntos que no sean PDF y limitar el tamaño en el cliente.
- Mostrar errores de formularios cerca del campo respectivo.
- El PDF no se interpreta automáticamente en el MVP ni se envía a un tercero.
- La implementación inicial no contendrá datos reales ni enlaces públicos; los enlaces persistentes con revocación quedan para la fase con backend autenticado.

## Pruebas y criterios de aceptación

- Agregar una comida persiste al recargar la página.
- La lista de compras suma ingredientes con mismo nombre y unidad, y no suma unidades incompatibles.
- Preparación incluye únicamente ingredientes con acción de preparación.
- Las casillas de compra/preparación se pueden alternar y persisten.
- El formulario rechaza ingrediente vacío y cantidades menores o iguales a cero cuando existe unidad.
- La app supera pruebas unitarias de dominio, pruebas de componentes y una prueba de flujo de navegador: crear comida -> ver compras -> marcar compra.

## Evolución posterior

La siguiente entrega agregará autenticación, PostgreSQL, archivos privados y enlaces revocables. Posteriormente se agregará OCR/IA con confirmación humana, un catálogo profesional de sustituciones y notificaciones push.
