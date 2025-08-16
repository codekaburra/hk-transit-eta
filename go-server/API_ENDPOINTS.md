# API Endpoints Documentation

## Route Count Endpoint

### GET /api/num-routes

Returns the total number of routes for a specific transport type.

**Query Parameters:**
- `type` (required): The type of transport routes to count
  - `bus`: Count bus routes (KMB + Citybus)
  - `minibus`: Count minibus routes

**Example Requests:**
```bash
# Get total number of bus routes
GET /api/num-routes?type=bus

# Get total number of minibus routes
GET /api/num-routes?type=minibus
```

**Response Format:**
```json
{
  "type": "bus",
  "count": 1234
}
```

**Error Responses:**
- `400 Bad Request`: When type parameter is missing or invalid
- `500 Internal Server Error`: When database query fails

**Notes:**
- Bus routes are counted from the `routes` table
- Minibus routes are counted from the `minibus_route` table
- The count represents the total number of unique routes in the database 