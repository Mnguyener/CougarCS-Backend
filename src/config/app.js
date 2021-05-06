import cors from 'cors';
import 'dotenv/config';
import express, { json } from 'express';
import helmet from 'helmet';
import RateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import email from '../api/routes/email';
import events from '../api/routes/event';
import payment from '../api/routes/payment';
import { logger } from '../utils/logger';
import { httpLogger } from '../utils/httpLogger';

const app = express();

const limiter = new RateLimit({
	windowMs: 1 * 60 * 1000,
	max: 10,
});

Sentry.init({
	dsn: process.env.SENTRY_URL,
	integrations: [
		new Sentry.Integrations.Http({ tracing: true }),
		new Tracing.Integrations.Express({
			app,
		}),
	],
});

const corsOptions = {
	origin: 'cougarcs.com',
};

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(limiter);
app.use(cors(corsOptions));
app.use(httpLogger);
app.use(helmet());
app.use(json({ extended: false }));

app.get('/', (req, res) => {
	res.json({ welcome: 'CougarCS Backend 🐯' });
});

app.use('/api/payment', payment);
app.use('/api/send', email);
app.use('/api/events', events);

app.use(Sentry.Handlers.errorHandler());
app.use((req, res) => {
	res.status(500).send('Error!');
});

app.use((err, req, res, next) => {
	logger.error(
		`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method
		} - ${req.ip}`
	);
	next(err);
});

export default app;
