import { registerAs } from '@nestjs/config';

export default registerAs('mqtt', () => ({
  host: process.env.MQTT_HOST || 'localhost',
  port: parseInt(process.env.MQTT_PORT || '1883', 10),
  wsPort: parseInt(process.env.MQTT_WS_PORT || '9001', 10),
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || '',
  clientId: process.env.MQTT_CLIENT_ID || 'elsaiot-backend',
  protocol: process.env.MQTT_PORT === '8883' ? 'mqtts' : 'mqtt',
  qos: 1,
  topicPrefix: process.env.MQTT_TOPIC_PREFIX || 'elsaiot',
  rejectUnauthorized: process.env.MQTT_REJECT_UNAUTHORIZED !== 'false',
})); 