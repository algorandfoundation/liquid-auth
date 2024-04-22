export const INVALID_INPUT_MESSAGE = 'Invalid input';
export const INVALID_RESPONSE_MESSAGE = 'Invalid response';
export const CREDENTIAL_ACTION_FAILURE = 'Credential action failed';
export const UNSIGNED_MESSAGE = 'Message must be signed';
export class ServiceError extends Error {}

export function isValidResponse(r: Response) {
  return r.ok && (r.status === 200 || r.status === 201);
}
