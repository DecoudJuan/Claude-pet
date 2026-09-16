/*
 * update.js — ¿salió una versión nueva?
 *
 * Es la primera vez que este proyecto toca la red, así que conviene ser
 * explícito sobre qué hace y qué no:
 *
 *   - Un GET a api.github.com/repos/<repo>/releases/latest. Nada más.
 *   - No manda identificadores, ni versión, ni sistema operativo, ni nada
 *     nuestro: es el mismo pedido que haría cualquiera abriendo esa URL. Lo
 *     único que GitHub ve es que alguien preguntó, con la IP de siempre.
 *   - No descarga ni instala nada. Si hay versión nueva te lo dice y te abre la
 *     página de releases; bajar el instalador lo decidís vos.
 *   - Corre en el proceso principal. La ventana tiene `connect-src 'none'` en
 *     la CSP y así se queda: el renderer sigue sin poder hablar con nadie.
 *   - Una vez por día como mucho, y nunca al arranque en frío — ver el retraso
 *     en main.js.
 *
 * Y se apaga. `enabled()` es lo primero que se pregunta y devuelve antes de
 * requerir https siquiera: apagado son cero llamados, no un llamado que se
 * descarta. Se apaga de tres formas, pensadas para tres momentos distintos:
 *
 *   - CLAUDE_PET_NO_UPDATE_CHECK=1 en el ambiente, para que ni la primera
 *     corrida pregunte nada.
 *   - El interruptor del panel de ajustes, que escribe updates:false en pet.json.
 *   - "updates": false a mano en pet.json, para quien despliegue esto en varias
 *     máquinas.
 *
 * Si falla — sin internet, GitHub caído, JSON raro, timeout — devuelve null y
 * no pasa nada. Un adorno no avisa que no pudo fijarse si hay una versión nueva.
 */
'use strict';

const REPO = 'DecoudJuan/Claude-pet';
const API = 'https://api.github.com/repos/' + REPO + '/releases/latest';
const PAGE = 'https://github.com/' + REPO + '/releases/latest';

const DAY_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 6000;
// GitHub corta cualquier respuesta que no esperemos; el JSON de un release son
// unos pocos KB. El techo es contra un servidor que decida mandar un río.
const MAX_BYTES = 512 * 1024;

/* ---------- comparar versiones ---------- */

/*
 * Devuelve -1, 0 o 1. Es semver de andar por casa, que es todo lo que hace
 * falta para comparar dos tags propios.
 *
 * El caso que importa es 1.10.0 contra 1.9.0: comparadas como texto, la 1.10.0
 * es MENOR y el pet no avisaría nunca más de una versión nueva a partir de la
 * décima. Por eso cada tramo se compara como número.
 */
function parse(v) {
  const s = String(v == null ? '' : v).trim().replace(/^v/i, '');
  const cut = s.split(/[-+]/);                     // 1.3.0-beta.2 → 1.3.0
  const nums = cut[0].split('.').map(function (n) {
    const x = parseInt(n, 10);
    return isFinite(x) ? x : 0;
  });
  while (nums.length < 3) nums.push(0);            // 1.3 es 1.3.0
  return { nums: nums.slice(0, 3), pre: cut.length > 1 ? cut[1] : '' };
}

function compare(a, b) {
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) {
    if (x.nums[i] !== y.nums[i]) return x.nums[i] < y.nums[i] ? -1 : 1;
  }
  // Con los tres números iguales, tener sufijo es ser anterior: 1.3.0-beta
  // salió antes que 1.3.0. Dos prelanzamientos distintos se comparan como texto,
  // que alcanza y no se usa en la práctica.
  if (!x.pre && !y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  return x.pre === y.pre ? 0 : (x.pre < y.pre ? -1 : 1);
}

/* ---------- decidir si hay algo que decir ---------- */

/*
 * De la respuesta de GitHub a "hay que avisar o no". Separado del pedido para
 * poder probar los casos raros sin red: un borrador, un prelanzamiento, un tag
 * más viejo que el que tenés corriendo, un JSON sin tag_name.
 */
