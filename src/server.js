import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import cookieParser from 'cookie-parser';

import contactsRouter from './routes/contacts.js';
import authRouter from './routes/auth.js';

import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { mailer } from './services/email.js';

export function setupServer() {
  const app = express();

  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/_debug/routes', (_req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        // normal route
        routes.push({
          path: middleware.route.path,
          methods: Object.keys(middleware.route.methods),
        });
      } else if (middleware.name === 'router') {
        // mounted router
        middleware.handle.stack.forEach((handler) => {
          const route = handler.route;
          if (route) {
            routes.push({
              path: route.path,
              methods: Object.keys(route.methods),
            });
          }
        });
      }
    });
    res.json(routes);
  });


  app.get('/_debug/smtp', async (_req, res) => {
    try {
      // Nodemailer bağlantı doğrulaması
      await mailer.verify();
      res.json({ ok: true, message: 'SMTP verify passed' });
    } catch (e) {
      res.status(500).json({
        ok: false,
        message: e?.message,
        code: e?.code,
        command: e?.command,
        response: e?.response,
        responseCode: e?.responseCode,
      });
    }
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));
  // Auth rotaları
  app.use('/auth', authRouter);

  // Contacts rotaları
  app.use('/contacts', contactsRouter);

  app.get('/_debug/env-smtp', (_req, res) => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_FROM } = process.env;

    res.json({
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_FROM,
      note: 'Şifreyi güvenlik için göstermiyoruz.',
    });
  });

  // Not found & error handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
