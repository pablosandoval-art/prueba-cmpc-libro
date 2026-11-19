import { Catch, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';

interface JsonResponse {
  status(code: number): JsonResponse;
  json(body: unknown): void;
}

const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'El registro ya existe' },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Referencia a un registro inexistente',
  },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Registro no encontrado' },
};

/**
 * Traduce errores conocidos de Prisma a respuestas HTTP coherentes,
 * evitando filtrar detalles internos de la base de datos.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const mapped = PRISMA_ERROR_MAP[exception.code] ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
    };
    host
      .switchToHttp()
      .getResponse<JsonResponse>()
      .status(mapped.status)
      .json({ statusCode: mapped.status, message: mapped.message });
  }
}
