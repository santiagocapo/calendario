# Calendario de casa

Calendario compartido para dos personas: citas, fechas señaladas y, más adelante, el menú semanal enlazado con la lista de la compra. Es una PWA de un solo archivo alojada en GitHub Pages que usa el mismo proyecto de Firebase que la lista de la compra.

## Qué hace (versión 3)

- **Agenda**: la hoja de hoy arriba, con el menú del día, y debajo todo lo de los próximos 60 días. El botón «Ver 60 días más» amplía el plazo.
- **Semana**: los siete días de lunes a domingo. Tocar el número de un día abre una cita nueva en ese día.
- **Mes**: cuadrícula con un punto de color por cada persona que tiene algo ese día; al tocar un día se ve su lista debajo.
- **Buscar** (lupa de arriba): encuentra citas por título, lugar o notas, y fechas señaladas por nombre. Muestra primero las próximas y luego las pasadas; al tocar una se abre ese día.
- **Ir a una fecha**: en Semana, Mes y Menú, al tocar el título se abre el selector de fecha y se salta directamente, sin pasar mes a mes.
- **Menú**: comida y cena de cada día de la semana. Ver el apartado siguiente.
- **Fechas**: cumpleaños, aniversarios y otras fechas que se repiten cada año, ordenadas por la más cercana. Con el año de nacimiento calcula los que cumple.
- **Citas**: para una persona o para los dos, con hora o de día completo, de uno o varios días (vacaciones), con repetición semanal, mensual o anual y fecha de fin opcional.
- **Citas que se repiten**: al guardar o eliminar, la app pregunta si afecta solo a ese día, a ese día y los siguientes o a toda la serie.
- **Filtro** arriba: Todo, solo lo de uno (incluye lo común) o solo lo del otro.
- Cada cita recuerda quién la añadió y quién la cambió por última vez. Al eliminar hay 6 segundos para deshacer.
- Funciona sin conexión: los cambios se guardan en el móvil y se suben al volver la red.

Colores: la primera persona de `USUARIOS` en azul, la segunda en rosa, «Los dos» en verde y las fechas señaladas con una raya discontinua roja.

## Avisos

- Se activan en cada dispositivo desde el menú de la inicial (arriba a la derecha), con «Activar avisos». En el iPhone solo funcionan con la app añadida a la pantalla de inicio y abierta desde allí (iOS 16.4 o posterior).
- **Citas**: según el aviso elegido en cada una. Van a la persona indicada en «Para» o a los dos.
- **Fechas señaladas**: a las 9:00, una semana antes y el mismo día, a los dos.
- **Menú**: los domingos a las 19:00, si quedan comidas o cenas sin decidir para la semana siguiente.
- Los envía la tarea `avisos.yml` de GitHub Actions cada 10 minutos, con el script `avisos/enviar.mjs`. GitHub puede retrasar la tarea unos minutos, así que un aviso «a la hora» puede llegar algo tarde.
- La clave de la cuenta de servicio de Firebase se guarda solo como secreto `FIREBASE_SERVICE_ACCOUNT` del repositorio. **Nunca se sube como archivo.**
- Los registros de Actions son públicos: el script solo escribe recuentos, nunca títulos, nombres ni correos.
- Para comprobar que todo funciona: Actions, Avisos, «Run workflow» con la casilla de prueba marcada. Llega un «Aviso de prueba» a todos los dispositivos activados.
- GitHub desactiva las tareas programadas de los repositorios públicos tras 60 días sin cambios. La tarea intenta evitarlo sola; si aun así se desactiva, GitHub avisa por correo y basta con volver a activarla en Actions.

## Menú semanal

- Al tocar la comida o la cena de un día se abre el buscador de platos: los usados hace poco aparecen primero y, si el plato no existe, se crea con «Crear».
- Cada plato se guarda con sus ingredientes (nombre y sección de la lista). Solo hace falta apuntar lo que a veces hay que comprar. Si el ingrediente ya existe en la lista de la compra, la sección se pone sola.
- Al poner en el menú un plato con ingredientes, la app pregunta «¿Hay que comprar algo?» con los ingredientes sin marcar. Se marcan solo los que falten y se pulsa «Añadir a la lista», o «No hace falta». Los que ya están en la lista aparecen atenuados.
- «Revisar ingredientes de la semana» junta los ingredientes de todos los platos de la semana visible, sin repetidos, para hacer lo mismo de una vez.
- Lo que se añade aparece en la lista de la compra como producto puntual, con la nota «Para: nombre del plato» y el nombre de quien lo añadió. Si el producto ya existía (por ejemplo, un habitual), solo se vuelve a poner en la lista.
- En la parte inferior están los platos guardados para editarlos o eliminarlos. Eliminar un plato no lo borra de los menús ya puestos.

