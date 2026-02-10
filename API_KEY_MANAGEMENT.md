# API Key Management System Documentation

## Overview

The API Key Management System enables centralized management of Gemini API keys with automatic quota tracking, daily usage monitoring, and per-school reporting. This replaces the previous manual API key input with a dropdown-based selection system.

## Key Features

### 1. **API Key Pool Management**
- Add multiple Gemini API keys to the system
- Set user-friendly nicknames for each key (e.g., "Primary", "Backup", "School A")
- Enable/disable keys without deletion
- Soft delete keys (archive) with full history retention

### 2. **Automatic Quota Tracking**
- **Rate Limit**: 20 RPM per API key
- **Daily Budget**: 28,800 requests/day (20 RPM × 1440 minutes)
- **Safety Reserve**: Uses only 19 RPM (27,360 requests/day), reserves 1 RPM
- **Auto-Reset**: Daily quotas reset at midnight UTC
- **Real-time Monitoring**: See remaining quota for each key in dropdown

### 3. **Daily Usage Tracking**
- Track usage per API key per day
- See which schools/extractions used each key
- Historical data stored indefinitely
- No usage data is ever deleted (for audit compliance)

### 4. **Intelligent Key Selection**
- System automatically shows keys with available quota
- Users select key from dropdown during extraction/mapping
- Keys with no quota remaining are hidden from dropdown
- Shows usage percentage and remaining requests per key

### 5. **Cost Tracking**
- Estimated cost per API call
- Monthly and all-time cost breakdowns
- Cost tracking by school and API key
- Helps optimize API usage across organization

## API Endpoints

### API Key Management

#### &nbsp;&nbsp;&nbsp;&nbsp;POST `/api/v2/api-keys`
**Add a new API key**

```bash
curl -X POST /api/v2/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-project-...",
    "nickname": "Primary Key"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "nickname": "Primary Key",
    "created_at": "2025-02-10T10:30:00Z"
  }
}
```

#### &nbsp;&nbsp;&nbsp;&nbsp;GET `/api/v2/api-keys`
**List all API keys with stats**

```bash
curl /api/v2/api-keys
```

**Response includes:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "nickname": "Primary Key",
      "provider": "gemini",
      "is_active": true,
      "created_at": "2025-02-10T10:30:00Z",
      "last_used": "2025-02-11T15:45:00Z",
      "stats": {
        "today": {
          "requests_used": 5000,
          "requests_remaining": 23800,
          "percentage_used": 17
        },
        "this_month": {
          "requests_used": 45000,
          "tokens_used": 2000000,
          "days_active": 8
        },
        "all_time": {
          "total_requests": 45000,
          "total_tokens": 2000000,
          "estimated_cost_cents": 200,
          "days_since_created": 8
        },
        "schools_today": [
          {
            "school_name": "Lincoln High",
            "requests_count": 2000
          }
        ]
      }
    }
  ]
}
```

#### &nbsp;&nbsp;&nbsp;&nbsp;PUT `/api/v2/api-keys/[id]`
**Update API key (nickname, status)**

```bash
curl -X PUT /api/v2/api-keys/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "Primary Key - Prod",
    "is_active": true
  }'
