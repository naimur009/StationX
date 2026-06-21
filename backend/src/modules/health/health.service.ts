export interface HealthResponse {
  success: true;
}

export function getHealth(): HealthResponse {
  return { success: true };
}
