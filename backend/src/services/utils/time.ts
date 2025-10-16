import dayjs from 'dayjs';

export const nowIso = () => dayjs().toISOString();
export const addHoursIso = (hours: number) => dayjs().add(hours, 'hour').toISOString();