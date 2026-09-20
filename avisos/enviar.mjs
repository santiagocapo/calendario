// Envía los avisos del calendario. Lo ejecuta GitHub Actions cada 10 minutos.
// Revisa qué avisos tocaban desde la última ejecución y los manda a los dispositivos activados.
// OJO: el repositorio es público y los registros de Actions también. No se escriben
// títulos, nombres ni correos en la consola, solo recuentos.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const TZ = "Europe/Madrid";
const MIN = 6e4, HORA = 36e5, DIA = 864e5;
const MAX_RETRASO = 2 * HORA;   // si Actions estuvo parado, no se recuperan avisos más antiguos

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore(), fcm = getMessaging();
const [dueno, repo] = (process.env.GITHUB_REPOSITORY || "/").split("/");
const APP_URL = `https://${dueno.toLowerCase()}.github.io/${repo}/`;

// Las horas se manejan como "hora local de Madrid escrita como si fuera UTC".
// Así sumar días y comparar es aritmética simple y coincide con lo que guarda la app.
function ahoraLocal() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
}
const ymd = ms => new Date(ms).toISOString().slice(0, 10);
const parse = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const diaDe = ms => ms - (ms % DIA);
const F_DIA = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

// ----- repeticiones (misma lógica que la app) -----
function iniciosSerie(ev, desde, hasta) {
  const s = parse(ev.fecha), out = [];
  if (!ev.repite || ev.repite === "no") { if (s >= desde && s <= hasta) out.push(s); return out; }
  let fin = hasta;
  if (ev.repiteHasta) { const h = parse(ev.repiteHasta); if (h < fin) fin = h; }
  if (s > fin) return out;
  if (ev.repite === "semana") {
    const k = Math.max(0, Math.ceil((desde - s) / (7 * DIA)));
    for (let d = s + 7 * k * DIA; d <= fin; d += 7 * DIA) out.push(d);
    return out;
  }
  const S = new Date(s), D = new Date(desde), paso = ev.repite === "mes" ? 1 : 12, dia = S.getUTCDate();
  let k = Math.max(0, Math.floor(((D.getUTCFullYear() - S.getUTCFullYear()) * 12 + D.getUTCMonth() - S.getUTCMonth()) / paso) - 1);
  for (; ; k++) {
    const m = S.getUTCMonth() + k * paso;
    if (Date.UTC(S.getUTCFullYear(), m, 1) > fin) break;
    const d = Date.UTC(S.getUTCFullYear(), m, dia);
    if (new Date(d).getUTCDate() !== dia) continue;
    if (d >= desde) out.push(d);
  }
  return out;
}
const inicios = (ev, a, b) => { const ex = new Set(ev.excepciones || []); return iniciosSerie(ev, a, b).filter(d => !ex.has(ymd(d))); };

function momentoAviso(ev, occ) {
  if (ev.hora) {
    const min = { "0": 0, "15": 15, "60": 60, "1440": 1440 }[ev.aviso];
    if (min === undefined) return null;
    const [h, m] = ev.hora.split(":").map(Number);
    return occ + (h * 60 + m) * MIN - min * MIN;
  }
  if (ev.aviso === "dia9") return occ + 9 * HORA;
  if (ev.aviso === "vispera20") return occ - DIA + 20 * HORA;
  return null;
}
const fechaEn = (f, y) => { const d = Date.UTC(y, f.mes - 1, f.dia); return new Date(d).getUTCMonth() === f.mes - 1 ? d : Date.UTC(y, f.mes, 0); };
const tituloFecha = f => f.tipo === "cumple" ? `Cumpleaños de ${f.nombre}` : f.tipo === "aniversario" ? `Aniversario: ${f.nombre}` : f.nombre;

// ----- envío -----
let dispositivos = null, enviados = 0, fallidos = 0;
async function enviar(para, title, body, tag) {
  if (!dispositivos) dispositivos = (await db.collection("dispositivos").get()).docs.map(d => d.data()).filter(d => d.token);
  const tokens = dispositivos.filter(d => !para || para === "ambos" || d.usuario === para).map(d => d.token);
  if (!tokens.length) return;
  const r = await fcm.sendEachForMulticast({
    tokens,
    data: { title, body, tag, url: APP_URL },
    webpush: { headers: { Urgency: "high", TTL: "86400" } }
  });
  r.responses.forEach((x, i) => {
    if (x.success) return enviados++;
    fallidos++;
    const c = x.error?.code || "";
    console.log("Fallo de envío:", c);
    if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"].includes(c)) {
      db.collection("dispositivos").doc(tokens[i]).delete().catch(() => { });
      dispositivos = dispositivos.filter(d => d.token !== tokens[i]);
    }
  });
}

