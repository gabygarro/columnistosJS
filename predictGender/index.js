export default {
  async fetch(request, env, ctx) {
    // Handle CORS for browser requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { name } = await request.json();
      
      if (!name) {
        return new Response(JSON.stringify({ error: 'Name is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Use env.AI directly - no import needed in dashboard editor
      const systemPrompt = `You are a helpful assistant that always responds with valid JSON. 
      Follow this exact schema: { "gender": "string (M|F|CF|X|NB)", "confidence": "number (decimal between 0 and 1)" }
      
      Rules:
      - Always return valid JSON
      - Follow the provided schema exactly
      - Do not include any text outside the JSON object
      - Ensure all required fields are present
      - Consider Latin American and Spanish naming conventions when analyzing names`;

      const userPrompt = `JSON with the format { gender: 'M'|'F'|'CF'|'X'|'NB', confidence: number } where gender is the probable gender of a person with the name "${name}" and confidence is the decimal percentage of gender certainty. 'M' is for male, 'F' for female, 'CF' for a list of people where at least one is female, 'NB' for non-binary person, and 'X' for an organization or entity that is not a person and has no gender. Consider Latin American naming conventions.`;

      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 100,
        temperature: 0.1
      });

      // Parse and validate the JSON response
      let jsonResponse;
      try {
        // Clean the response text (remove any markdown formatting)
        const cleanedResponse = response.response.replace(/```json\n?|\n?```/g, '').trim();
        jsonResponse = JSON.parse(cleanedResponse);
      } catch (parseError) {
        // If parsing fails, return a default response
        console.error('JSON parsing failed:', parseError);
        return new Response(JSON.stringify({ 
          error: 'Invalid JSON response from AI model',
          raw_response: response.response 
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Validate the response structure
      if (!jsonResponse.gender || typeof jsonResponse.confidence !== 'number') {
        return new Response(JSON.stringify({ 
          error: 'Invalid response structure',
          received: jsonResponse 
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      return new Response(JSON.stringify(jsonResponse), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  },
};
