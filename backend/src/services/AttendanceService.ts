import { prisma } from '../db';
import { getNeutralEventDescription } from '../hikvision/eventMappings';

export interface GetAttendanceQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  employeeNo?: string;
  search?: string;
  verificationMode?: string;
  major?: number;
  minor?: number;
}

export class AttendanceService {
  public async getAttendance(params: GetAttendanceQuery) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.from || params.to) {
      where.eventTime = {};
      if (params.from) {
        where.eventTime.gte = new Date(params.from);
      }
      if (params.to) {
        where.eventTime.lte = new Date(params.to);
      }
    }

    if (params.employeeNo) {
      where.employeeNo = params.employeeNo;
    }

    if (params.search) {
      where.OR = [
        { employeeName: { contains: params.search, mode: 'insensitive' } },
        { employeeNo: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.verificationMode) {
      where.verificationMode = params.verificationMode;
    }

    if (params.major !== undefined) {
      where.major = params.major;
    }

    if (params.minor !== undefined) {
      where.minor = params.minor;
    } else {
      // Exclude background system/door sensor noise (unlocked/locked)
      where.minor = { notIn: [1, 2, 21, 22] };
    }

    const [total, events] = await Promise.all([
      prisma.attendanceEvent.count({ where }),
      prisma.attendanceEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { eventTime: 'desc' },
        include: {
          device: {
            select: {
              name: true,
              model: true,
            },
          },
        },
      }),
    ]);

    // Format events with neutral description mappings and native device time
    const formattedEvents = events.map((ev) => {
      const descInfo = getNeutralEventDescription(ev.major, ev.minor, ev.verificationMode || undefined);
      const eventDateObj = new Date(ev.eventTime);

      let rawObj: any = null;
      if (typeof ev.rawEvent === 'string') {
        try { rawObj = JSON.parse(ev.rawEvent); } catch {}
      } else if (typeof ev.rawEvent === 'object') {
        rawObj = ev.rawEvent;
      }

      let deviceTimeFormatted = eventDateObj.toTimeString().split(' ')[0];
      let deviceDateFormatted = eventDateObj.toISOString().split('T')[0];
      let timezoneOffset = '';

      if (rawObj && typeof rawObj.time === 'string') {
        const parts = rawObj.time.split('T');
        if (parts.length === 2) {
          deviceDateFormatted = parts[0];
          const timeMatch = /^(\d{2}:\d{2}:\d{2})([+-]\d{2}:\d{2})?/.exec(parts[1]);
          if (timeMatch) {
            deviceTimeFormatted = timeMatch[1];
            timezoneOffset = timeMatch[2] || '';
          }
        }
      }

      return {
        id: ev.id,
        deviceId: ev.deviceId,
        deviceName: ev.device?.name || 'Hikvision Terminal',
        deviceModel: ev.device?.model || 'DS-K1T320MFWX',
        employeeNo: ev.employeeNo || 'N/A',
        employeeName: ev.employeeName || 'Unknown',
        eventTime: ev.eventTime.toISOString(),
        dateFormatted: deviceDateFormatted,
        timeFormatted: deviceTimeFormatted,
        deviceTimeFormatted,
        deviceDateFormatted,
        timezoneOffset,
        localTimeFormatted: eventDateObj.toLocaleTimeString(),
        major: ev.major,
        minor: ev.minor,
        status: descInfo.status,
        statusLabel: descInfo.statusLabel,
        eventCategory: 'Access Control',
        eventDescription: descInfo.statusLabel,
        verificationMode: ev.verificationMode || 'unspecified',
        verificationModeLabel: descInfo.verifyModeLabel,
        doorNo: ev.doorNo,
        cardReaderNo: ev.cardReaderNo,
        serialNo: ev.serialNo,
        hasRawPayload: !!ev.rawEvent,
        createdAt: ev.createdAt,
      };
    });

    return {
      events: formattedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async getAttendanceById(id: string) {
    const event = await prisma.attendanceEvent.findUnique({
      where: { id },
      include: {
        device: {
          select: {
            name: true,
            model: true,
            serialNo: true,
          },
        },
      },
    });

    if (!event) return null;

    let parsedRaw = event.rawEvent;
    if (typeof parsedRaw === 'string') {
      try {
        parsedRaw = JSON.parse(parsedRaw);
      } catch {
        // keep string
      }
    }

    const descInfo = getNeutralEventDescription(event.major, event.minor, event.verificationMode || undefined);
    return {
      ...event,
      rawEvent: parsedRaw,
      eventDescription: descInfo.description,
      verifyModeLabel: descInfo.verifyModeLabel,
    };
  }
}

export const attendanceService = new AttendanceService();
