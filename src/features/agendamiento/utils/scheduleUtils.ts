/** Franjas de 30 min del calendario semanal (9:00 – 23:00). Debe coincidir con `horasDelDia` en AgendamientoPage. */
export const CALENDAR_SLOT_HOURS = Array.from({ length: 29 }, (_, i) => 9 + i * 0.5);

export const DIAS_SEMANA_DOMINGO_PRIMERO = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;

export interface HorarioLike {
  id?: number;
  barberoId?: number;
  dia?: string;
  horaInicio?: string;
  horaFin?: string;
  estado?: boolean | number | string | null;
  /** ISO date string — start of the weekly schedule this slot belongs to */
  fechaInicioSemana?: string;
  /** ISO date string — end of the weekly schedule this slot belongs to */
  fechaFinSemana?: string;
}

export interface CitaHorarioLike {
  id?: number;
  fecha?: string | null;
  barberoId?: number;
  hora?: string;
  duracion?: number;
  estado?: string;
}

export const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const normalizarFechaCita = (fecha: string | undefined | null): string =>
  String(fecha || '').trim().slice(0, 10);

/** Quita tildes y unifica nombres de día (API vs calendario). */
export const normalizeDiaNombre = (dia: string): string => {
  const key = String(dia || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();

  const map: Record<string, string> = {
    domingo: 'Domingo',
    lunes: 'Lunes',
    martes: 'Martes',
    miercoles: 'Miércoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
    sabado: 'Sábado',
  };

  return map[key] ?? String(dia || '').trim();
};

export const diaSemanaDesdeFecha = (fechaStr: string): string => {
  const dayIndex = new Date(`${fechaStr}T12:00:00`).getDay();
  return DIAS_SEMANA_DOMINGO_PRIMERO[dayIndex];
};

export const horarioEstaActivo = (h: HorarioLike): boolean => {
  const e = h.estado;
  if (e === false || e === 0 || e === 'false' || e === 'False') return false;
  return true;
};

export const parseHoraAMinutos = (hora: string): number => {
  const [h, m = '0'] = String(hora || '00:00').split(':');
  return parseInt(h || '0', 10) * 60 + parseInt(m || '0', 10);
};

/** Convierte franja decimal del calendario (ej. 9.5) a "09:30". */
export const slotGrillaAHoraStr = (slot: number): string => {
  const h = Math.floor(slot);
  const m = Math.round((slot % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const slotGrillaAMinutos = (slot: number): number =>
  Math.floor(slot) * 60 + Math.round((slot % 1) * 60);

export const getHorariosBarberoParaDia = (
  horariosList: HorarioLike[],
  barberoId: number,
  fechaStr: string
): HorarioLike[] => {
  const diaStr = diaSemanaDesdeFecha(fechaStr);
  const fecha = fechaStr.slice(0, 10);
  return horariosList.filter(
    (h) =>
      Number(h.barberoId) === Number(barberoId) &&
      horarioEstaActivo(h) &&
      normalizeDiaNombre(String(h.dia || '')) === diaStr &&
      // Only include if the weekly schedule covers the requested date
      // (fall through when dates are absent for backwards-compat)
      (!h.fechaInicioSemana || fecha >= h.fechaInicioSemana.slice(0, 10)) &&
      (!h.fechaFinSemana   || fecha <= h.fechaFinSemana.slice(0, 10))
  );
};

export const barberoTrabajaEnFecha = (
  horariosList: HorarioLike[],
  barberoId: number,
  fechaStr: string
): boolean => getHorariosBarberoParaDia(horariosList, barberoId, fechaStr).length > 0;

/** Barbería activa con horario ese día; si hay hora, debe caber en turno sin solapar citas. */
export const filtrarBarberosDisponibles = <T extends { id: number }>(
  barberosList: T[],
  horariosList: HorarioLike[],
  options: {
    fechaStr: string;
    hora?: string;
    duracionMinutos?: number;
    citas?: CitaHorarioLike[];
    ignoreCitaId?: number;
    minAnticipacionMinutos?: number;
    slotHours?: number[];
  }
): T[] => {
  const {
    fechaStr,
    hora,
    duracionMinutos = 60,
    citas = [],
    ignoreCitaId,
    minAnticipacionMinutos = 15,
    slotHours = CALENDAR_SLOT_HOURS,
  } = options;

  if (!fechaStr) return barberosList;

  return barberosList.filter((barbero) => {
    if (!barberoTrabajaEnFecha(horariosList, barbero.id, fechaStr)) return false;
    if (!hora) return true;

    const horasDisp = getHorasDisponiblesParaDia({
      fechaStr,
      barberoId: barbero.id,
      duracionMinutos,
      horariosList,
      citas,
      ignoreCitaId,
      minAnticipacionMinutos,
      slotHours,
    });
    return horasDisp.includes(hora);
  });
};

/**
 * Horas disponibles alineadas a las franjas del calendario (CALENDAR_SLOT_HOURS)
 * y al horario laboral del barbero.
 */
export const getHorasDisponiblesParaDia = (options: {
  fechaStr: string;
  barberoId: number;
  duracionMinutos: number;
  horariosList: HorarioLike[];
  citas: CitaHorarioLike[];
  ignoreCitaId?: number;
  minAnticipacionMinutos?: number;
  slotHours?: number[];
}): string[] => {
  const {
    fechaStr,
    barberoId,
    duracionMinutos,
    horariosList,
    citas,
    ignoreCitaId,
    minAnticipacionMinutos = 15,
    slotHours = CALENDAR_SLOT_HOURS,
  } = options;

  if (!fechaStr || !barberoId) return [];

  const horariosBarbero = getHorariosBarberoParaDia(horariosList, barberoId, fechaStr);
  if (horariosBarbero.length === 0) return [];

  const duracion = Math.max(15, Number(duracionMinutos) || 60);
  const today = new Date();
  const todayStr = toLocalDateString(today);
  const isToday = fechaStr === todayStr;
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  const slots: string[] = [];

  for (const slot of slotHours) {
    const slotMinutes = slotGrillaAMinutos(slot);

    const dentroHorario = horariosBarbero.some((h) => {
      const start = parseHoraAMinutos(h.horaInicio || '00:00');
      const end = parseHoraAMinutos(h.horaFin || '23:59');
      return slotMinutes >= start && slotMinutes + duracion <= end;
    });
    if (!dentroHorario) continue;

    if (isToday && slotMinutes <= nowMinutes + minAnticipacionMinutos) continue;

    const solapa = citas.some((cita) => {
      if (normalizarFechaCita(cita.fecha) !== fechaStr) return false;
      if (Number(cita.barberoId) !== Number(barberoId)) return false;
      if (ignoreCitaId && cita.id === ignoreCitaId) return false;
      if (String(cita.estado || '').toLowerCase() === 'cancelada') return false;

      const startExist = parseHoraAMinutos(cita.hora || '00:00');
      const endExist = startExist + Number(cita.duracion || 60);
      const endSlot = slotMinutes + duracion;
      return slotMinutes < endExist && startExist < endSlot;
    });
    if (solapa) continue;

    slots.push(slotGrillaAHoraStr(slot));
  }

  return slots;
};
