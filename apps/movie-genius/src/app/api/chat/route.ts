// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

// --- Configuration ---
// Define the URL of your Python FastAPI backend
const FASTAPI_BASE_URL = 'http://127.0.0.1:8000';
const FASTAPI_ENDPOINT = '/api/chat';

/**
 * Handles GET requests from the frontend to forward them to the FastAPI Agent backend.
 * The frontend will call this endpoint: /api/chat?message=...&session_id=...
 */
export async function GET(request: NextRequest) {
    // 1. Extract parameters from the frontend request URL
    const { searchParams } = new URL(request.url);
    
    // The frontend sends the user's message
    const userMessage = searchParams.get('message');
    // The frontend sends the Session ID (either from storage or a new UUID)
    const sessionId = searchParams.get('session_id');

    // Basic Validation
    if (!userMessage || !sessionId) {
        return NextResponse.json(
            { error: 'Missing required parameters: message or session_id.' },
            { status: 400 }
        );
    }
    
    // 2. Construct the full URL for the FastAPI backend
    // FastAPI expects: ?message=<MSG>&session_id=<USERID> (based on your Python route definition)
    const backendUrl = new URL(FASTAPI_ENDPOINT, FASTAPI_BASE_URL);
    backendUrl.searchParams.set('message', userMessage);
    // Note: We use 'session_id' here if your FastAPI route expects it in the query, 
    // or we could pass it via headers for better practice, but sticking to query params for simplicity here.
    backendUrl.searchParams.set('session_id', sessionId); 

    console.log(`[Next.js Proxy] Forwarding to: ${backendUrl.toString()}`);

    try {
        // 3. Make the GET request to the FastAPI backend
        const response = await fetch(backendUrl, {
            // Optional: Pass headers if needed for authentication (not needed here)
            cache: 'no-store', // Important: Ensures fresh data from the Agent
        });

        // 4. Handle HTTP errors from the FastAPI backend
        if (!response.ok) {
            console.error(`FastAPI Error: ${response.status} - ${response.statusText}`);
            // Attempt to parse the JSON error body from FastAPI
            const errorBody = await response.json().catch(() => ({})); 

            return NextResponse.json(
                { 
                    error: `Agent backend failed: ${response.statusText}`,
                    details: errorBody.response || errorBody.error || "Check FastAPI console."
                },
                { status: response.status }
            );
        }

        // 5. Success: Forward the JSON response from FastAPI back to the frontend
        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Network or communication error:', error);
        return NextResponse.json(
            { error: 'Could not connect to the Python Agent backend service.' },
            { status: 503 } // Service Unavailable
        );
    }
}