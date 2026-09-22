import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../db';
import { deviceService } from '../services/DeviceService';
import { isAuthenticationEvent } from '../hikvision/eventMappings';
import { logger } from '../utils/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

interface ParsedHikEvent {
  employeeNo?: string | null;
  employeeName?: string | null;
  eventTime: Date;
  major: number;
  minor: number;
  verificationMode?: string | null;
  doorNo?: number | null;
  cardReaderNo?: number | null;
  serialNo?: number | null;
  rawEvent: any;
}

/**
 * Normalizes different Hikvision payload structures into standard fields
 */
function extractEventData(body: any, files?: Express.Multer.File[]): ParsedHikEvent[] {
  const events: ParsedHikEvent[] = [];
  let candidateObjects: any[] = [];

  // Check if body itself has JSON or nested stringified JSON
  if (body) {
    if (typeof body === 'string') {
      try {
        candidateObjects.push(JSON.parse(body));
      } catch {
        // Not a JSON string
      }
    } else if (typeof body === 'object') {
      candidateObjects.push(body);

      // Sometimes Hikvision sends { event_log: '{"AccessControllerEvent": ...}' }
      if (body.event_log && typeof body.event_log === 'string') {
        try {
          candidateObjects.push(JSON.parse(body.event_log));
        } catch {
          // ignore
        }
      }
    }
  }

  // Check if any multipart field contained JSON string
  if (files && files.length > 0) {
    for (const file of files) {
      if (
        file.mimetype.includes('json') ||
        file.fieldname === 'event_log' ||
        file.fieldname === 'AccessControllerEvent'
      ) {
        try {
          const str = file.buffer.toString('utf-8');
          candidateObjects.push(JSON.parse(str));
        } catch {
          // not JSON
        }
      }
    }
  }

  for (const obj of candidateObjects) {
    // Check various common Hikvision event wrapper keys
    const eventLog = obj.AccessControllerEvent || obj.event_log || obj.event || obj;

    // Check if event list or single event
    const eventItems = Array.isArray(eventLog) ? eventLog : [eventLog];

    for (const item of eventItems) {
      if (!item || typeof item !== 'object') continue;

      const major = Number(item.major ?? item.majorEventType ?? 5);
      const minor = Number(item.minor ?? item.subEventType ?? 75);
      const serialNo = item.serialNo !== undefined ? Number(item.serialNo) : null;
      const employeeNo = item.employeeNoString || item.employeeNo || item.cardNo || null;
      const employeeName = item.name || item.employeeName || null;
      const doorNo = item.doorNo !== undefined ? Number(item.doorNo) : null;
      const cardReaderNo = item.cardReaderNo !== undefined ? Number(item.cardReaderNo) : null;

      // Normalize verification mode
      let verifyMode = item.currentVerifyMode || item.verifyMode || item.cardReaderKind || null;
      if (verifyMode === 'faceOrFpOrCardOrPw' || !verifyMode) {
        if (item.FaceRect || minor === 104 || minor === 75) {
          verifyMode = 'face';
        } else if (item.cardNo) {
          verifyMode = 'card';
        } else {
          verifyMode = 'face';
        }
      }

      // Robust timestamp extraction
      let eventTime = new Date();
      const rawTime = item.time || item.dateTime || obj.dateTime || (body && body.dateTime);
      if (rawTime) {
        const parsed = new Date(rawTime);
        if (!isNaN(parsed.getTime())) {
          eventTime = parsed;
        }
      }

      events.push({
        employeeNo: employeeNo ? String(employeeNo) : null,
        employeeName: employeeName ? String(employeeName) : null,
        eventTime,
        major,
        minor,
        verificationMode: verifyMode ? String(verifyMode) : null,
        doorNo,
        cardReaderNo,
        serialNo,
        rawEvent: item,
      });
    }
  }

  return events;
}

/**
 * Responds with standard Hikvision acknowledgment
 */
