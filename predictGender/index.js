export default {
  async fetch(request, env) {
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
      Follow this exact schema: { "gender": "string (M|F|CF|X|NB)" }

      Rules:
      - Always return valid JSON
      - Follow the provided schema exactly
      - Do not include any text outside the JSON object
      - Ensure all required fields are present
      - Consider Latin American and Spanish naming conventions when analyzing names
      - Use 'M' if it is a male name.
      - Use 'F' if it is a female name.
      - Use 'CF' if it is a list of names in spanish, either comma separated or separated by 'y' and at least one of the names is female.
      - Use 'F' if it is a list of names in spanish and all of them are female names.
      - Use 'NB' if it is a traditionally non binary name or you know this person is non binary.
      - Use 'X' if it is an organization or entity that is not a person and has no gender.`;

      const userPrompt = `JSON with the format { gender: 'M'|'F'|'CF'|'X'|'NB' } where gender is the probable gender of a person with the name "${name}".`;

      const response = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
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
      if (!jsonResponse.gender) {
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
