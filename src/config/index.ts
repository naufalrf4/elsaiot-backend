import appConfig from './app.config';
import authConfig from './auth.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import mqttConfig from './mqtt.config';
import mailConfig from './mail.config';
import throttleConfig from './throttle.config';

export default [
  appConfig, 
  databaseConfig, 
  mqttConfig, 
  jwtConfig, 
  authConfig,
  mailConfig,
  throttleConfig,
];
