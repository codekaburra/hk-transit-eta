# Debug Mode Configuration

## Overview
The React UI includes a debug mode that can be enabled/disabled using environment variables. When debug mode is enabled, additional information and logging will be displayed.

## Environment Variables

Create a `.env` file in the `react-ui` directory with the following variables:

```bash
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8080/api
REACT_APP_CITYBUS_ETA_BASE_URL=https://rt.data.gov.hk/v2/transport/citybus/eta

# Debug Configuration
REACT_APP_DEBUG_MODE=true
```

## Debug Mode Features

### 1. Enhanced Route Stop Information
When `REACT_APP_DEBUG_MODE=true`, the `BusRouteStopCard` component will display:
- Stop ID (internal identifier)
- Route details (route number, direction, service type)

### 2. Debug Logging
Console logs will be prefixed with `[DEBUG]` and only appear when debug mode is enabled.

### 3. Conditional Rendering
Use the `debugRender` utility function for conditional debug content:

```tsx
import { debugRender } from '../../../services/utils';

{debugRender(true, (
  <div className="debug-info">
    <p>Debug information here</p>
  </div>
))}
```

## Utility Functions

### `isDebugMode()`
Returns boolean indicating if debug mode is enabled.

### `debugLog(message, ...args)`
Logs messages only when debug mode is enabled.

### `debugRender(condition, content)`
Renders content only when both debug mode is enabled and condition is true.

## Example Usage

```tsx
import { debugLog, debugRender } from '../../../services/utils';

// Conditional logging
debugLog('API Response:', responseData);

// Conditional rendering
{debugRender(true, (
  <div className="debug-panel">
    <h3>Debug Information</h3>
    <pre>{JSON.stringify(props, null, 2)}</pre>
  </div>
))}
```

## Production Deployment

For production, set `REACT_APP_DEBUG_MODE=false` to disable all debug features and improve performance. 