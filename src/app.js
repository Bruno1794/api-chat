require('dotenv').config({ override: true });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const errorMiddleware = require('./middlewares/errorMiddleware');
const { createCorsOptions } = require('./config/cors');

const app = express();

app.use(helmet());

app.use(cors(createCorsOptions()));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use(routes);

app.use(errorMiddleware);

module.exports = app;
