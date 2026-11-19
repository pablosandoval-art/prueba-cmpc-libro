import bcrypt from 'bcrypt';
import { BCRYPT_COST, BcryptPasswordHasher } from './bcrypt-password-hasher.js';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('genera hashes bcrypt con el costo configurado y los verifica', async () => {
    const hash = await hasher.hash('Admin1234!');

    expect(bcrypt.getRounds(hash)).toBe(BCRYPT_COST);
    await expect(hasher.compare('Admin1234!', hash)).resolves.toBe(true);
    await expect(hasher.compare('otra', hash)).resolves.toBe(false);
  });
});
