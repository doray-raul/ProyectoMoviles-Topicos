// Base address of the Django API.
// If the API runs on another machine, it can be changed without touching the code
// by creating a .env file with: EXPO_PUBLIC_API_URL=http://192.168.1.50:8000/api
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';
