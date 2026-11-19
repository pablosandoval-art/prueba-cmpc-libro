import { Logger } from '@nestjs/common';

// Las pruebas unitarias no necesitan ver los logs de los servicios (login, auditoría…):
// sólo ensucian la salida. Los tests que verifican un log espían `Logger.prototype`.
Logger.overrideLogger(false);
