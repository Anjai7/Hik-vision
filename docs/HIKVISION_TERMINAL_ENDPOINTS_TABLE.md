# Hikvision Terminal ISAPI Endpoints Reference Table

This document maps all HTTP/ISAPI endpoints exposed by the **Hikvision DS-K1T320MFWX** Access Control & Facial Recognition Terminal (Firmware: `V3.5.2 build 240701`) for custom application development.

- **Device IP**: `192.168.18.229` (HTTP Port: `80`, HTTPS Port: `443`, RTSP Port: `554`)
- **Authentication**: HTTP Digest Authentication (`RFC 2617` / `RFC 7616`)
- **Supported Formats**: JSON (`?format=json`), XML, Multipart/Chunked Stream

---

## 1. Complete Endpoints Master Table

| Category | HTTP Method | Endpoint Path | Content Format | Purpose / Feature in Custom App | Request Payload / Params |
| :--- | :---: | :--- | :---: | :--- | :--- |
| **System** | `GET` | `/ISAPI/System/deviceInfo` | JSON / XML | Query device model, serial number, firmware, MAC, electroLock count. | Query: `?format=json` |
| **System** | `GET` | `/ISAPI/System/capabilities` | XML | Discover supported system features (NTP, Wi-Fi, SSH, HTTPS, Events). | None |
| **System** | `GET` | `/ISAPI/System/status` | XML / JSON | Check terminal CPU, memory, uptime, and system operational health. | None |
| **System** | `GET` / `PUT` | `/ISAPI/System/time` | JSON / XML | Read or synchronize terminal clock, date, and timezone. | Payload: `{"timeMode":"manual","localTime":"2026-09-22T17:30:00","timeZone":"CST-8:00:00"}` |
| **System** | `GET` | `/ISAPI/System/time/ntpServers` | XML | Inspect or configure NTP time server synchronization. | None |
| **System** | `PUT` | `/ISAPI/System/reboot` | XML / JSON | Soft reboot terminal remotely from the custom application. | `<reboot><cmd>reboot</cmd></reboot>` |
| **Network** | `GET` / `PUT` | `/ISAPI/System/Network/interfaces` | XML / JSON | Read/update physical Ethernet IP, subnet mask, gateway, DNS. | JSON/XML interface schema |
| **Network** | `GET` / `PUT` | `/ISAPI/System/Network/wifi` | XML / JSON | Read/configure Wi-Fi connection, SSID, authentication, IP mode. | JSON/XML Wi-Fi schema |
| **Network** | `GET` | `/ISAPI/System/Network/wifi/wifiNetworks` | XML / JSON | Scan and list available Wi-Fi access points in range. | None |
| **Access Control** | `GET` | `/ISAPI/AccessControl/capabilities` | XML | Discover ACS hardware capabilities (doors, cards, biometrics, rules). | None |
| **Access Control** | `GET` | `/ISAPI/AccessControl/AcsWorkStatus?format=json` | JSON | **Live hardware status**: door lock state, door state, tamper sensor, Wi-Fi. | Query: `?format=json` |
| **Access Control** | `GET` | `/ISAPI/AccessControl/Door/capabilities` | XML / JSON | Door latch configuration limits and supported door modes. | None |
| **Access Control** | `PUT` | `/ISAPI/AccessControl/RemoteControl/door/1` | XML / JSON | **Remote Door Control**: trigger unlock, close, hold open, or lock. | Payload: `<RemoteControlDoor><cmd>open</cmd></RemoteControlDoor>` *(open / close / alwaysOpen / alwaysClose)* |
| **Person / User** | `GET` | `/ISAPI/AccessControl/UserInfo/capabilities` | XML / JSON | Supported employee fields, max users (up to 1,500/3,000), ID length limits. | Query: `?format=json` |
| **Person / User** | `GET` | `/ISAPI/AccessControl/UserInfo/Count?format=json` | JSON | **User capacity summary**: registered count, face count, card count, fp count. | Query: `?format=json` |
| **Person / User** | `POST` | `/ISAPI/AccessControl/UserInfo/Search?format=json` | JSON | **Query/List employees**: paginate users, search by `employeeNo` or department. | Payload: `{"UserInfoSearchCond":{"searchID":"1","searchResultPosition":0,"maxResults":30}}` |
| **Person / User** | `POST` | `/ISAPI/AccessControl/UserInfo/Record?format=json` | JSON | **Create employee**: register name, ID, userType, valid dates, door rights. | Payload: `{"UserInfo":{"employeeNo":"101","name":"John Doe","userType":"normal","Valid":{...}}}` |
| **Person / User** | `PUT` | `/ISAPI/AccessControl/UserInfo/SetUp?format=json` | JSON | **Upsert employee**: create if new, or overwrite existing user. | Payload: `{"UserInfo":{"employeeNo":"101",...}}` |
| **Person / User** | `PUT` | `/ISAPI/AccessControl/UserInfo/Modify?format=json` | JSON | **Update employee**: edit name, validity window, or activate/deactivate user. | Payload: `{"UserInfo":{"employeeNo":"101","Valid":{"enable":false,...}}}` |
| **Person / User** | `PUT` | `/ISAPI/AccessControl/UserInfo/Delete?format=json` | JSON | **Delete employee**: remove user and all associated biometrics from device. | Payload: `{"UserInfoDelCond":{"EmployeeNoList":[{"employeeNo":"101"}]}}` |
| **Card** | `GET` | `/ISAPI/AccessControl/CardInfo/capabilities` | XML / JSON | Card schema, maximum cards per person, supported card numbering formats. | None |
| **Card** | `GET` | `/ISAPI/AccessControl/CardInfo/Count?format=json` | JSON | Total number of RFID/Mifare cards assigned in terminal memory. | Query: `?format=json` |
| **Card** | `POST` | `/ISAPI/AccessControl/CardInfo/Search?format=json` | JSON | Search card records by `cardNumber` or `employeeNo`. | Payload: `{"CardInfoSearchCond":{"searchID":"1","searchResultPosition":0,"maxResults":30}}` |
| **Card** | `POST` / `PUT` | `/ISAPI/AccessControl/CardInfo/Record?format=json` | JSON | Assign physical RFID/NFC card to an employee. | Payload: `{"CardInfo":{"cardNumber":"0012345678","employeeNo":"101","cardType":"normalCard"}}` |
| **Card** | `PUT` | `/ISAPI/AccessControl/CardInfo/Delete?format=json` | JSON | Unbind or delete a card from the device. | Payload: `{"CardInfoDelCond":{"CardNoList":[{"cardNumber":"0012345678"}]}}` |
| **Card** | `POST` | `/ISAPI/AccessControl/CaptureCardInfo` | XML / JSON | **Interactive enrollment**: terminal beeps and reads card presented at sensor. | Payload: `<CaptureCardInfoCond><captureCardMode>normal</captureCardMode></CaptureCardInfoCond>` |
| **Face Biometrics** | `GET` | `/ISAPI/Intelligent/FDLib?format=json` | JSON | List face library databases (`FDID 1`: visible `blackFD`, `FDID 2`: `infraredFD`). | Query: `?format=json` |
| **Face Biometrics** | `POST` | `/ISAPI/Intelligent/FDLib/FDSearch?format=json` | JSON | Query enrolled face records, quality metrics, and image links by employee. | Payload: `{"FDSearchCond":{"searchID":"1","searchResultPosition":0,"maxResults":10,"faceLibType":"blackFD","FDID":"1"}}` |
| **Face Biometrics** | `PUT` / `POST` | `/ISAPI/Intelligent/FDLib/FDSetUp?format=json` | Multipart / JSON | Upload face photo from custom app and bind to `employeeNo`. | Multipart form data with JSON metadata + JPEG image buffer |
| **Face Biometrics** | `POST` | `/ISAPI/AccessControl/CaptureFaceData` | XML / JSON | **On-device capture**: prompt user in front of camera to take reference photo. | Payload: `<CaptureFaceDataCond><captureFaceMode>quick</captureFaceMode></CaptureFaceDataCond>` |
| **Fingerprint** | `GET` | `/ISAPI/AccessControl/CaptureFingerPrint/capabilities` | XML | Fingerprint scanner capture capabilities (min/max quality, slots 1-10). | None |
| **Fingerprint** | `POST` | `/ISAPI/AccessControl/CaptureFingerPrint` | XML | **Hardware Optical Sensor Capture**: triggers scanner to wait up to 15-25s for finger touch and returns template `fingerData`. | Payload: `<CaptureFingerPrintCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema"><fingerNo>1</fingerNo></CaptureFingerPrintCond>` |
| **Fingerprint** | `POST` | `/ISAPI/AccessControl/FingerPrint/SetUp?format=json` | JSON | **Enroll Fingerprint Template**: saves captured `fingerData` to user's profile on terminal hardware. | Payload: `{"FingerPrintCfg":{"employeeNo":"201","enableCardReader":[1],"fingerPrintID":1,"fingerType":"normalFP","fingerData":"..."}}` |
| **Fingerprint** | `POST` | `/ISAPI/AccessControl/FingerPrintUpload?format=json` | JSON | **Query Enrolled Fingerprints**: downloads list of enrolled fingerprint templates and IDs for an employee. | Payload: `{"FingerPrintCond":{"searchID":"1","employeeNo":"1"}}` |
| **Fingerprint** | `GET` | `/ISAPI/AccessControl/FingerPrint/Count?format=json` | JSON | Total enrolled fingerprints count across terminal memory. | Query: `?format=json` |
| **Fingerprint** | `GET` | `/ISAPI/AccessControl/FingerPrintCfg/capabilities?format=json` | JSON | Fingerprint configuration schema (slots 1-10, normalFP/hijackFP, cardReader 1). | Query: `?format=json` |
| **Event / Logs** | `GET` | `/ISAPI/AccessControl/AcsEvent/capabilities` | JSON | Query event criteria range (`searchID`, `searchResultPosition`, `maxResults`). | Query: `?format=json` |
| **Event / Logs** | `POST` | `/ISAPI/AccessControl/AcsEvent?format=json` | JSON | **Historical Access/Attendance Logs**: query past swipes, authentication, alarms. | Payload: `{"AcsEventCond":{"searchID":"1","searchResultPosition":0,"maxResults":30,"major":0,"minor":0}}` |
| **Real-Time Push** | `GET` / `PUT` | `/ISAPI/Event/notification/httpHosts` | XML | **Webhook configuration**: configure device to push swipe events directly to your server. | Payload: `<HttpHostNotificationList>...<hostName>192.168.18.50</hostName><portNo>4000</portNo><url>/api/events/webhook</url></HttpHostNotificationList>` |
| **Real-Time Stream** | `GET` | `/ISAPI/Event/notification/alertStream` | Multipart HTTP Stream | **Continuous Alert Stream**: long-lived HTTP connection receiving instant swipe events. | Persistent HTTP GET with Digest Auth |
| **Video Stream** | `GET` | `/ISAPI/Streaming/channels` | XML | List video channels and RTSP streaming parameters. | None |
| **Video Stream** | RTSP Protocol | `rtsp://<user>:<pass>@192.168.18.229:554/Streaming/Channels/101` | RTSP / H.264 | Live camera video feed (Main Stream: `101`, Sub Stream: `102`). | Video player connection |
| **Security / Admin** | `GET` | `/ISAPI/Security/users` | XML | List admin and operator accounts configured on the terminal. | None |
| **Security / Admin** | `GET` | `/ISAPI/Security/capabilities` | XML | Password policies, RSA key length, lockout settings. | None |

