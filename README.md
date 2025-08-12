# Weather API MCP Server

Single-file HTTP MCP Server for WeatherAPI.com to get current weather, forecasts, and location data, powered by [Bun](https://bun.com/).

* **Bearer token authentication** – uses your WeatherAPI.com API key via Authorization header
* **Current weather data** – get real-time weather conditions for any location
* **Weather forecasting** – get 1-3 day weather predictions
* **Location search** – find and validate location names
* **Single file implementation** – complete MCP server in `simple-mcp-server.ts`
* All capabilities are exposed as **MCP tools** over a Bun HTTP server

> **💡 Don't have Bun?** Install it from [https://bun.com/](https://bun.com/)

## 🏗️ Built With

This single-file MCP server uses:

- **[Bun's built-in HTTP server](https://bun.com/docs/api/http)** - Ultra-fast native HTTP handling with zero dependencies
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation for bulletproof input validation
- **[WeatherAPI.com](https://www.weatherapi.com/)** - RESTful API for weather data and forecasts
- **Native fetch** - Built-in HTTP client for API calls

---

## 🔐 Authentication

This MCP server uses **Bearer token authentication** with your WeatherAPI.com API key:

### **Authorization Header Authentication**
Include your WeatherAPI.com API key in the Authorization header:
```
Authorization: Bearer your-weatherapi-key-here
```

### **MCP Client Integration**
When adding this MCP server to MCP clients (Cursor, Claude Desktop, etc.):

1. **Server URL**: `http://localhost:3000/mcp`
2. **Headers**: Add Authorization header with your API key:
   ```json
   {
     "Authorization": "Bearer your-weatherapi-key-here"
   }
   ```

### **Connecting to Cursor**

Cursor is an excellent MCP client that can integrate with this weather API MCP server. Here's how to set it up:

#### **1. Configure Cursor's MCP Settings**

Create or edit your Cursor MCP configuration file at `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "weather": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer your-weatherapi-key-here"
      }
    }
  }
}
```

**Important:** Replace `your-weatherapi-key-here` with your actual WeatherAPI.com API key.

#### **2. Start Your MCP Server**

In a terminal, start the weather API MCP server:

```bash
cd weather-api-mcp-server
bun run simple-mcp-server.ts
```

The server will start on `http://localhost:3000/mcp`.

#### **3. Restart Cursor**

After updating the MCP configuration, restart Cursor completely for the changes to take effect.

#### **4. Verify Connection**

Once connected, you can ask Cursor to use the weather tools:

- **"What's the current weather in London?"**
- **"Get a 3-day forecast for Tokyo"**
- **"Search for locations named Springfield"**

Cursor will automatically use the appropriate MCP tool from your weather server to fetch the data.

#### **5. Troubleshooting**

If the connection fails:

1. **Check server status**: Ensure your MCP server is running on port 3000
2. **Verify API key**: Make sure your WeatherAPI.com API key is correct
3. **Check Cursor logs**: Look for MCP connection errors in Cursor's developer console
4. **Test manually**: Use the MCP Inspector to verify your server works independently

#### **6. Advanced Configuration**

You can add multiple MCP servers or customize the configuration:

```json
{
  "mcpServers": {
    "weather": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer your-weatherapi-key-here"
      }
    },
    "other-server": {
      "type": "http",
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

### **Getting Your API Key**
1. Sign up for free at [WeatherAPI.com](https://www.weatherapi.com/signup.aspx)
2. Verify your email address
3. Copy your API key from the dashboard
4. Use it in the Authorization header as shown above

---

## ✨ Features

| Capability                    | WeatherAPI.com endpoint                                    |
| ----------------------------- | ---------------------------------------------------------- |
| Get current weather           | `GET /v1/current.json` with location parameter           |
| Get weather forecast          | `GET /v1/forecast.json` with location and days           |
| Search for locations          | `GET /v1/search.json` with query parameter               |

Typical MCP request:

```json
POST /mcp
{
  "tool": "getCurrentWeather",
  "input": {
    "location": "London"
  }
}
```

---

## 🗂 Repo layout

```
.
├─ simple-mcp-server.ts    # Complete single-file MCP server
├─ package.json            # Dependencies (bun, zod)
├─ tsconfig.json          # TypeScript configuration
└─ README.md              # This file
```

The entire MCP server is implemented in a single TypeScript file (`simple-mcp-server.ts`) that handles WeatherAPI.com integration.

---

## ⚙️ Prerequisites

1. **WeatherAPI.com API key**
   * Sign up for free at [https://www.weatherapi.com/signup.aspx](https://www.weatherapi.com/signup.aspx)
   * Verify your email address
   * Get your API key from the dashboard
   * Free tier includes 1 million calls per month

2. **Bun ≥ 1.2.2** installed locally.

---

## 🌍 Configuration

| Name                | Example                                | Required | Description |
| ------------------- | -------------------------------------- | -------- | ----------- |
| `PORT`              | `3000`                                | ❌ | Server port (defaults to 3000) |

**🔑 Authentication:** API key provided via Authorization header only - no environment variables needed!

---

## 🧪 Development & Testing

You can use the official [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to interactively test this server.

1.  **Start the server** in one terminal:
    ```bash
    bun run simple-mcp-server.ts
    ```

2.  **Run the inspector** in another terminal:
    ```bash
    npx @modelcontextprotocol/inspector http://localhost:3000/mcp
    ```

3. **Add your API key** in the inspector's headers section:
   ```json
   {
     "Authorization": "Bearer your-weatherapi-key-here"
   }
   ```

This will launch a web UI where you can see all available tools and manually trigger them with different parameters.

## ▶️ Running locally

```bash
# Install Bun (if you don't have it)
curl -fsSL https://bun.sh/install | bash

# Install deps
bun install

# Run server on port 3000
bun run simple-mcp-server.ts
```

Send a request:
```bash
curl -X POST "http://localhost:3000/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-weatherapi-key-here" \
  -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
          "name": "getCurrentWeather",
          "arguments": {
            "location": "London"
          }
        }
      }'
```

### Additional endpoints
| Route | Method | Purpose |
|-------|--------|---------|
| `/healthz` | GET/HEAD | Simple health-check (returns `200 OK`) |

All responses include `Access-Control-Allow-Origin: *` so the MCP can be called from a browser without extra CORS configuration.

---

## 🛠️ MCP tool set

| Tool                    | Purpose                        | Input → Output                                                   |
| ----------------------- | ------------------------------ | ---------------------------------------------------------------- |
| `getCurrentWeather`     | get current weather conditions | `{ location }` → current weather data                           |
| `getWeatherForecast`    | get weather forecast           | `{ location, days? }` → forecast data (1-3 days)               |
| `searchLocations`       | find location names            | `{ query }` → array of matching locations                       |

**🔍 Parameters:**
- **location**: City name, ZIP code, coordinates (lat,lon), or IP address
- **days**: Number of forecast days (1-3, defaults to 3)
- **query**: Search term for location names (partial matches work)

**📊 Response Data:**
- **Current weather**: Temperature, conditions, humidity, wind, feels-like temperature
- **Forecast**: Daily high/low temperatures, conditions, precipitation chance
- **Location data**: Resolved location name, country, coordinates, timezone

---


Then use the Authorization header in your requests:
```
Authorization: Bearer your-weatherapi-key-here
```



### Usage Examples

**Current Weather:**
```bash
# Get current weather for London
{ "location": "London" }

# Use coordinates
{ "location": "40.7128,-74.0060" }

# Use ZIP code
{ "location": "10001" }
```

**Weather Forecast:**
```bash
# 3-day forecast (default)
{ "location": "Tokyo" }

# 1-day forecast
{ "location": "Paris", "days": 1 }

# 2-day forecast
{ "location": "Sydney", "days": 2 }
```

**Location Search:**
```bash
# Find cities named "Springfield"
{ "query": "Springfield" }

# Partial match
{ "query": "Albuquer" }

# International locations
{ "query": "München" }
```