import { prisma } from '../db';
import { deviceService } from './DeviceService';
import { getNeutralEventDescription } from '../hikvision/eventMappings';

export class DashboardService {
  public async getSummary() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const device = await deviceService.getOrCreateDefaultDevice();

    const [
      totalUsers,
      fingerprintUsers,
      faceUsers,
      cardUsers,
      totalEvents,
      todayEvents,
      failedAttemptsCount,
      recentEventsList,
    ] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.user.count({ where: { numOfFP: { gt: 0 } } }).catch(() => 0),
      prisma.user.count({ where: { numOfFace: { gt: 0 } } }).catch(() => 0),
      prisma.user.count({ where: { numOfCard: { gt: 0 } } }).catch(() => 0),
      prisma.attendanceEvent.count().catch(() => 0),
      prisma.attendanceEvent.count({ where: { eventTime: { gte: startOfToday } } }).catch(() => 0),
      prisma.attendanceEvent.count({
        where: {
          eventTime: { gte: startOfToday },
          minor: { in: [39, 76, 78, 33, 34, 37] },
        },
      }).catch(() => 0),
      prisma.attendanceEvent
        .findMany({
          take: 7,
          orderBy: { eventTime: 'desc' },
          include: {
            device: {
              select: { name: true, model: true },
            },
          },
        })
        .catch(() => []),
    ]);

    // Unique employees present today
    const todayPunches = await prisma.attendanceEvent.findMany({
      where: {
        eventTime: { gte: startOfToday },
        minor: { notIn: [1, 2, 21, 22] },
        employeeNo: { not: null },
      },
      select: { employeeNo: true },
    }).catch(() => []);

    const uniqueEmployeesPresentToday = new Set(todayPunches.map((p) => p.employeeNo)).size;

    const formattedRecentEvents = recentEventsList.map((ev) => {
      const descInfo = getNeutralEventDescription(ev.major, ev.minor, ev.verificationMode || undefined);
      let rawObj: any = null;
      if (typeof ev.rawEvent === 'string') {
        try { rawObj = JSON.parse(ev.rawEvent); } catch {}
      } else if (typeof ev.rawEvent === 'object') {
        rawObj = ev.rawEvent;
      }

      let deviceTimeFormatted = new Date(ev.eventTime).toTimeString().split(' ')[0];
      if (rawObj && typeof rawObj.time === 'string') {
        const parts = rawObj.time.split('T');
        if (parts.length === 2) {
          const match = /^(\d{2}:\d{2}:\d{2})/.exec(parts[1]);
          if (match) {
            deviceTimeFormatted = match[1];
          }
        }
      }

      return {
        id: ev.id,
        employeeNo: ev.employeeNo || 'N/A',
        employeeName: ev.employeeName || 'Unknown',
        eventTime: ev.eventTime.toISOString(),
        timeFormatted: deviceTimeFormatted,
        eventDescription: descInfo.description,
        verificationModeLabel: descInfo.verifyModeLabel,
        doorNo: ev.doorNo,
      };
    });

    return {
      device: {
        id: device.id,
        name: device.name,
        model: device.model || 'DS-K1T320MFWX',
        firmware: device.firmware || 'V3.5.2',
        serialNo: device.serialNo ? `${device.serialNo.substring(0, 4)}****${device.serialNo.slice(-3)}` : 'Unknown',
        host: device.host,
        lastSeenAt: device.lastSeenAt,
        lastSyncAt: device.lastSyncAt,
      },
      stats: {
        totalUsers,
        fingerprintUsers,
        faceUsers,
        cardUsers,
        totalEvents,
        todayEvents,
        presentToday: uniqueEmployeesPresentToday,
        failedAttemptsToday: failedAttemptsCount,
      },
      recentEvents: formattedRecentEvents,
      serverTime: new Date().toISOString(),
    };
  }
}

export const dashboardService = new DashboardService();
