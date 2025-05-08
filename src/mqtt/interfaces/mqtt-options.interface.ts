export interface MqttOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  clientId: string;
  protocol: string;
  qos: number;
  reconnectPeriod: number;
  connectTimeout: number;
  clean: boolean;
  rejectUnauthorized?: boolean;
}

export interface MqttReconnectOptions {
  initialDelay: number;
  maxDelay: number;
  factor: number;
  randomize: boolean;
}
