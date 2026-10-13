// Importazione da Apple Salute. L'app Salute dell'iPhone non ha un'API web:
// i dati si possono leggere solo da un'app nativa iOS, oppure dal file di
// esportazione che l'app stessa produce (Salute → foto profilo → "Esporta
// tutti i dati sulla salute" → export.zip, con dentro export.xml). Qui si
// legge quel file e si tirano fuori peso e allenamenti.
import zlib from "node:zlib";

// ---- Lettura minima di uno zip: estrae il solo file export.xml ----
// (Node non ha un lettore zip integrato; il formato è semplice abbastanza da
// leggerlo a mano per il nostro unico caso d'uso.)
function estraiDaZip(buffer, nomeCercato) {
  const EOCD = 0x06054b50;
  let i = buffer.length - 22;
  while (i >= 0 && buffer.readUInt32LE(i) !== EOCD) i--;
  if (i < 0) throw new Error("Archivio zip non valido");
  const numeroVoci = buffer.readUInt16LE(i + 10);
  let offset = buffer.readUInt32LE(i + 16);
  for (let n = 0; n < numeroVoci; n++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Indice zip non valido");
    const metodo = buffer.readUInt16LE(offset + 10);
    const dimCompressa = buffer.readUInt32LE(offset + 20);
    const lunNome = buffer.readUInt16LE(offset + 28);
    const lunExtra = buffer.readUInt16LE(offset + 30);
    const lunCommento = buffer.readUInt16LE(offset + 32);
    const offsetLocale = buffer.readUInt32LE(offset + 42);
    const nome = buffer.toString("utf8", offset + 46, offset + 46 + lunNome);
    offset += 46 + lunNome + lunExtra + lunCommento;
    if (!nome.endsWith(nomeCercato)) continue;
    const lunNomeLocale = buffer.readUInt16LE(offsetLocale + 26);
    const lunExtraLocale = buffer.readUInt16LE(offsetLocale + 28);
    const inizioDati = offsetLocale + 30 + lunNomeLocale + lunExtraLocale;
    const dati = buffer.subarray(inizioDati, inizioDati + dimCompressa);
    if (metodo === 0) return dati;
    if (metodo === 8) return zlib.inflateRawSync(dati);
    throw new Error("Metodo di compressione zip non supportato");
  }
  throw new Error(`Nel file zip non c'è ${nomeCercato}`);
}

function attributi(tag) {
  const out = {};
  const re = /([A-Za-z]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(tag))) out[m[1]] = m[2];
  return out;
}

// "2026-10-13 07:12:00 +0200" → "2026-10-13"
function chiaveData(appleDate) {
  return (appleDate || "").slice(0, 10);
}

const NOMI_ATTIVITA = {
  HKWorkoutActivityTypeRunning: "Corsa",
  HKWorkoutActivityTypeWalking: "Camminata",
  HKWorkoutActivityTypeCycling: "Ciclismo",
  HKWorkoutActivityTypeHiking: "Escursione",
  HKWorkoutActivityTypeSwimming: "Nuoto",
  HKWorkoutActivityTypeYoga: "Yoga",
  HKWorkoutActivityTypeTraditionalStrengthTraining: "Pesi",
  HKWorkoutActivityTypeFunctionalStrengthTraining: "Allenamento funzionale",
  HKWorkoutActivityTypeHighIntensityIntervalTraining: "HIIT",
  HKWorkoutActivityTypeElliptical: "Ellittica",
  HKWorkoutActivityTypeRowing: "Canottaggio",
  HKWorkoutActivityTypeCoreTraining: "Core",
  HKWorkoutActivityTypeDance: "Danza",
  HKWorkoutActivityTypeSoccer: "Calcio",
  HKWorkoutActivityTypeTennis: "Tennis",
  HKWorkoutActivityTypeDownhillSkiing: "Sci",
  HKWorkoutActivityTypeMixedCardio: "Cardio misto",
  HKWorkoutActivityTypeOther: "Altro",
};