```

#### &nbsp;&nbsp;&nbsp;&nbsp;DELETE `/api/v2/api-keys/[id]`
**Soft delete API key**

```bash
curl -X DELETE /api/v2/api-keys/507f1f77bcf86cd799439011
```

### Available Keys (for dropdown)

#### &nbsp;&nbsp;&nbsp;&nbsp;GET `/api/v2/api-keys/available`
**Get keys with quota remaining (for UI dropdown)**

```bash
curl /api/v2/api-keys/available
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "api_key_id": "507f1f77bcf86cd799439011",
      "nickname": "Primary Key",
      "rpd_remaining": 23800,
      "daily_limit": 28800,
      "percentage_used": 17
    },
    {
      "api_key_id": "507f1f77bcf86cd799439012",
      "nickname": "Backup Key",
      "rpd_remaining": 28600,
      "daily_limit": 28800,
      "percentage_used": 1
    }
  ]
}
```

### Statistics

#### &nbsp;&nbsp;&nbsp;&nbsp;GET `/api/v2/api-keys/[id]/stats`
**Get detailed stats for specific API key**

```bash
curl /api/v2/api-keys/507f1f77bcf86cd799439011/stats
```

### Usage Reports

#### &nbsp;&nbsp;&nbsp;&nbsp;GET `/api/v2/api-keys/reports/usage`
**Get usage report for period**

```bash
curl "/api/v2/api-keys/reports/usage?days=30&api_key_id=507f1f77bcf86cd799439011"
```

**Query Parameters:**
- `days`: Number of days to look back (default: 30)
- `api_key_id`: Filter by specific API key (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "Last 30 days",
    "total_requests": 150000,
    "total_tokens": 5000000,
    "total_cost_cents": 500,
    "daily_breakdown": [
      {
        "date": "2025-02-11",
        "requests": 5000,
        "tokens": 200000,
        "cost_cents": 20,
        "api_keys_used": [
          {
            "nickname": "Primary Key",
            "requests": 3000
          },
          {
            "nickname": "Backup Key",
            "requests": 2000
          }
        ]
      }
    ],
    "school_breakdown": [
      {
        "school_name": "Lincoln High",
        "requests": 50000,
        "tokens": 1500000,
        "cost_cents": 150
      }
    ],
    "api_key_breakdown": [
      {
        "api_key_id": "507f1f77bcf86cd799439011",
        "nickname": "Primary Key",
        "requests": 100000,
        "tokens": 3500000,
        "cost_cents": 350
      }
    ]
  }
}
```

## Using API Keys in Extraction/Mapping

### Request Format

```bash
curl -X POST /api/v2/refine-extractions \
  -H "Content-Type: application/json" \
  -d '{
    "extractionId": "507f1f77bcf86cd799439001",
    "apiKeyId": "507f1f77bcf86cd799439011",
    "schoolName": "Lincoln High",
    "fileName": "courses_2025.pdf"
  }'
```

**Required Fields:**
- `extractionId`: MongoDB ObjectId of extraction
- `apiKeyId`: MongoDB ObjectId of API key from pool (user selects from dropdown)

**Optional Fields:**
- `schoolName`: Name of school (for tracking)
- `fileName`: Original file name (for tracking)

### UI Integration

The system provides two main UI components:

#### 1. **API Key Selector Dropdown**
```typescript
import ApiKeySelector from '@/components/ApiKeySelector';

<ApiKeySelector
  value={selectedKeyId}
  onChange={setSelectedKeyId}
  showStats={true}
/>
```

Shows:
- List of available keys with quota remaining
- Real-time usage statistics
- Warning if key has no quota
- Prevents selection of inactive keys

#### 2. **API Key Dashboard**
```typescript
import ApiKeyDashboard from '@/components/ApiKeyDashboard';

<ApiKeyDashboard onRefresh={handleRefresh} />
```

Shows:
- All API keys with detailed stats
- Today's usage and remaining quota
- Monthly and all-time usage
- Schools using each key today
- Add/edit/delete keys
- Enable/disable keys

## Data Models

### GeminiApiKey

```typescript
interface GeminiApiKey {
  _id?: ObjectId;
  key: string; // Encrypted
  nickname: string;
  provider: 'gemini' | 'openai';
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  is_deleted: boolean;
  last_used?: Date;
  
  quota: {
    daily_limit: number; // 28,800 default
    used_today: number;
    reset_at: Date;
  };
  
  usage: {
    total_requests: number;
    total_tokens_used: number;
    estimated_cost_cents: number;
  };
  
  daily_usage: {
    date: string; // YYYY-MM-DD
    requests_used: number;
    tokens_used: number;
  }[];
}
```

