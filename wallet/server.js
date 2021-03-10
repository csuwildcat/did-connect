const fs = require('fs-extra');

const Koa = require('koa');
const Router = require('koa-router');
const Logger = require('koa-logger');
const BodyParser = require('koa-body');
const Static = require('koa-static');

const app = new Koa();
const router = new Router();
const PORT = 1337;

// Response to GET requests
router.get('/', async (ctx) => {
  ctx.type = 'html';
  ctx.body = await fs.createReadStream('wallet/index.html');
});

app.use(Static('./'));
app.use(Logger());
app.use(BodyParser());
app.use(router.routes()).use(router.allowedMethods());
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});