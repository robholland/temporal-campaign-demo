import { io } from 'socket.io-client';
import type { Email, EmailMsg } from './lib/types';

export async function sendEmail(email: Email): Promise<void> {
  const socket = io("http://localhost:5173/");

  return new Promise((resolve, reject) => {
    socket.emit('email', { email } as EmailMsg, (response: any) => {
      if (response.error) {
        reject(response.error);
      } else {
        resolve();
      }
    });
  });
}