---

## 2. Core Detailed Endpoint Specifications

### 2.1 Remote Door Control (`PUT /ISAPI/AccessControl/RemoteControl/door/1`)
Use this endpoint to unlock the door directly from your custom web application:

```http
PUT /ISAPI/AccessControl/RemoteControl/door/1 HTTP/1.1
Host: 192.168.18.229
Authorization: Digest ...
Content-Type: application/xml

<RemoteControlDoor version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
    <cmd>open</cmd>
</RemoteControlDoor>
```
*Supported `<cmd>` values:*
- `open` – Unlocks the electro-lock for the configured pulse duration (e.g. 5 seconds)
- `close` – Forces the door lock immediately
- `alwaysOpen` – Puts door into unlocked passage mode
- `alwaysClose` – Locks down the door (emergency lockout)

---

### 2.2 Live Terminal Hardware & Sensor Status (`GET /ISAPI/AccessControl/AcsWorkStatus?format=json`)
Provides live telemetry from the device:

```json
{
  "AcsWorkStatus": {
    "doorLockStatus": [0],
    "doorStatus": [4],
    "magneticStatus": [0],
    "hostAntiDismantleStatus": "open",
    "cardReaderOnlineStatus": [1],
    "cardReaderVerifyMode": [10],
    "wifiStatus": "connect"
  }
}
```
- `doorLockStatus`: `0` = Locked, `1` = Unlocked
- `doorStatus`: `1` = Dormant, `2` = Always Open, `3` = Always Closed, `4` = Normal Closed
- `cardReaderVerifyMode`: `10` = Face or Card or Password or Fingerprint

