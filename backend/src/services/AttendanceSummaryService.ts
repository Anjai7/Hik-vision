import { prisma } from '../db';
import { getNeutralEventDescription } from '../hikvision/eventMappings';

export interface DailyAttendanceRecord {
  date: string;
  employeeNo: string;
  employeeName: string;
  firstInTime: string;
  firstInFormatted: string;
  lastOutTime: string;
  lastOutFormatted: string;
  durationMinutes: number;
  durationFormatted: string;
  punchesCount: number;
  status: 'IN_OFFICE' | 'COMPLETED' | 'SINGLE_PUNCH';
  statusLabel: string;
  verificationMode: string;
  punches: Array<{
    time: string;
    formattedTime: string;
    mode: string;
  }>;
}

export class AttendanceSummaryService {
  /**
   * Retrieves aggregated daily timesheet records
   */
  public async getDailySummary(options: {
    from?: string;
    to?: string;
    employeeNo?: string;
    search?: string;
  } = {}): Promise<{
    summary: DailyAttendanceRecord[];
    stats: {
      totalEmployeesPresent: number;
      currentlyInOffice: number;
      completedShifts: number;
      avgDurationMinutes: number;
    };
  }> {
    const where: any = {
      // Exclude system door events
      minor: { notIn: [1, 2, 21, 22] },
    };

    if (options.from || options.to) {
      where.eventTime = {};
      if (options.from) where.eventTime.gte = new Date(options.from);
      if (options.to) {
        const toDate = new Date(options.to);
        toDate.setHours(23, 59, 59, 999);
        where.eventTime.lte = toDate;
      }
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      where.eventTime = { gte: thirtyDaysAgo };
    }

    if (options.employeeNo) {
      where.employeeNo = options.employeeNo;
    }

    if (options.search) {
      where.OR = [
        { employeeName: { contains: options.search, mode: 'insensitive' } },
        { employeeNo: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const events = await prisma.attendanceEvent.findMany({
      where,
      orderBy: { eventTime: 'asc' },
    });

    // Fetch user map for real-time name matching
    const userMap = new Map<string, string>();
    try {
      const users = (await prisma.user.findMany({
        select: { employeeNo: true, name: true },
      })) || [];
      if (Array.isArray(users)) {
        for (const u of users) {
          userMap.set(u.employeeNo, u.name);
        }
      }
    } catch {
      // ignore if user table empty or query fails
    }

    // Group events by: `YYYY-MM-DD_employeeNo`
    const grouped = new Map<string, typeof events>();

    for (const ev of events) {
      if (!ev.employeeNo) continue;
      const dateStr = new Date(ev.eventTime).toISOString().split('T')[0];
      const key = `${dateStr}_${ev.employeeNo}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(ev);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const summaryList: DailyAttendanceRecord[] = [];
    let currentlyInOfficeCount = 0;
    let completedCount = 0;
    let totalDurationSum = 0;

    for (const [key, evList] of grouped.entries()) {
      const [dateStr, empNo] = key.split('_');
      const firstEv = evList[0];
      const lastEv = evList[evList.length - 1];

      const firstTime = new Date(firstEv.eventTime);
      const lastTime = new Date(lastEv.eventTime);

      const durationMs = lastTime.getTime() - firstTime.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      totalDurationSum += durationMinutes;

      const isToday = dateStr === todayStr;
      let status: 'IN_OFFICE' | 'COMPLETED' | 'SINGLE_PUNCH' = 'COMPLETED';
      let statusLabel = 'Completed';

      if (evList.length === 1) {
        if (isToday) {
          status = 'IN_OFFICE';
          statusLabel = 'In Office (Started)';
          currentlyInOfficeCount++;
        } else {
          status = 'SINGLE_PUNCH';
          statusLabel = 'Single Punch';
        }
      } else {
        // Multiple punches
        if (isToday) {
          // If last punch within 4 hours, still consider on premises
          const hoursSinceLastPunch = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastPunch < 4) {
            status = 'IN_OFFICE';
            statusLabel = 'In Office';
            currentlyInOfficeCount++;
          } else {
            status = 'COMPLETED';
            statusLabel = 'Checked Out';
            completedCount++;
          }
        } else {
          status = 'COMPLETED';
          statusLabel = 'Completed';
          completedCount++;
        }
      }

      // Format duration
      let durationFormatted = '-';
      if (durationMinutes > 0) {
        const hrs = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        durationFormatted = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      } else if (status === 'IN_OFFICE') {
        durationFormatted = 'In Progress';
      }

      const descInfo = getNeutralEventDescription(firstEv.major, firstEv.minor, firstEv.verificationMode || undefined);
      const resolvedName = userMap.get(empNo) || firstEv.employeeName || `Employee ${empNo}`;

      summaryList.push({
        date: dateStr,
        employeeNo: empNo,
        employeeName: resolvedName,
        firstInTime: firstTime.toISOString(),
        firstInFormatted: firstTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        lastOutTime: lastTime.toISOString(),
        lastOutFormatted: evList.length > 1 ? lastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-',
        durationMinutes,
        durationFormatted,
        punchesCount: evList.length,
        status,
        statusLabel,
        verificationMode: descInfo.verifyModeLabel,
        punches: evList.map((p) => ({
          time: new Date(p.eventTime).toISOString(),
          formattedTime: new Date(p.eventTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: p.verificationMode || 'Face',
        })),
      });
    }

    // Sort newest date first, then employee number
    summaryList.sort((a, b) => b.date.localeCompare(a.date) || a.employeeNo.localeCompare(b.employeeNo));

    const totalEmployeesPresent = new Set(summaryList.filter((s) => s.date === todayStr).map((s) => s.employeeNo)).size;
    const avgDurationMinutes = summaryList.length > 0 ? Math.round(totalDurationSum / summaryList.length) : 0;

    return {
      summary: summaryList,
      stats: {
        totalEmployeesPresent,
        currentlyInOffice: currentlyInOfficeCount,
        completedShifts: completedCount,
        avgDurationMinutes,
      },
    };
  }

  /**
   * Generates CSV content for download
   */
  public generateCsv(records: DailyAttendanceRecord[]): string {
    const headers = ['Date', 'Employee ID', 'Employee Name', 'First In (Check-In)', 'Last Out (Check-Out)', 'Duration', 'Punches Count', 'Status', 'Verification Mode'];
    const rows = records.map((r) => [
      `"${r.date}"`,
      `"${r.employeeNo}"`,
      `"${r.employeeName}"`,
      `"${r.firstInFormatted}"`,
      `"${r.lastOutFormatted}"`,
      `"${r.durationFormatted}"`,
      r.punchesCount,
      `"${r.statusLabel}"`,
      `"${r.verificationMode}"`,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  }
}

export const attendanceSummaryService = new AttendanceSummaryService();
