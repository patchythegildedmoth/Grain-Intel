import type { RawContract, Contract } from '../types/contracts';
import { parseFutureMonth } from '../utils/futureMonth';
import { isOpenStatus, isCompletedStatus } from './filterContracts';
import { differenceInCalendarDays } from 'date-fns';

export function transformContracts(rawContracts: RawContract[]): Contract[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rawContracts.map((raw) => {
    const parsed = parseFutureMonth(raw.futureMonth);
    const endDateValid = raw.endDate instanceof Date && !isNaN(raw.endDate.getTime());
    const daysUntil = endDateValid ? differenceInCalendarDays(raw.endDate, today) : Infinity;
    const isOpen = isOpenStatus(raw.contractStatus);

    return {
      ...raw,
      futureMonthDate: parsed?.date ?? null,
      futureMonthShort: parsed?.shortLabel ?? 'Cash / No Futures',
      futureMonthSortKey: parsed?.sortKey ?? 'zz-cash',
      isOpen,
      isCompleted: isCompletedStatus(raw.contractStatus),
      daysUntilDeliveryEnd: daysUntil,
      isOverdue: isOpen && endDateValid && daysUntil < 0,
      isUrgent: isOpen && endDateValid && daysUntil >= 0 && daysUntil <= 14,
    };
  });
}
