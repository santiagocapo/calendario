// Importa calendarios externos (iCloud, Google…) a la app, en un solo sentido.
// Lo ejecuta la misma tarea de GitHub Actions que los avisos, cada media hora.
// Los enlaces están en el secreto CALENDARIOS_EXTERNOS, nunca en el repositorio.
// Los registros de Actions son públicos: aquí solo se escriben recuentos.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import IcalExpander from "ical-expander";
import { createHash } from "node:crypto";

const TZ = "Europe/Madrid", DIA = 864e5;
const ATRAS = 14, ADELANTE = 270, MAX_CITAS = 2000;

// El error de JSON de Node copia trozos del texto; como los registros son públicos, se da un mensaje propio.
let fuentes;
try {
  fuentes = JSON.parse(process.env.CALENDARIOS_EXTERNOS || "[]");
  if (!Array.isArray(fuentes)) throw new Error();
} catch {
  console.log("El secreto CALENDARIOS_EXTERNOS no tiene un formato válido. Revisa las comillas, las comas y que cada calendario tenga \"url\".");
  process.exit(1);
}
fuentes.forEach((f, i) => { if (!f || !f.url) console.log(`Calendario ${i + 1}: le falta "url".`); });
if (!fuentes.length) { console.log("No hay calendarios externos configurados."); process.exit(0); }

// Se importa a las en punto y a las y media (y siempre al lanzar la tarea a mano).
const minuto = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, minute: "2-digit" }).format(new Date()));
if (process.env.FORZAR !== "true" && minuto % 30 >= 10) { console.log("No toca importar ahora."); process.exit(0); }

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

const FMT = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function local(d) {   // Date → { f: "AAAA-MM-DD", h: "HH:MM" } en hora de Madrid
  const p = Object.fromEntries(FMT.formatToParts(d).map(x => [x.type, x.value]));
  return { f: `${p.year}-${p.month}-${p.day}`, h: `${p.hour}:${p.minute}` };
}
const pad = n => String(n).padStart(2, "0");
const fechaIcal = t => `${t.year}-${pad(t.month)}-${pad(t.day)}`;          // para citas de día completo
const menosUnDia = s => new Date(Date.parse(s + "T00:00:00Z") - DIA).toISOString().slice(0, 10);
const corto = (s, n) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);

function convertir(ev, ini, fin) {
  const t = corto(ev.summary, 150) || "(Sin título)", l = corto(ev.location, 150), n = corto(ev.description, 400);
  if (ini.isDate) {
    const f = fechaIcal(ini), ultimo = fin ? menosUnDia(fechaIcal(fin)) : f;
    return { t, f, h: null, hf: null, ff: ultimo > f ? ultimo : null, l, n };
  }
  const a = local(ini.toJSDate()), b = fin ? local(fin.toJSDate()) : null;
  return { t, f: a.f, h: a.h, hf: b && b.f === a.f && b.h !== a.h ? b.h : null, ff: b && b.f > a.f ? b.f : null, l, n };
}

async function importar(fu, i) {
  const url = String(fu.url || "").replace(/^webcal:/i, "https:");
  const r = await fetch(url, { headers: { "User-Agent": "calendario-casa" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const ics = await r.text();
  const ahora = Date.now();
  const exp = new IcalExpander({ ics, maxIterations: 5000, skipInvalidDates: true });
  const { events, occurrences } = exp.between(new Date(ahora - ATRAS * DIA), new Date(ahora + ADELANTE * DIA));
  const citas = [
    ...events.filter(e => e.component.getFirstPropertyValue("status") !== "CANCELLED").map(e => convertir(e, e.startDate, e.endDate)),
    ...occurrences.filter(o => o.item.component.getFirstPropertyValue("status") !== "CANCELLED").map(o => convertir(o.item, o.startDate, o.endDate))
  ].sort((a, b) => (a.f + (a.h || "")).localeCompare(b.f + (b.h || ""))).slice(0, MAX_CITAS);

  const soloYo = fu.verPara === "propio";
  const datos = {
    nombre: corto(fu.nombre, 40) || "Externo",
    persona: String(fu.persona || "").toLowerCase(),
    publico: !soloYo,
    soloPara: soloYo ? String(fu.persona || "").toLowerCase() : null,
    eventos: citas
  };
  const hash = createHash("sha256").update(JSON.stringify(datos)).digest("hex");
  const ref = db.collection("externos").doc(String(fu.id || `externo-${i + 1}`));
  const ant = (await ref.get()).data();
  if (ant?.hash === hash) { await ref.update({ comprobado: FieldValue.serverTimestamp() }); return `sin cambios (${citas.length} citas)`; }
  await ref.set({ ...datos, hash, actualizado: FieldValue.serverTimestamp(), comprobado: FieldValue.serverTimestamp() });
  return `actualizado (${citas.length} citas)`;
}

let errores = 0;
for (const [i, fu] of fuentes.entries()) {
  try { console.log(`Calendario ${i + 1}: ${await importar(fu, i)}`); }
  catch (e) { errores++; console.log(`Calendario ${i + 1}: error (${e.message.slice(0, 60)})`); }
}
if (errores) process.exitCode = 1;
