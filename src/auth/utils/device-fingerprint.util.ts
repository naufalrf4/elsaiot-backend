import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Generates a device fingerprint from request data
 * Combines multiple factors to create a unique identifier for a device/client
 */
export function generateDeviceFingerprint(req: Request): string {
  // Get stable identifying information
  const userAgent = req.headers['user-agent'] || '';
  const ip = getClientIp(req) || '';
  
  // Get any available browser fingerprinting headers
  const acceptHeaders = {
    accept: req.headers['accept'] || '',
    acceptEncoding: req.headers['accept-encoding'] || '',
    acceptLanguage: req.headers['accept-language'] || ''
  };
  
  // Combine all signals
  const fingerprintData = JSON.stringify({
    userAgent,
    ip,
    acceptHeaders
  });
  
  // Create a hash of this data
  return crypto
    .createHash('sha256')
    .update(fingerprintData)
    .digest('hex');
}

/**
 * Extracts the client IP from the request
 * Handles common proxy headers and direct connections
 */
function getClientIp(req: Request): string | undefined {
  // Standard proxy headers
  const xForwardedFor = req.headers['x-forwarded-for'] as string;
  
  if (xForwardedFor) {
    // Get the first IP address from the list
    const ips = xForwardedFor.split(',');
    return ips[0].trim();
  }
  
  // Alternative proxy headers
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'] as string;
  }
  
  // Direct connection
  return req.socket.remoteAddress;
} 