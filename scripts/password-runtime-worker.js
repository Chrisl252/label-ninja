// No routes, data bindings or user inputs. Used only by the local/remote KDF probe.
import { derivePasswordKey, hashPassword, verifyPassword } from '../src/passwords.js';
export default {
  async fetch() {
    const salt = new Uint8Array(16).fill(7);
    const key = await derivePasswordKey('runtime-fixture', salt);
    const hash = await hashPassword('runtime-fixture');
    return Response.json({
      iterations: 600000,
      key: Array.from(key, b => b.toString(16).padStart(2, '0')).join(''),
      roundTrip: await verifyPassword('runtime-fixture', hash),
      rejectsWrong: !(await verifyPassword('wrong-fixture', hash)),
      legacy: await verifyPassword('runtime-fixture', 'pbkdf2$100000$BwcHBwcHBwcHBwcHBwcHBw==$BfchM+c9SkZJARoYYOlyhg5H83EAY0OkQKS2AdMzLiU='),
    });
  },
};
