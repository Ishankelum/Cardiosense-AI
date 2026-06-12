# CardioSense AI Backend API Documentation

## Overview
Complete RESTful API for CardioSense AI medical platform with ECG analysis, patient management, doctor reviews, and AI chatbot.

**Base URL:** `http://localhost:5000/api`

## Authentication
Most endpoints require JWT authentication. Include token in header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure_password",
  "role": "patient|doctor",
  "specialization": "General Cardiology",
  "licenseNumber": "LIC123456"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "user-1234567890",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "patient"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Login User
**POST** `/auth/login`

**Body:**
```json
{
  "email": "john@example.com",
  "password": "secure_password",
  "role": "patient|doctor"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user-1234567890",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "patient",
    "createdAt": "2026-05-30T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## User Endpoints

### 3. Get User Profile
**GET** `/users/:id`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "user-1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "patient",
  "createdAt": "2026-05-30T10:00:00Z",
  "isActive": true
}
```

### 4. Get All Doctors
**GET** `/doctors`

**Response (200):**
```json
[
  {
    "id": "user-doctor-123",
    "name": "Dr. Sarah Smith",
    "email": "doctor@example.com",
    "role": "doctor",
    "specialization": "General Cardiology",
    "licenseNumber": "LIC123456",
    "createdAt": "2026-05-30T10:00:00Z"
  }
]
```

---

## Medical Reference Endpoints

### 5. Get All Medical References
**GET** `/medical-reference`

**Response (200):**
```json
{
  "conditions": [...],
  "measurements": [...]
}
```

### 6. Get Cardiac Conditions
**GET** `/medical-reference/conditions`

**Response (200):**
```json
[
  {
    "id": "atrial-fibrillation",
    "name": "Atrial Fibrillation",
    "code": "AFib",
    "description": "Irregular and rapid heart rate...",
    "symptoms": ["Palpitations", "Shortness of breath"],
    "riskLevel": "High",
    "treatment": ["Rate control medications"],
    "prevalence": "1-2% of the population"
  }
]
```

### 7. Get Specific Condition
**GET** `/medical-reference/conditions/:id`

**Response (200):**
```json
{
  "id": "atrial-fibrillation",
  "name": "Atrial Fibrillation",
  "code": "AFib",
  "description": "...",
  "symptoms": [...],
  "riskLevel": "High"
}
```

### 8. Get ECG Measurements
**GET** `/medical-reference/measurements`

**Response (200):**
```json
[
  {
    "name": "Heart Rate",
    "normal": "60-100 bpm",
    "unit": "bpm"
  },
  {
    "name": "PR Interval",
    "normal": "120-200 ms",
    "unit": "ms"
  }
]
```

---

## ECG Report Endpoints

### 9. Get Reports (Paginated)
**GET** `/reports?patientEmail=john@example.com&status=Completed&limit=20&offset=0`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `patientEmail`: Filter by patient email
- `doctorEmail`: Filter by cardiologist email
- `status`: Pending|Completed|Rejected
- `limit`: Items per page (default: 20)
- `offset`: Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "reports": [
    {
      "id": "ECG-1234567890",
      "reportId": "ECG-1234567890",
      "patientName": "John Doe",
      "patientEmail": "john@example.com",
      "patientAge": 45,
      "patientGender": "Male",
      "cardiologistName": "Dr. Sarah Smith",
      "cardiologistEmail": "doctor@example.com",
      "status": "Completed",
      "confidence": "92.5",
      "conditions": ["Normal Sinus Rhythm"],
      "fileUrl": "/uploads/ecg-file.csv",
      "createdAt": "2026-05-30T10:00:00Z"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

### 10. Get Single Report
**GET** `/reports/:id`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "ECG-1234567890",
  "reportId": "ECG-1234567890",
  "patientName": "John Doe",
  "patientEmail": "john@example.com",
  "patientAge": 45,
  "cardiologistName": "Dr. Sarah Smith",
  "status": "Completed",
  "conditions": ["Normal Sinus Rhythm"],
  "analysis": {
    "heartRate": 72,
    "rhythmType": "Normal Sinus Rhythm",
    "prInterval": "152",
    "qrsInterval": "98",
    "qtInterval": "412",
    "stSegment": "0.05",
    "confidence": "92.5"
  },
  "doctorNotes": "Patient appears healthy",
  "doctorAssessment": "No abnormalities detected",
  "fileUrl": "/uploads/ecg-file.csv",
  "createdAt": "2026-05-30T10:00:00Z"
}
```

### 11. Create Report (Manual)
**POST** `/reports`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "patientName": "John Doe",
  "patientEmail": "john@example.com",
  "patientAge": 45,
  "patientGender": "Male",
  "symptoms": "Chest pain, shortness of breath",
  "notes": "Patient history of hypertension",
  "cardiologistName": "Dr. Sarah Smith",
  "cardiologistEmail": "doctor@example.com",
  "status": "Pending",
  "conditions": [],
  "analysis": {}
}
```

**Response (200):**
```json
{
  "success": true,
  "report": {
    "id": "ECG-1234567890",
    "reportId": "ECG-1234567890",
    "patientName": "John Doe",
    ...
  }
}
```

### 12. Upload ECG File
**POST** `/upload` (multipart/form-data)

**Headers:** `Authorization: Bearer <token>`

**Form Data:**
```
ecgFile: <file>
patientName: John Doe
patientEmail: john@example.com
patientAge: 45
patientGender: Male
symptoms: Chest pain
notes: Additional notes
cardiologistName: Dr. Sarah Smith
cardiologistEmail: doctor@example.com
```

**Response (200):**
```json
{
  "success": true,
  "report": {
    "id": "ECG-1234567890",
    "reportId": "ECG-1234567890",
    "patientName": "John Doe",
    "fileUrl": "/uploads/1234567890-file.csv",
    "fileName": "patient_ecg.csv",
    "fileSize": 2048,
    "analysis": {
      "heartRate": 72,
      "rhythmType": "Normal Sinus Rhythm",
      "confidence": "85.3"
    },
    "status": "Pending",
    "createdAt": "2026-05-30T10:00:00Z"
  }
}
```

### 13. Update Report
**PUT** `/reports/:id`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "status": "Completed",
  "conditions": ["Normal Sinus Rhythm"],
  "confidence": "95.2",
  "doctorNotes": "Review complete",
  "doctorAssessment": "No abnormalities detected",
  "analysis": {
    "heartRate": 72,
    "prInterval": "152"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "report": {
    "id": "ECG-1234567890",
    "status": "Completed",
    "confidence": "95.2",
    "conditions": ["Normal Sinus Rhythm"],
    "updatedAt": "2026-05-30T10:30:00Z",
    "finalizedAt": "2026-05-30T10:30:00Z"
  }
}
```

### 14. Delete Report
**DELETE** `/reports/:id`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Report deleted"
}
```

---

## ECG Analysis Endpoints

### 15. Get All Analyses
**GET** `/analysis`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "analyses": [...]
}
```

### 16. Analyze ECG
**POST** `/analyze-ecg/:reportId`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "analysis": {
    "heartRate": 72,
    "rhythmType": "Normal Sinus Rhythm",
    "prInterval": "152",
    "qrsInterval": "98",
    "qtInterval": "412",
    "stSegment": "0.05",
    "conditions": [],
    "confidence": "87.3",
    "timestamp": "2026-05-30T10:00:00Z"
  }
}
```