---

### 2.3 User / Employee Search (`POST /ISAPI/AccessControl/UserInfo/Search?format=json`)

```http
POST /ISAPI/AccessControl/UserInfo/Search?format=json HTTP/1.1
Host: 192.168.18.229
Content-Type: application/json

{
  "UserInfoSearchCond": {
    "searchID": "1",
    "searchResultPosition": 0,
    "maxResults": 30
  }
}
```

**Response Format:**
```json
{
  "UserInfoSearch": {
    "searchID": "1",
    "totalMatches": 24,
    "numOfMatches": 24,
    "UserInfo": [
      {
        "employeeNo": "1001",
        "name": "Sarah Connor",
        "userType": "normal",
        "closeDelayEnabled": false,
        "Valid": {
          "enable": true,
          "beginTime": "2024-01-01T00:00:00",
          "endTime": "2035-12-31T23:59:59",
          "timeType": "local"
        },
        "doorRight": "1"
      }
    ]
  }
}
```

---

### 2.4 User Registration / Update (`PUT /ISAPI/AccessControl/UserInfo/SetUp?format=json`)

```http
PUT /ISAPI/AccessControl/UserInfo/SetUp?format=json HTTP/1.1
Host: 192.168.18.229
Content-Type: application/json

{
  "UserInfo": {
    "employeeNo": "1002",
    "name": "Alex Miller",
    "userType": "normal",
    "Valid": {
      "enable": true,
      "beginTime": "2026-01-01T00:00:00",
      "endTime": "2030-12-31T23:59:59",
      "timeType": "local"
    },
    "doorRight": "1",
    "RightPlan": [
      {
        "doorNo": 1,
        "planTemplateNo": "1"
      }
    ]
  }
}
```

