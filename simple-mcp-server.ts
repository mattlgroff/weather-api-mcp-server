/**
 * SIMPLE MCP SERVER - WeatherAPI.com Integration
 * 
 * This is a complete, single-file example of how to wrap the WeatherAPI.com API 
 * with the Model Context Protocol (MCP).
 * 
 * Key concepts demonstrated:
 * 1. MCP Protocol Implementation - JSON-RPC over HTTP
 * 2. Bearer Token Authentication - API key via Authorization header
 * 3. Tool Registration - Exposing WeatherAPI.com functions as MCP tools
 * 4. Input Validation - Using Zod schemas
 */

import { serve } from 'bun';
import { z } from 'zod';

// =============================================================================
// ENVIRONMENT & CONFIGURATION
// =============================================================================

console.log('🌤️ Weather MCP Server starting...');
console.log('🔑 Authentication via Authorization header: Bearer token');
console.log('🌍 WeatherAPI.com integration ready');
const WEATHER_API_BASE = 'https://api.weatherapi.com/v1';

// =============================================================================
// INPUT VALIDATION SCHEMAS
// =============================================================================

const getCurrentWeatherSchema = z.object({
  location: z.string().describe('Any location: city name, ZIP code, coordinates, or IP address'),
  language: z.string().optional().describe('Language code for weather conditions text (e.g., en, es, fr)'),
});

const getWeatherForecastSchema = z.object({
  location: z.string().describe('Any location: city name, ZIP code, coordinates, or IP address'),
  days: z.number().int().min(1).max(3).default(3).describe('Number of forecast days (1-3 for free accounts)'),
  language: z.string().optional().describe('Language code for weather conditions text (e.g., en, es, fr)'),
});

const searchLocationsSchema = z.object({
  query: z.string().describe('Search query for location names - partial matches work'),
});

// =============================================================================
// WEATHERAPI.COM API FUNCTIONS - Direct API Wrappers
// =============================================================================

// Custom error class for WeatherAPI errors
class WeatherAPIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: any,
    message?: string
  ) {
    super(message || `WeatherAPI error (${status}): ${statusText}`);
    this.name = 'WeatherAPIError';
  }
}