---

## Messaging & Chatbot Endpoints

### 17. Get Messages (Paginated)
**GET** `/messages?conversationId=conv-123&limit=50&offset=0`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-1234567890",
      "conversationId": "conv-123",
      "text": "How is my heart condition?",
      "senderRole": "patient",
      "senderName": "John Doe",
      "senderEmail": "john@example.com",
      "timestamp": "2026-05-30T10:00:00Z",
      "isRead": false
    }
  ],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

### 18. Send Message
**POST** `/messages`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "conversationId": "conv-123",
  "text": "Hello, how can I help?",
  "senderRole": "doctor",
  "senderName": "Dr. Sarah Smith",
  "senderEmail": "doctor@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": {
    "id": "msg-1234567890",
    "conversationId": "conv-123",
    "text": "Hello, how can I help?",
    "senderRole": "doctor",
    "senderEmail": "doctor@example.com",
    "timestamp": "2026-05-30T10:00:00Z",
    "isRead": false
  }
}
```

### 19. AI Chatbot
**POST** `/chat`

**Body:**
```json
{
  "message": "What is atrial fibrillation?",
  "context": "medical"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": {
    "id": "msg-1234567890",
    "text": "Atrial fibrillation is an irregular heartbeat that can increase the risk of stroke...",
    "sender": "chatbot",
    "timestamp": "2026-05-30T10:00:00Z"
  }
}
```

### 20. Get Conversations
**GET** `/conversations`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv-123",
      "lastMessage": "Take your medication regularly",
      "lastMessageTime": "2026-05-30T10:30:00Z",
      "messageCount": 12,
      "participants": ["john@example.com", "doctor@example.com"]
    }
  ]
}
```

---

## Health Check

### 21. Health Status
**GET** `/health`

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-05-30T10:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "All registration fields are required."
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Report not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
JWT_SECRET=CardioSense-Secret-Key-2024
NODE_ENV=development
```

---

## Running the Backend

### Development
```bash
cd backend
npm install
npm run dev
```

### Production
```bash
cd backend
npm install
npm start
```

Server will start on `http://localhost:5000`

---

## Database Structure

The backend stores application data in MongoDB collections managed through Mongoose:
- **users**: Patient and doctor accounts
- **reports**: ECG reports and analysis
- **messages**: Patient-doctor communications
- **analyses**: ECG analysis results

---

## Security Notes

1. Passwords are hashed with SHA-256 (consider bcrypt in production)
2. JWT tokens expire in 7 days
3. CORS is enabled for `localhost:5173` and `localhost:3000`
4. File uploads are stored in `/uploads` directory
5. All authenticated endpoints require valid JWT token

---

## Rate Limiting

Currently not implemented. Recommended for production deployment.

---

## File Upload Limits

- Max file size: Configured in multer (currently unlimited)
- Supported formats: All file types
- Storage: `/uploads` directory

---

## Testing with cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"password","role":"patient"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password","role":"patient"}'

# Get reports (with token)
curl -X GET http://localhost:5000/api/reports \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

**Last Updated:** 2026-05-30  
**API Version:** 1.0.0
