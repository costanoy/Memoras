import { describe, expect, it } from 'vitest';
import { aesKey, hashSecret, kekFromCode, normCode, open, openText, randomBytes, seal, sealText, verifySecret } from '../src/lib/crypto';

describe('crypto', () => {
  it('sealText e openText fazem ida e volta', async () => {
    const k = await aesKey(randomBytes(32));
    const blob = await sealText(k, 'Querido diário, ação e coração');
    expect(blob).not.toContain('diário');
    expect(await openText(k, blob)).toBe('Querido diário, ação e coração');
  });

  it('seal e open fazem ida e volta com bytes', async () => {
    const k = await aesKey(randomBytes(32));
    const dados = randomBytes(100);
    expect(Array.from(await open(k, await seal(k, dados)))).toEqual(Array.from(dados));
  });

  it('chave errada falha', async () => {
    const k1 = await aesKey(randomBytes(32)), k2 = await aesKey(randomBytes(32));
    await expect(openText(k2, await sealText(k1, 'segredo'))).rejects.toThrow();
  });

  it('hashSecret e verifySecret: certo e errado', async () => {
    const { salt, hash } = await hashSecret('1234');
    expect(await verifySecret('1234', salt, hash)).toBe(true);
    expect(await verifySecret('4321', salt, hash)).toBe(false);
    expect(await verifySecret('1234', salt, '')).toBe(false);
  });

  it('kekFromCode dá a mesma chave para o mesmo código com espaços e minúsculas', async () => {
    const a = normCode('MEMO-ABCD-EFGH-JKLM');
    const b = normCode('  memo abcd efgh jklm ');
    expect(a).toBe(b);
    const ka = await kekFromCode(a), kb = await kekFromCode(b);
    // As chaves não são exportáveis: prova-se que são iguais cifrando com uma e abrindo com a outra.
    expect(await openText(kb, await sealText(ka, 'ok'))).toBe('ok');
  });
});