export function nomeAttivita(tipo) {
  if (!tipo) return "Allenamento";
  if (NOMI_ATTIVITA[tipo]) return NOMI_ATTIVITA[tipo];
  return tipo.replace(/^HKWorkoutActivityType/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

// Restituisce { peso: [{data, kg}], allenamenti: [{id, data, tipo, durataMinuti, distanzaKm, sport}] }
export function leggiEsportazione(buffer, nomeFile = "") {
  let xml;
  if (/\.zip$/i.test(nomeFile) || (buffer[0] === 0x50 && buffer[1] === 0x4b)) {
    xml = estraiDaZip(buffer, "export.xml").toString("utf8");
  } else {
    xml = buffer.toString("utf8");
  }
  if (!xml.includes("HealthData")) throw new Error("Non sembra un'esportazione di Apple Salute");

  // Peso: un valore al giorno (l'ultimo registrato quel giorno), in kg.
  const pesoPerGiorno = new Map();
  const rePeso = /<Record [^>]*type="HKQuantityTypeIdentifierBodyMass"[^>]*>/g;
  let m;
  while ((m = rePeso.exec(xml))) {
    const a = attributi(m[0]);
    let kg = Number(a.value);
    if (!Number.isFinite(kg)) continue;
    if (/lb/i.test(a.unit || "")) kg = kg * 0.45359237;
    kg = Math.round(kg * 10) / 10;
    const data = chiaveData(a.startDate);
    const precedente = pesoPerGiorno.get(data);
    if (!precedente || precedente.quando < a.startDate) pesoPerGiorno.set(data, { kg, quando: a.startDate });
  }
  const peso = [...pesoPerGiorno.entries()].map(([data, v]) => ({ data, kg: v.kg })).sort((x, y) => (x.data < y.data ? -1 : 1));

  // Allenamenti: il tag <Workout ...> ha tipo, durata e date; la distanza può
  // essere un attributo (esportazioni vecchie) o dentro <WorkoutStatistics>.
  const allenamenti = [];
  const reWorkout = /<Workout [^>]*(?:\/>|>[\s\S]*?<\/Workout>)/g;
  while ((m = reWorkout.exec(xml))) {
    const blocco = m[0];
    const tagApertura = /<Workout [^>]*>/.exec(blocco)[0];
    const a = attributi(tagApertura);
    let minuti = Number(a.duration);
    if (/sec/i.test(a.durationUnit || "")) minuti = minuti / 60;
    if (/hr|hour/i.test(a.durationUnit || "")) minuti = minuti * 60;
    let km = null;
    if (a.totalDistance) {
      km = Number(a.totalDistance);
      if (/mi/i.test(a.totalDistanceUnit || "")) km = km * 1.609344;
      if (/^m$/i.test(a.totalDistanceUnit || "")) km = km / 1000;
    } else {
      const stat = /<WorkoutStatistics [^>]*type="HKQuantityTypeIdentifierDistance[A-Za-z]*"[^>]*>/.exec(blocco);
      if (stat) {
        const s = attributi(stat[0]);
        km = Number(s.sum);
        if (/mi/i.test(s.unit || "")) km = km * 1.609344;
        if (/^m$/i.test(s.unit || "")) km = km / 1000;
      }
    }
    const inizio = a.startDate || "";
    allenamenti.push({
      id: `apple-${inizio.replace(/[^0-9]/g, "")}-${(a.workoutActivityType || "").slice(-12)}`,
      data: chiaveData(inizio),
      tipo: nomeAttivita(a.workoutActivityType),
      sport: a.workoutActivityType || null,
      durataMinuti: Number.isFinite(minuti) && minuti > 0 ? Math.round(minuti) : null,
      distanzaKm: Number.isFinite(km) && km > 0 ? Math.round(km * 10) / 10 : null,
      nota: "",
      fonte: "apple",
    });
  }

  return { peso, allenamenti };
}