## Instalación

El calendario reutiliza el proyecto de Firebase de la lista de la compra, así que no hay que crear nada nuevo en Firebase.

1. **Repositorio nuevo** en GitHub llamado `calendario` y sube todos estos archivos.
2. **`config.js`**: sustitúyelo por el `config.js` del repositorio de la lista de la compra, tal cual. Mismo proyecto y mismos correos.
3. **Reglas de Firestore**: en la consola de Firebase, Firestore, pestaña Reglas, añade los bloques del calendario y del menú que hay en `firestore.rules`. Conserva los de `items` y `compras` y pon los correos reales en minúsculas. Publica.
4. **GitHub Pages**: Settings, Pages, rama `main`, carpeta raíz. La dirección será `https://usuario.github.io/calendario/`. No hace falta añadir ningún dominio en Firebase: es el mismo `usuario.github.io` que ya está autorizado para la lista.
5. **Clave restringida**: si en Google Cloud Console restringiste la clave de Firebase a una ruta concreta de la lista (por ejemplo `https://usuario.github.io/lista-compra/*`), añade también `https://usuario.github.io/calendario/*`. Si la restringiste a `https://usuario.github.io/*`, no hay que tocar nada.
6. **En el móvil**: en iPhone, Safari, Compartir, «Añadir a pantalla de inicio»; en Android, Chrome, menú ⋮, «Instalar aplicación». Hay que iniciar sesión una vez: el calendario lleva su propia sesión para no interferir con la lista.

## Datos en Firestore

- `dispositivos`: uno por dispositivo con avisos, con `token`, `usuario`, `dispositivo` y `actualizado`.
- `sistema/avisos`: hora de la última revisión de avisos (solo la usa el script).

- `eventos`: `titulo`, `para` (correo o `ambos`), `fecha` (`AAAA-MM-DD`), `hora` y `horaFin` (`HH:MM`, vacías si es de día completo), `fechaFin` (último día si dura varios), `lugar`, `notas`, `repite` (`no`, `semana`, `mes`, `anio`), `repiteHasta`, `excepciones` (días anulados de la serie), `serie` (en una cita cambiada solo un día, la serie de la que sale), `aviso`, `creadoPor`, `creadoEn`, `editadoPor`, `editadoEn`.
- `platos`: `nombre`, `ingredientes` (lista de `{nombre, categoria}`, con los identificadores de sección de la lista de la compra), `notas`, `ultimoUso`.
- `menu`: un documento por día con el identificador `AAAA-MM-DD` y los campos `comida` y `cena`, cada uno una lista de `{id, nombre}` del plato.
- `items` (de la lista de la compra): el calendario solo añade productos o los vuelve a poner en la lista, con los mismos campos que usa esa app.
- `fechas`: `tipo` (`cumple`, `aniversario`, `otra`), `nombre`, `dia`, `mes`, `anio` (opcional), `notas` y los mismos campos de autoría.

Las fechas se guardan como texto en hora local de España, así no hay desfases de zona horaria.

## Cómo actualizar

- Sustituye `index.html` y cierra y abre la app en los móviles.
- Si añades un archivo a la app, inclúyelo en `SHELL` de `sw.js` y sube la versión de `CACHE` (`calendario-v2`…).
- Si aparece una colección nueva, añádela a las reglas de Firestore.

## Próximas fases

1. **Enlace de suscripción** (.ics) de solo lectura para ver lo compartido en Google Calendar.

## Límites conocidos

- **Google en iPhone**: dentro de la app instalada, Apple puede bloquear la ventana de Google. Entra con correo y contraseña; la sesión queda guardada.
- **Lecturas**: la app descarga todas las citas, los platos y los productos al abrirse, y los menús solo desde cuatro semanas atrás (si se navega más atrás, los descarga entonces). Con el uso de dos personas queda muy por debajo del límite gratuito de 50.000 lecturas diarias.
- El repositorio es público: no escribas correos ni datos personales en este README ni en los *commits*.