async function main() {
  const ahora = ahoraLocal();

  if (process.env.PRUEBA === "true") {
    await enviar(null, "Aviso de prueba", "Si ves esto, los avisos del calendario funcionan en este dispositivo.", "prueba");
    console.log(`Prueba: ${enviados} enviados, ${fallidos} fallidos, ${dispositivos?.length ?? 0} dispositivos.`);
    return;
  }

  const refSis = db.collection("sistema").doc("avisos");
  const sis = (await refSis.get()).data() || {};
  const desde = Math.max(sis.ultima || ahora - 10 * MIN, ahora - MAX_RETRASO);
  const toca = t => t != null && t > desde && t <= ahora;
  const hoy = diaDe(ahora);
  const cuando = (occ, hora) => {
    const dd = Math.round((occ - hoy) / DIA);
    const dia = dd === 0 ? "Hoy" : dd === 1 ? "Mañana" : `El ${F_DIA.format(occ)}`;
    return hora ? `${dia} a las ${hora}` : `${dia}, todo el día`;
  };

  // 1) Citas: las que empiezan cerca (una consulta por fecha) y todas las que se repiten.
  const d0 = diaDe(desde), d1 = hoy + 2 * DIA;
  const [cercanas, series] = await Promise.all([
    db.collection("eventos").where("fecha", ">=", ymd(d0)).where("fecha", "<=", ymd(d1)).get(),
    db.collection("eventos").where("repite", "in", ["semana", "mes", "anio"]).get()
  ]);
  const eventos = new Map();
  for (const d of [...cercanas.docs, ...series.docs]) eventos.set(d.id, d.data());
  for (const [id, ev] of eventos) {
    if (!ev.aviso || !ev.fecha) continue;
    for (const occ of inicios(ev, d0, d1)) {
      if (!toca(momentoAviso(ev, occ))) continue;
      const cuerpo = [cuando(occ, ev.hora), ev.lugar ? `en ${ev.lugar}` : ""].filter(Boolean).join(", ");
      await enviar(ev.para, ev.titulo, cuerpo, `ev-${id}-${ymd(occ)}`);
    }
  }

  // 2) Fechas señaladas: a las 9:00, una semana antes y el mismo día.
  for (let d = d0; d <= hoy; d += DIA) {
    if (!toca(d + 9 * HORA)) continue;
    const fechas = (await db.collection("fechas").get()).docs.map(x => ({ id: x.id, ...x.data() }));
    const y = new Date(d).getUTCFullYear();
    for (const f of fechas) {
      for (const [dias, texto] of [[0, "Hoy"], [7, "Dentro de una semana"]]) {
        const objetivo = d + dias * DIA, yo = new Date(objetivo).getUTCFullYear();
        if (fechaEn(f, yo) !== objetivo) continue;
        const n = f.anio ? yo - f.anio : null;
        const extra = n > 0 && f.tipo === "cumple" ? `, cumple ${n}` : n > 0 && f.tipo === "aniversario" ? `, ${n} años` : "";
        await enviar(null, tituloFecha(f), texto + extra, `fe-${f.id}-${y}-${dias}`);
      }
    }
  }

  // 3) Menú: los domingos a las 19:00, si quedan comidas o cenas sin decidir para la semana siguiente.
  for (let d = d0; d <= hoy; d += DIA) {
    if (new Date(d).getUTCDay() !== 0 || !toca(d + 19 * HORA)) continue;
    const refs = Array.from({ length: 7 }, (_, i) => db.collection("menu").doc(ymd(d + (i + 1) * DIA)));
    const docs = await db.getAll(...refs);
    let libres = 0;
    for (const x of docs) { const m = x.data() || {}; for (const s of ["comida", "cena"]) if (!m[s]?.length) libres++; }
    if (!libres) continue;
    const cuerpo = libres === 14 ? "Todavía no hay nada decidido para la semana que viene."
      : `Quedan ${libres} ${libres === 1 ? "comida o cena" : "comidas y cenas"} sin decidir para la semana que viene.`;
    await enviar(null, "Menú de la semana", cuerpo, `menu-${ymd(d)}`);
  }

  await refSis.set({ ultima: ahora });
  console.log(`Revisado. Avisos enviados: ${enviados}. Fallidos: ${fallidos}.`);
}

main().catch(e => { console.error("Error:", e.code || e.message); process.exit(1); });
