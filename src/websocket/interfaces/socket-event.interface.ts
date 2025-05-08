export interface SocketEventData {
  [key: string]: any;
}

export interface SocketEvent {
  event: string;
  data: SocketEventData;
  message?: string;
}

export interface SocketEventEmitter {
  emit(userId: string): void;
  emitToDevice(deviceId: string): void;
} 