# MalScan Backend - Orchestration & Decision Engine

**Member 1 Responsibility**: Core backend orchestration, risk scoring, and module coordination

## Overview

This is the **core orchestration module** for MalScan, a malware file analysis system. It coordinates multiple analysis modules, aggregates risk scores, and determines file verdicts based on a **Zero Trust** security model.

## Architecture

### Core Components

```
backend/
├── src/
│   ├── core/
│   │   ├── orchestrator.js    # Main orchestration engine
│   │   └── scoring.js          # Risk scoring & verdict logic
│   ├── modules/
│   │   ├── moduleInterface.js  # Module contracts & registry
│   │   └── mockModules.js      # Mock analysis modules (for testing)
│   ├── storage/
│   │   └── analysisStore.js    # In-memory + JSON persistence
│   └── server.js               # Express API server
├── data/
│   ├── analyses/               # JSON storage for analyses
│   └── config/
│       └── scoring_config.json # Module weights & thresholds
└── tests/                      # Test files
```

### Key Features

✅ **Zero Trust Model**: All files untrusted by default  
✅ **Modular Architecture**: Easy to add/remove analysis modules  
✅ **Weighted Risk Scoring**: Configurable weights for each module  
✅ **Graceful Degradation**: System works even if modules fail  
✅ **Async Orchestration**: Parallel module execution with timeouts  
✅ **In-Memory + JSON Storage**: Fast access with persistence  

## API Endpoints

### POST /api/analyze
Initiates file analysis.

**Request:**
```json
{
  "file_hash": "sha256_hash_string",
  "file_name": "document.pdf",
  "file_size": 2048576,
  "file_type": "application/pdf"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "message": "Analysis initiated"
}
```

### GET /api/status/:analysis_id
Retrieves analysis status and results.

**Response (200 OK):**
```json
{
  "success": true,
  "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
  "file_reference": {
    "file_hash": "sha256_hash_string",
    "file_name": "document.pdf",
    "file_size": 2048576,
    "file_type": "application/pdf"
  },
  "analysis_status": "COMPLETED",
  "risk_score": 75,
  "confidence": 0.85,
  "verdict": "MALICIOUS",
  "explanation": "High-risk indicators detected...",
  "flags": ["suspicious_entropy", "known_malicious_signature"],
  "module_results": { ... },
  "timestamps": {
    "initiated_at": "2025-12-21T08:52:10Z",
    "completed_at": "2025-12-21T08:52:15Z"
  }
}
```

### GET /api/stats
System statistics (for monitoring).

### GET /health
Health check endpoint.

## Installation & Setup

### Prerequisites
- Node.js 18+ (with ES modules support)
- npm or yarn

### Install Dependencies

```bash
cd backend
npm install
```

### Start the Server

```bash
npm start
```

The server will start on **http://localhost:3001**

### Development Mode (with auto-reload)

```bash
npm run dev
```

## Configuration

### Scoring Configuration
Edit `data/config/scoring_config.json` to adjust:

- **Module weights** (must sum to 1.0)
- **Risk thresholds** (SAFE/SUSPICIOUS/MALICIOUS boundaries)
- **Confidence penalties** for missing modules
- **Timeout values** per module

Example:
```json
{
  "modules": {
    "static_analysis": {
      "weight": 0.35,
      "critical": true,
      "timeout_ms": 30000,
      "enabled": true
    }
  },
  "thresholds": {
    "safe_max": 30,
    "suspicious_min": 31,
    "suspicious_max": 60,
    "malicious_min": 61
  }
}
```

## Module Integration Guide

### For Team Members Adding New Modules

#### 1. Create Your Module Class

```javascript
import { AnalysisModule } from './modules/moduleInterface.js';

export class MyAnalysisModule extends AnalysisModule {
  constructor() {
    super('my_module_name');
  }

  async execute(input) {
    // Validate input
    if (!this.validateInput(input)) {
      return this.createOutput('FAILED', null, 0, [], null, 'Invalid input');
    }

    // Perform your analysis
    const riskScore = 50; // 0-100
    const flags = ['some_indicator'];

    return this.createOutput(
      'COMPLETED',
      riskScore,
      0.85, // confidence
      flags,
      { your_custom_data: 'here' }
    );
  }
}
```

#### 2. Register Your Module

In `src/server.js`, import and register:

```javascript
import { MyAnalysisModule } from './modules/myModule.js';

// In startServer function:
moduleRegistry.register('my_module', new MyAnalysisModule());
```

#### 3. Add Configuration

Update `data/config/scoring_config.json`:

```json
{
  "modules": {
    "my_module": {
      "weight": 0.20,
      "critical": false,
      "timeout_ms": 20000,
      "enabled": true
    }
  }
}
```

**Note**: Ensure all module weights sum to 1.0!

## Zero Trust Decision Logic

### Verdict Mapping

| Risk Score | Verdict | Description |
|-----------|---------|-------------|
| 0-30 | SAFE | Low risk, no significant threats |
| 31-60 | SUSPICIOUS | Moderate risk, exercise caution |
| 61-100 | MALICIOUS | High risk, do not open |
| null | UNKNOWN | Insufficient data (default) |

### Confidence Calculation

```
base_confidence = (completed_modules_weight / total_weight)
final_confidence = base_confidence 
                 - (missing_critical_modules × 0.2)
                 - (missing_non_critical_modules × 0.05)
```

Minimum confidence required: **0.3** (30%)

## Storage Strategy

### In-Memory Store
- Fast access for active analyses
- Automatic cleanup every 15 minutes
- TTL: 1 hour per analysis

### JSON Persistence
- All analyses saved to `data/analyses/`
- Files retained for 24 hours
- Loaded on-demand if not in memory

### Server Restart Behavior
- In-memory store is cleared
- Recent analyses can be recovered from JSON
- In-progress analyses marked as "INTERRUPTED"

## Testing

### Run Tests
```bash
npm test
```

### Test with cURL

**Initiate Analysis:**
```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "file_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "file_name": "test.pdf",
    "file_size": 1024000,
    "file_type": "application/pdf"
  }'
```

**Check Status:**
```bash
curl http://localhost:3001/api/status/{analysis_id}
```

## Mock Modules (For Testing)

The system includes 3 mock analysis modules:

1. **static_analysis** - Simulates file structure analysis
2. **threat_intelligence** - Simulates threat database lookups
3. **behavioral_analysis** - Simulates sandbox execution

These can be replaced with real implementations by other team members.

## Troubleshooting

### Port Already in Use
Change the port in `src/server.js` or set environment variable:
```bash
PORT=3002 npm start
```

### CORS Errors
The server has CORS enabled for all origins. If issues persist, check frontend URL configuration.

### Module Not Executing
- Verify module is registered in `moduleRegistry`
- Check module is enabled in `scoring_config.json`
- Review timeout settings

## Project Status

✅ Core orchestration engine  
✅ Risk scoring & verdict logic  
✅ Module interface contracts  
✅ API endpoints  
✅ In-memory + JSON storage  
✅ Frontend integration  
🔄 Real analysis modules (to be added by team)  
🔄 Database integration (optional, future)  

## Team Integration

This module is **ready for integration** with:
- **Member 2**: Static analysis module
- **Member 3**: VirusTotal API module
- **Member 4**: Risk explanation module
- **Member 5**: Dashboard & authentication

Each team member should implement the `AnalysisModule` interface and register their module with the orchestrator.

---

**Built by Member 1** | MalScan Cybersecurity Project