function sendHikvisionAck(req: Request, res: Response, processedCount: number) {
  const url = req.originalUrl || '/api/attendance/webhook';
  const isJson =
    req.headers.accept?.includes('application/json') ||
    req.headers['content-type']?.includes('application/json');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ResponseStatus version="1.0" xmlns="http://www.hikvision.com/networks/forms">
<requestURL>${url}</requestURL>
<statusCode>1</statusCode>
<statusString>OK</statusString>
<subStatusCode>ok</subStatusCode>
</ResponseStatus>`;

  if (isJson) {
    res.status(200).json({
      ResponseStatus: {
        requestURL: url,
        statusCode: 1,
        statusString: 'OK',
        subStatusCode: 'ok',
      },
      statusCode: 1,
      statusString: 'OK',
      processedCount,
    });
  } else {
    // Return XML acknowledgment which clears the terminal's alarm retry buffer
    res.status(200).type('application/xml').send(xml);
  }
}

/**
 * Webhook handler for Hikvision HTTP Listening (Event Alarm Push)
 */
const handleHikvisionWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawFiles = (req.files as Express.Multer.File[]) || [];
    logger.info(`Received Hikvision webhook notification from ${req.ip}`, {
      contentType: req.headers['content-type'],
      filesCount: rawFiles.length,
      hasBody: !!req.body,
    });

    const parsedEvents = extractEventData(req.body, rawFiles);

    if (parsedEvents.length === 0) {
      logger.warn('Received Hikvision push, but no valid event structures recognized in payload');
      sendHikvisionAck(req, res, 0);
      return;
    }

    const device = await deviceService.getOrCreateDefaultDevice();
    let savedCount = 0;

    for (const ev of parsedEvents) {
      // Only process authentication events (ignore door status, background sensor noise, etc.)
      if (!isAuthenticationEvent(ev.major, ev.minor)) {
        logger.debug(`Skipping non-authentication event [major: ${ev.major}, minor: ${ev.minor}]`);
        continue;
      }

      // 1. Strict Serial Number deduplication: If this serial number has already been recorded for this device, skip it!
      let existing = null;
      if (ev.serialNo !== null && ev.serialNo !== undefined && ev.serialNo > 0) {
        existing = await prisma.attendanceEvent.findFirst({
          where: {
            deviceId: device.id,
            serialNo: ev.serialNo,
          },
        });
      }

      // 2. Cooldown debounce: If the same employee already has an event within the last 60 seconds, skip rapid re-scans
      if (!existing && ev.employeeNo) {
        const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
        existing = await prisma.attendanceEvent.findFirst({
          where: {
            deviceId: device.id,
            employeeNo: ev.employeeNo,
            eventTime: { gte: sixtySecondsAgo },
          },
        });
      }

      // Auto-upsert user record if employeeNo is present
      if (ev.employeeNo) {
        try {
          await prisma.user.upsert({
            where: {
              deviceId_employeeNo: {
                deviceId: device.id,
                employeeNo: ev.employeeNo,
              },
            },
            update: {
              name: ev.employeeName || undefined,
              updatedAt: new Date(),
            },
            create: {
              deviceId: device.id,
              employeeNo: ev.employeeNo,
              name: ev.employeeName || `Employee ${ev.employeeNo}`,
              userType: 'normal',
            },
          });
        } catch (uErr: any) {
          logger.debug('Could not auto-upsert user from webhook event', { error: uErr.message });
        }
      }

      if (!existing) {
        await prisma.attendanceEvent.create({
          data: {
            deviceId: device.id,
            employeeNo: ev.employeeNo,
            employeeName: ev.employeeName,
            eventTime: ev.eventTime,
            major: ev.major,
            minor: ev.minor,
            verificationMode: ev.verificationMode,
            doorNo: ev.doorNo,
            cardReaderNo: ev.cardReaderNo,
            serialNo: ev.serialNo,
            rawEvent: typeof ev.rawEvent === 'string' ? ev.rawEvent : JSON.stringify(ev.rawEvent),
          },
        });
        savedCount++;
      } else {
        logger.info(`Skipped duplicate/retried event for employee ${ev.employeeNo}, serial ${ev.serialNo}`);
      }
    }

    // Update device last seen timestamp
    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    }).catch(() => {});

    logger.info(`Hikvision webhook processed: ${savedCount} new event(s). Responding with OK.`);
    sendHikvisionAck(req, res, savedCount);
  } catch (error: any) {
    logger.error('Error handling Hikvision webhook push', { error: error.message });
    // Still return standard OK so terminal doesn't crash or flood on retries
    sendHikvisionAck(req, res, 0);
  }
};

// Route handlers for HTTP Listening
router.post('/webhook', upload.any(), handleHikvisionWebhook);
router.post('/listen', upload.any(), handleHikvisionWebhook);
router.post('/', upload.any(), handleHikvisionWebhook);

export default router;