async function callWeatherAPI(endpoint: string, apiKey: string, params: Record<string, any>) {
  // Build the URL with the API key
  const url = new URL(`${WEATHER_API_BASE}${endpoint}`);
  url.searchParams.set('key', apiKey);
  
  // Add all the parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value.toString());
    }
  });

  // Make the HTTP request
  const response = await fetch(url.toString());
  
  // Handle errors
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ WeatherAPI error: ${response.status} - ${errorText}`);
    
    let errorBody;
    try {
      errorBody = JSON.parse(errorText);
    } catch {
      errorBody = { message: errorText };
    }
    
    throw new WeatherAPIError(
      response.status,
      response.statusText,
      errorBody,
      `WeatherAPI request failed: ${errorText}`
    );
  }

  // Return the JSON response
  return response.json();
}

// Get current weather data
async function getCurrentWeatherData(apiKey: string, params: z.infer<typeof getCurrentWeatherSchema>) {
  return await callWeatherAPI('/current.json', apiKey, {
    q: params.location,
    lang: params.language,
  });
}

// Get weather forecast data
async function getWeatherForecastData(apiKey: string, params: z.infer<typeof getWeatherForecastSchema>) {
  return await callWeatherAPI('/forecast.json', apiKey, {
    q: params.location,
    days: params.days,
    lang: params.language,
  });
}

// Search for locations
async function searchLocationsData(apiKey: string, params: z.infer<typeof searchLocationsSchema>) {
  return await callWeatherAPI('/search.json', apiKey, {
    q: params.query,
  });
}

// =============================================================================
// JSON SCHEMA UTILITIES
// =============================================================================

function zodToMCPSchema(schema: z.ZodObject<any>) {
  const jsonSchema = z.toJSONSchema(schema) as any;
  
  // Fix the required array - remove fields that are optional or have defaults
  if (jsonSchema.required && Array.isArray(jsonSchema.required)) {
    const shape = schema.shape;
    jsonSchema.required = jsonSchema.required.filter((fieldName: string) => {
      const field = shape[fieldName];
      // Remove from required if field is optional or has a default
      return !field.isOptional() && field._def.defaultValue === undefined;
    });
    
    // If no truly required fields, remove the required array entirely
    if (jsonSchema.required.length === 0) {
      delete jsonSchema.required;
    }
  }
  
  return jsonSchema;
}

// =============================================================================
// MCP TOOL IMPLEMENTATIONS
// =============================================================================

async function getCurrentWeather(apiKey: string, input: any) {
  // Validate the input
  const validatedInput = getCurrentWeatherSchema.parse(input);
  
  // Make the API call
  const result = await getCurrentWeatherData(apiKey, validatedInput);
  
  // Format the response for the AI agent
  const location = result.location;
  const current = result.current;
  
  return {
    content: [
      {
        type: 'text',
        text: `Current weather in ${location.name}, ${location.country}: ${current.condition.text}, ${current.temp_c}°C (${current.temp_f}°F). Feels like ${current.feelslike_c}°C. Humidity: ${current.humidity}%. Wind: ${current.wind_kph} km/h ${current.wind_dir}.`,
      },
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

async function getWeatherForecast(apiKey: string, input: any) {
  // Apply defaults and validate
  const inputWithDefaults = {
    days: 3,
    ...input
  };
  const validatedInput = getWeatherForecastSchema.parse(inputWithDefaults);
  
  // Make the API call
  const result = await getWeatherForecastData(apiKey, validatedInput);
  
  // Format the response
  const location = result.location;
  const forecast = result.forecast.forecastday;
  
  let summary = `${validatedInput.days}-day forecast for ${location.name}, ${location.country}:\n`;
  forecast.forEach((day: any) => {
    summary += `${day.date}: ${day.day.condition.text}, High: ${day.day.maxtemp_c}°C, Low: ${day.day.mintemp_c}°C\n`;
  });
  
  return {
    content: [
      {
        type: 'text',
        text: summary,
      },
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

async function searchLocations(apiKey: string, input: any) {
  // Validate the input
  const validatedInput = searchLocationsSchema.parse(input);
  
  // Make the API call
  const result = await searchLocationsData(apiKey, validatedInput);
  
  // Format the response
  let summary = `Found ${result.length} locations matching "${validatedInput.query}":\n`;
  result.forEach((location: any) => {
    summary += `${location.name}, ${location.region}, ${location.country} (${location.lat}, ${location.lon})\n`;
  });
  
  return {
    content: [
      {
        type: 'text',
        text: summary,
      },
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

// =============================================================================
// MCP PROTOCOL IMPLEMENTATION
// =============================================================================

interface MCPRequest {
  jsonrpc: string;
  id?: number | string;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// JSON-RPC error codes
const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,        // Invalid JSON
  INVALID_REQUEST: -32600,    // Invalid request object
  METHOD_NOT_FOUND: -32601,   // Method doesn't exist
  INVALID_PARAMS: -32602,     // Invalid method parameters
  INTERNAL_ERROR: -32603,     // Internal JSON-RPC error
  
  // Custom error codes (allowed range: -32000 to -32099)
  UNAUTHORIZED: -32001,       // Missing or invalid API key
  FORBIDDEN: -32002,          // API key lacks permissions
  NOT_FOUND: -32003,          // Resource not found
  RATE_LIMITED: -32004,       // Too many requests
};

function createErrorResponse(
  id: number | string | null,
  code: number,
  message: string,
  data?: any
): MCPResponse {
  return {
    jsonrpc: '2.0',
    id: id || 'unknown',
    error: {
      code,
      message,
      ...(data && { data })
    }
  };
}

function mapWeatherAPIErrorToJSONRPC(error: WeatherAPIError): { code: number, message: string, data?: any } {
  switch (error.status) {
    case 400:
      return {
        code: JSON_RPC_ERRORS.INVALID_PARAMS,
        message: 'Invalid request parameters',
        data: {
          status: error.status,
          detail: error.body?.error?.message || error.message
        }
      };
      
    case 401:
      return {
        code: JSON_RPC_ERRORS.UNAUTHORIZED,
        message: 'Invalid WeatherAPI.com API key',
        data: {
          status: error.status,
          detail: 'Check your API key and make sure it\'s active'
        }
      };
      
    case 403:
      return {
        code: JSON_RPC_ERRORS.FORBIDDEN,
        message: 'WeatherAPI.com access denied',
        data: {
          status: error.status,
          detail: 'Your API key may have exceeded its quota or lacks required permissions'
        }
      };
      
    case 404:
      return {
        code: JSON_RPC_ERRORS.NOT_FOUND,
        message: 'Location not found',
        data: {
          status: error.status,
          detail: 'The specified location could not be found'
        }
      };
      
    case 429:
      return {
        code: JSON_RPC_ERRORS.RATE_LIMITED,
        message: 'Rate limit exceeded',
        data: {
          status: error.status,
          detail: 'Too many requests to WeatherAPI.com. Please wait before trying again.'
        }
      };
      
    default:
      return {
        code: JSON_RPC_ERRORS.INTERNAL_ERROR,
        message: 'WeatherAPI.com service error',
        data: {
          status: error.status,
          detail: error.message
        }
      };
  }
}

function extractAPIKey(request: Request): string | undefined {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    console.log('❌ No Authorization header found');
    return undefined;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    console.log('❌ Authorization header does not start with "Bearer "');
    return undefined;
  }
  
  const apiKey = authHeader.slice(7); // Remove "Bearer " prefix
  
  if (!apiKey || apiKey.trim().length === 0) {
    console.log('❌ Empty API key in Authorization header');
    return undefined;
  }
  
  console.log('✅ Valid API key found in Authorization header');
  return apiKey.trim();
}

const serverInfo = {
  name: 'weatherapi-mcp',
  version: '1.0.0',
};

const tools = [
  {
    name: 'getCurrentWeather',
    title: 'Get current weather conditions',
    description: 'Get real-time weather for any location - like checking if it\'s raining right now in Paris',
    inputSchema: zodToMCPSchema(getCurrentWeatherSchema),
  },
  {
    name: 'getWeatherForecast',
    title: 'Get weather forecast',
    description: 'Get weather predictions for the next 1-3 days - perfect for planning weekend trips',
    inputSchema: zodToMCPSchema(getWeatherForecastSchema),
  },
  {
    name: 'searchLocations',
    title: 'Search for locations',
    description: 'Find the right location name - useful when you\'re not sure how to spell "Albuquerque"',
    inputSchema: zodToMCPSchema(searchLocationsSchema),
  }
];

const allTools = {
  'getCurrentWeather': getCurrentWeather,
  'getWeatherForecast': getWeatherForecast,
  'searchLocations': searchLocations,
};

async function handleMCPRequest(request: MCPRequest, apiKey?: string): Promise<MCPResponse> {
  try {
    switch (request.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: true } },
            serverInfo,
          },
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: { tools },
        };

      case 'tools/call':
        const { name, arguments: args } = request.params || {};
        
        // Check if tool exists
        const tool = allTools[name];
        if (!tool) {
          return createErrorResponse(
            request.id,
            JSON_RPC_ERRORS.METHOD_NOT_FOUND,
            `Tool "${name}" not found`,
            { availableTools: Object.keys(allTools) }
          );
        }

        // Check for API key
        if (!apiKey) {
          return createErrorResponse(
            request.id,
            JSON_RPC_ERRORS.UNAUTHORIZED,
            'WeatherAPI.com API key required',
            { 
              hint: 'Include your API key in the Authorization header: "Bearer your-api-key"',
              signup: 'Get a free API key at https://www.weatherapi.com/signup.aspx'
            }
          );
        }

        // Call the tool
        try {
          const result = await tool(apiKey, args);
          return {
            jsonrpc: '2.0',
            id: request.id,
            result,
          };
        } catch (error) {
          console.error(`❌ Tool "${name}" error:`, error);
          
          if (error instanceof WeatherAPIError) {
            const { code, message, data } = mapWeatherAPIErrorToJSONRPC(error);
            return createErrorResponse(request.id, code, message, data);
          }
          
          // Handle Zod validation errors
          if (error.name === 'ZodError') {
            return createErrorResponse(
              request.id,
              JSON_RPC_ERRORS.INVALID_PARAMS,
              'Invalid input parameters',
              { 
                validationErrors: error.errors,
                hint: 'Check the tool\'s input schema for required parameters'
              }
            );
          }
          
          // Generic error fallback
          return createErrorResponse(
            request.id,
            JSON_RPC_ERRORS.INTERNAL_ERROR,
            'Internal server error',
            { detail: error instanceof Error ? error.message : 'Unknown error' }
          );
        }

      default:
        return createErrorResponse(
          request.id,
          JSON_RPC_ERRORS.METHOD_NOT_FOUND,
          `Method "${request.method}" not found`,
          { availableMethods: ['initialize', 'tools/list', 'tools/call'] }
        );
    }
  } catch (error) {
    console.error('❌ Request handler error:', error);
    return createErrorResponse(
      request.id,
      JSON_RPC_ERRORS.INTERNAL_ERROR,
      'Request processing failed',
      { detail: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

// =============================================================================
// HTTP SERVER
// =============================================================================

const port = parseInt(process.env.PORT ?? '3000', 10);

serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // Health check endpoint for monitoring
    if (url.pathname === '/healthz') {
      return new Response('OK', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Only handle POST requests to /mcp
    if (req.method !== 'POST' || url.pathname !== '/mcp') {
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    try {
      // Extract API key from Authorization header
      const apiKey = extractAPIKey(req);

      // Parse JSON request body
      const body = await req.json() as MCPRequest;
      
      // Validate basic JSON-RPC structure
      if (!body.jsonrpc || body.jsonrpc !== '2.0' || !body.method) {
        const errorResponse = createErrorResponse(
          body.id || null,
          JSON_RPC_ERRORS.INVALID_REQUEST,
          'Invalid JSON-RPC request',
          { hint: 'Request must include jsonrpc: "2.0" and method fields' }
        );
        
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Handle the MCP request
      const response = await handleMCPRequest(body, apiKey);

      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('❌ Request processing error:', error);
      
      const errorResponse = createErrorResponse(
        null,
        JSON_RPC_ERRORS.PARSE_ERROR,
        'Invalid JSON in request body',
        { hint: 'Make sure your request body is valid JSON' }
      );

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
});

console.log(`🌤️ Weather MCP Server listening on port ${port}`);