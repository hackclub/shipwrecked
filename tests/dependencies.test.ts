import { expect, test } from 'bun:test';
import { createServer } from 'node:net';
import EmailProvider from 'next-auth/providers/email';
import { createAvatar } from '@dicebear/core';
import { thumbs } from '@dicebear/collection';

// NextAuth 4 still declares Nodemailer 7 as a peer. Verify the actual SMTP
// integration against the patched Nodemailer major without sending real mail.
test('NextAuth email provider sends through Nodemailer 10', async () => {
  let message = '';
  const server = createServer((socket) => {
    let buffer = '';
    let readingData = false;
    socket.write('220 localhost test SMTP\r\n');
    socket.on('data', (data) => {
      buffer += data.toString();
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (readingData) {
          if (line === '.') {
            readingData = false;
            socket.write('250 queued\r\n');
          } else message += line + '\n';
        } else if (line.startsWith('EHLO')) socket.write('250 localhost\r\n');
        else if (line === 'DATA') {
          readingData = true;
          socket.write('354 end with dot\r\n');
        } else if (line === 'QUIT') socket.end('221 bye\r\n');
        else socket.write('250 ok\r\n');
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing SMTP port');
    const provider = EmailProvider({});
    await provider.sendVerificationRequest({
      identifier: 'upgrade@example.invalid',
      url: 'https://shipwrecked.example.invalid/api/auth/callback/email?token=test',
      expires: new Date(Date.now() + 60_000),
      token: 'test',
      provider: {
        ...provider,
        server: { host: '127.0.0.1', port: address.port, secure: false, ignoreTLS: true },
        from: 'test@example.invalid',
      },
      theme: { colorScheme: 'light' },
    });
    expect(message).toContain('To: upgrade@example.invalid');
    expect(message).toContain('Sign in to shipwrecked.example.invalid');
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});

test('matching DiceBear 9 packages still render the existing avatar style', () => {
  const avatar = createAvatar(thumbs, { seed: 'upgrade-check' });
  expect(avatar.toString()).toContain('<svg');
  expect(avatar.toDataUri()).toStartWith('data:image/svg+xml');
});