function pick(current, release) {
  if (!release || typeof release !== 'object') return null;
  if (release.draft || release.prerelease) return null;

  const tag = release.tag_name;
  if (typeof tag !== 'string' || !tag.trim()) return null;
  if (compare(tag, current) <= 0) return null;      // igual o más vieja: nada

  return {
    version: tag.trim().replace(/^v/i, ''),
    name: typeof release.name === 'string' ? release.name : '',
    url: typeof release.html_url === 'string' ? release.html_url : PAGE
  };
}

/* ---------- el interruptor ---------- */

/*
 * Apagado devuelve false ANTES de que check() mire la fecha o cargue https.
 * Que "desactivado" signifique cero tráfico y no tráfico descartado es la
 * diferencia entre una opción y un cartel.
 */
function enabled(conf, env) {
  env = env || process.env;
  if (env.CLAUDE_PET_NO_UPDATE_CHECK) return false;
  return !(conf && conf.updates === false);
}

function due(lastCheck, now) {
  if (!lastCheck || typeof lastCheck !== 'number') return true;
  // Un lastCheck en el futuro es un reloj que se movió: se vuelve a preguntar
  // en vez de quedar esperando hasta que el futuro llegue.
  if (lastCheck > now) return true;
  return now - lastCheck >= DAY_MS;
}

/* ---------- el pedido ---------- */

// Se carga acá adentro y no arriba: apagado, el módulo https ni se toca.
function fetchJson(url, cb) {
  let https;
  try { https = require('https'); } catch (e) { return cb(null); }

  let settled = false;
  const finish = function (value) {
    if (settled) return;
    settled = true;
    cb(value);
  };

  let req;
  try {
    req = https.get(url, {
      headers: {
        // GitHub rechaza los pedidos sin User-Agent. No lleva versión ni nada
        // que identifique la instalación: sólo el nombre del proyecto.
        'User-Agent': 'claude-pet',
        'Accept': 'application/vnd.github+json'
      }
    }, function (res) {
      if (res.statusCode !== 200) { res.resume(); return finish(null); }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', function (d) {
        body += d;
        if (body.length > MAX_BYTES) { req.destroy(); finish(null); }
      });
      res.on('end', function () {
        try { finish(JSON.parse(body)); } catch (e) { finish(null); }
      });
      res.on('error', function () { finish(null); });
    });
  } catch (e) { return finish(null); }

  req.on('error', function () { finish(null); });
  req.setTimeout(TIMEOUT_MS, function () { req.destroy(); finish(null); });
}

/*
 * check(opts, cb) → cb(result)
 *
 * result es null cuando no hay nada que decir, o { version, name, url }. El
 * segundo argumento del callback dice si se llegó a preguntar, para que el que
 * llama sepa si tiene que guardar la fecha.
 *
 * opts.get se puede reemplazar: los tests le pasan uno propio y así toda esta
 * lógica se prueba sin una sola conexión — incluido el caso de que apagado no
 * se llame a nadie, que se verifica contando invocaciones.
 */
function check(opts, cb) {
  opts = opts || {};
  const done = typeof cb === 'function' ? cb : function () {};
  const now = opts.now || Date.now();

  if (!enabled(opts.conf, opts.env)) return done(null, false);
  if (!opts.force && !due(opts.lastCheck, now)) return done(null, false);

  const get = opts.get || fetchJson;
  get(opts.url || API, function (release) {
    let found = null;
    try { found = pick(opts.current, release); } catch (e) { found = null; }
    // asked = true aunque no haya novedad: la fecha se guarda igual, si no
    // preguntaríamos en cada arranque hasta que salga una versión.
    done(found, true);
  });
}

module.exports = {
  API: API,
  PAGE: PAGE,
  DAY_MS: DAY_MS,
  compare: compare,
  parse: parse,
  pick: pick,
  enabled: enabled,
  due: due,
  check: check
};
