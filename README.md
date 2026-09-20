# Calendario de casa

Calendario compartido para dos personas: citas, fechas señaladas y, más adelante, el menú semanal enlazado con la lista de la compra. Es una PWA de un solo archivo alojada en GitHub Pages que usa el mismo proyecto de Firebase que la lista de la compra.

## Qué hace (versión 1)

- **Agenda**: la hoja de hoy arriba y, debajo, todo lo de los próximos 60 días.
- **Semana**: los siete días de lunes a domingo. Tocar el número de un día abre una cita nueva en ese día.
- **Mes**: cuadrícula con un punto de color por cada persona que tiene algo ese día; al tocar un día se ve su lista debajo.
- **Fechas**: cumpleaños, aniversarios y otras fechas que se repiten cada año, ordenadas por la más cercana. Con el año de nacimiento calcula los que cumple.
- **Citas**: para una persona o para los dos, con hora o de día completo, de uno o varios días (vacaciones), con repetición semanal, mensual o anual y fecha de fin opcional.
- **Filtro** arriba: Todo, solo lo de uno (incluye lo común) o solo lo del otro.
- Cada cita recuerda quién la añadió y quién la cambió por última vez. Al eliminar hay 6 segundos para deshacer.
- Funciona sin conexión: los cambios se guardan en el móvil y se suben al volver la red.

Colores: la primera persona de `USUARIOS` en azul, la segunda en rosa, «Los dos» en verde y las fechas señaladas con una raya discontinua roja.

## Instalación

El calendario reutiliza el proyecto de Firebase de la lista de la compra, así que no hay que crear nada nuevo en Firebase.

1. **Repositorio nuevo** en GitHub llamado `calendario` y sube todos estos archivos.
2. **`config.js`**: sustitúyelo por el `config.js` del repositorio de la lista de la compra, tal cual. Mismo proyecto y mismos correos.
3. **Reglas de Firestore**: en la consola de Firebase, Firestore, pestaña Reglas, añade los bloques del calendario y del menú que hay en `firestore.rules`. Conserva los de `items` y `compras` y pon los correos reales en minúsculas. Publica.
4. **GitHub Pages**: Settings, Pages, rama `main`, carpeta raíz. La dirección será `https://usuario.github.io/calendario/`. No hace falta añadir ningún dominio en Firebase: es el mismo `usuario.github.io` que ya está autorizado para la lista.
5. **En el móvil**: en iPhone, Safari, Compartir, «Añadir a pantalla de inicio»; en Android, Chrome, menú ⋮, «Instalar aplicación». Hay que iniciar sesión una vez: el calendario lleva su propia sesión para no interferir con la lista.

## Datos en Firestore

- `eventos`: `titulo`, `para` (correo o `ambos`), `fecha` (`AAAA-MM-DD`), `hora` y `horaFin` (`HH:MM`, vacías si es de día completo), `fechaFin` (último día si dura varios), `lugar`, `notas`, `repite` (`no`, `semana`, `mes`, `anio`), `repiteHasta`, `aviso`, `creadoPor`, `creadoEn`, `editadoPor`, `editadoEn`.
- `fechas`: `tipo` (`cumple`, `aniversario`, `otra`), `nombre`, `dia`, `mes`, `anio` (opcional), `notas` y los mismos campos de autoría.

Las fechas se guardan como texto en hora local de España, así no hay desfases de zona horaria.

## Cómo actualizar

- Sustituye `index.html` y cierra y abre la app en los móviles.
- Si añades un archivo a la app, inclúyelo en `SHELL` de `sw.js` y sube la versión de `CACHE` (`calendario-v2`…).
- Si aparece una colección nueva, añádela a las reglas de Firestore.

## Próximas fases

1. **Menú semanal**: comida y cena de cada día, platos guardados con sus ingredientes. Al poner un plato, la app propondrá añadir sus ingredientes a la lista de la compra, siempre como sugerencia opcional (se puede elegir cuáles o ninguno, porque a veces ya hay de todo en casa). Las colecciones `platos` y `menu` ya están en las reglas.
2. **Notificaciones push** con una tarea programada gratuita de GitHub Actions, sin plan de pago en Firebase. El campo `aviso` de cada cita ya se está guardando para entonces.
3. **Enlace de suscripción** (.ics) de solo lectura para ver lo compartido en Google Calendar.

## Límites conocidos

- **Google en iPhone**: dentro de la app instalada, Apple puede bloquear la ventana de Google. Entra con correo y contraseña; la sesión queda guardada.
- **Repeticiones**: editar o eliminar una cita repetida afecta a toda la serie. Para saltarse un día concreto, de momento, hay que usar la fecha «Hasta» y crear otra serie.
- **Lecturas**: la app descarga todas las citas al abrirse. Con el uso de dos personas queda muy por debajo del límite gratuito de 50.000 lecturas diarias.
- El repositorio es público: no escribas correos ni datos personales en este README ni en los *commits*.
