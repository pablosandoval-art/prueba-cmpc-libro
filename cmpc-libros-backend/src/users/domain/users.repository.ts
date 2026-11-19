import type { User } from './user.js';

/** Contrato de persistencia de usuarios (token DI). */
export abstract class UsersRepository {
  abstract findByEmail(email: string): Promise<User | null>;
}
