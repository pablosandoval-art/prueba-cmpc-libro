import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/transformers/trim.transformer.js';

export class LoginDto {
  @ApiProperty({ example: 'admin@cmpc.cl' })
  @Trim()
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Admin1234!' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MaxLength(72) // bcrypt sólo considera los primeros 72 bytes
  password: string;
}

export class AuthenticatedUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'admin@cmpc.cl' })
  email: string;

  @ApiProperty({ example: 'Administrador' })
  name: string;
}

/**
 * Sesión iniciada. El token NO viaja en el cuerpo: lo fija la cookie HttpOnly
 * `cmpc_session` (ver `Set-Cookie`), así el JavaScript del navegador nunca lo ve.
 */
export class SessionDto {
  @ApiProperty({ description: 'Expiración del token (ISO 8601)' })
  expiresAt: string;

  @ApiProperty({ type: AuthenticatedUserDto })
  user: AuthenticatedUserDto;
}
