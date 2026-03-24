const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3737';

// In production, use the API_URL directly
// In development, Vite proxy will handle the requests
export async function classifyMessage(message) {
  try {
    const url = import.meta.env.DEV ? '/classifyner' : `${API_BASE}/classifyner`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: JSON.stringify(message),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to classify message');
    }

    return await response.json();
  } catch (error) {
    console.error('NER API Error:', error);
    throw error;
  }
}

export async function getHealth() {
  try {
    const url = import.meta.env.DEV ? '/health' : `${API_BASE}/health`;
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Health check failed:', error);
    return { status: 'down' };
  }
}