---

### 2.5 Access & Attendance Events Query (`POST /ISAPI/AccessControl/AcsEvent?format=json`)

```http
POST /ISAPI/AccessControl/AcsEvent?format=json HTTP/1.1
Host: 192.168.18.229
Content-Type: application/json

{
  "AcsEventCond": {
    "searchID": "1",
    "searchResultPosition": 0,
    "maxResults": 30,
    "major": 0,
    "minor": 0,
    "startTime": "2026-09-01T00:00:00",
    "endTime": "2026-09-22T23:59:59"
  }
}
```

**Key Event Major/Minor Codes:**
- `major: 5`, `minor: 38` – Authentication Passed / Access Granted
- `major: 5`, `minor: 39` – Authentication Failed / Access Denied
- `major: 5`, `minor: 75` – Door Remotely Opened via Software/ISAPI
- `major: 5`, `minor: 1` – Door Magnetic Sensor Open
- `major: 5`, `minor: 2` – Door Magnetic Sensor Closed

---

### 2.6 Real-Time Webhook Configuration (`PUT /ISAPI/Event/notification/httpHosts`)
Configure the terminal to send an HTTP POST to your custom app backend whenever an event triggers:

```xml
<HttpHostNotificationList version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
    <HttpHostNotification>
        <id>1</id>
        <url>/api/terminal/webhook</url>
        <protocolType>HTTP</protocolType>
        <parameterFormatType>json</parameterFormatType>
        <addressingFormatType>ipaddress</addressingFormatType>
        <ipAddress>192.168.18.50</ipAddress>
        <portNo>4000</portNo>
        <httpAuthenticationMode>none</httpAuthenticationMode>
    </HttpHostNotification>
</HttpHostNotificationList>
```
*(The device supports up to 2 simultaneous HTTP webhook destination hosts).*