### ApiUsageLog

```typescript
interface ApiUsageLog {
  _id?: ObjectId;
  api_key_id: ObjectId;
  extraction_id?: ObjectId;
  user_id: ObjectId | string;
  school_name?: string;
  file_name?: string;
  date: Date;
  requests_count: number;
  tokens_used: number;
  success: boolean;
  error_message?: string;
  estimated_cost_cents: number;
}
```

## Database Collections

### Collections to Create

```javascript
// API keys
db.createCollection('gemini_api_keys');
db.gemini_api_keys.createIndex({ nickname: 1 }, { unique: true });
db.gemini_api_keys.createIndex({ is_active: 1 });
db.gemini_api_keys.createIndex({ created_at: 1 });

// Usage logs
db.createCollection('api_usage_logs');
db.api_usage_logs.createIndex({ api_key_id: 1, date: 1 });
db.api_usage_logs.createIndex({ school_name: 1 });
db.api_usage_logs.createIndex({ extraction_id: 1 });
db.api_usage_logs.createIndex({ date: 1 });
```

## Workflow Examples

### Example 1: Adding API Keys

1. Go to API Key Management Dashboard
2. Click "Add API Key"
3. Enter nickname: "Lincoln High - Key 1"
4. Paste API key from Gemini Cloud
5. Click "Add Key"
6. Key is now available for selection in dropdowns

### Example 2: Processing Extraction with API Key Selection

1. Navigate to Extraction page
2. Select extraction with unmapped courses
3. Open "Map Courses" dialog
4. System shows API Key Selector dropdown
5. Dropdown shows:
   - "Primary Key" - 23,800 requests remaining (17% used)
   - "Backup Key" - 28,600 requests remaining (1% used)
6. Select "Backup Key" (more quota available)
7. Optionally enter: School name "Lincoln High"
8. Click "Start Mapping"
9. System processes mapping and logs usage

### Example 3: Viewing Usage Report

1. Go to API Key Management Dashboard
2. View all keys with today's stats
3. See "Schools Using Today" for each key
4. Click on API key for detailed stats
5. View monthly breakdown and per-school usage
6. Check "Reports" section for 30-day summary

## Best Practices

### 1. **Key Rotation**
- Add new keys before old ones run out of quota
- Disable old keys before archiving

### 2. **Quota Management**
- Monitor daily usage to avoid quota overload
- Add more keys if approaching daily limits
- Set up alerts at 80% quota usage

### 3. **School Tracking**
- Always include school name when processing
- Review school_breakdown in usage reports
- Track which schools use most API quota

### 4. **Cost Optimization**
- Review estimated costs monthly
- Identify high-usage schools
- Optimize extraction/mapping patterns

### 5. **Audit Compliance**
- Usage logs are never deleted (audit trail)
- All API calls are logged with school/extraction reference
- Monthly cost reports available for accounting

## Troubleshooting

### Issue: "No API keys have quota remaining"
**Solution:**
- Add new API key with `POST /api/v2/api-keys`
- Quotas reset daily at midnight UTC
- Check if you've hit monthly limits

### Issue: "Selected API key has no quota remaining"
**Solution:**
- Choose different key from dropdown
- System automatically filters keys without quota
- Add new key if all keys exhausted

### Issue: API key not showing in dropdown
**Solution:**
- Ensure key is marked `is_active: true`
- Check if key has remaining quota
- Key must not be deleted (`is_deleted: false`)

## Future Enhancements

1. **Email Alerts**: Notify when keys near quota limits
2. **Automatic Failover**: Switch keys automatically if one exhausted
3. **Multi-Provider Support**: Add OpenAI, Claude API support
4. **Per-School Budgets**: Set quota limits per school
5. **Usage Predictions**: ML-based quota forecasting
6. **Webhook Notifications**: Real-time usage alerts