---

### 2.7 Live Camera RTSP Video Stream
Use in custom web applications via Media Source Extensions (MSE), WebRTC, or HLS gateway:
- **Main Stream (HD)**: `rtsp://admin:gy@48641@192.168.18.229:554/Streaming/Channels/101`
- **Sub Stream (Fluent)**: `rtsp://admin:gy@48641@192.168.18.229:554/Streaming/Channels/102`

---

## 3. Web UI Route to ISAPI Backend Mapping

| Web UI Section (Browser Route) | Frontend Functionality | Underlying ISAPI Endpoints Used |
| :--- | :--- | :--- |
| `#/dashboard` (Overview) | Live door status, capacity tiles, event ticker | `/ISAPI/AccessControl/AcsWorkStatus?format=json`<br>`/ISAPI/AccessControl/UserInfo/Count?format=json`<br>`/ISAPI/AccessControl/AcsEvent?format=json` |
| `#/peopleManage` (Person Management) | User CRUD, Department hierarchy, Credential assignment | `/ISAPI/AccessControl/UserInfo/Search?format=json`<br>`/ISAPI/AccessControl/UserInfo/SetUp?format=json`<br>`/ISAPI/AccessControl/UserInfo/Delete?format=json`<br>`/ISAPI/Intelligent/FDLib/FDSetUp?format=json`<br>`/ISAPI/AccessControl/CardInfo/Record?format=json` |
| `#/eventSearch` (Event Search) | Access logs, alarms, filtering by date and event code | `/ISAPI/AccessControl/AcsEvent?format=json`<br>`/ISAPI/AccessControl/AcsEvent/capabilities` |
| `#/attendanceReport/*` (Reports) | Summary reports, abnormal punches, attendance records | Built on top of `/ISAPI/AccessControl/AcsEvent` filtered by date ranges and employee groups |
| `#/attendanceManage/*` (Time & Attendance) | Shift schedules, holiday plans, punch rules | `/ISAPI/AccessControl/ScheduleTemplate`<br>`/ISAPI/AccessControl/HolidayGroup` |
| `#/config/accessControl` | Lock hold time, anti-passback, verification mode | `/ISAPI/AccessControl/AcsCfg`<br>`/ISAPI/AccessControl/DoorCfg` |
| `#/operations/maintain/*` | Remote reboot, firmware upgrade, configuration export | `/ISAPI/System/reboot`<br>`/ISAPI/System/updateFirmware`<br>`/ISAPI/System/configurationData` |
