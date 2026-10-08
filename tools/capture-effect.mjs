#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// Stop a headless browser and everything it spawned. Chromium can relaunch
// itself, so on Windows anything still using this run's temporary profile
// folder is stopped too; otherwise GPU/renderer processes pile up per run.
function stopBrowser(browser, userDataDir) {
    if (process.platform !== 'win32' || !browser.pid) {
        browser.kill();
        return;
    }
    try { execSync('taskkill /pid ' + browser.pid + ' /T /F', { stdio: 'ignore' }); } catch (err) { browser.kill(); }
    const profileTag = String(userDataDir).split(/[\\/]/).pop();
    const script = "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'msedge|chrome' -and $_.CommandLine -like '*" +
        profileTag + "*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }";
    try {
        execSync('powershell -NoProfile -Command "' + script + '"', { stdio: 'ignore', timeout: 30000 });
    } catch (err) { /* best effort */ }
}

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const host = '127.0.0.1';
const debugPort = Number(process.env.PSYCHEDELIA_CAPTURE_CDP_PORT || (9700 + Math.floor(Math.random() * 300)));
const timeoutMs = Number(process.env.PSYCHEDELIA_CAPTURE_TIMEOUT || 45000);
const effectName = process.argv[2];
const outputPath = process.argv[3] ? resolve(process.argv[3]) : '';
const valuesSource = process.argv[4] === '-' ? process.env.PSYCHEDELIA_CAPTURE_VALUES : process.argv[4];
const values = valuesSource ? JSON.parse(valuesSource) : {};
const captureTime = Number(values.__time);
const hasCaptureTime = Number.isFinite(captureTime) && captureTime >= 0;
const captureSeed = Number(values.__seed);
const hasCaptureSeed = Number.isFinite(captureSeed);
const controlValues = Object.fromEntries(Object.entries(values).filter(function(entry) { return !entry[0].startsWith('__'); }));
const viewport = process.argv[5] ? JSON.parse(process.argv[5]) : { width: 1366, height: 900 };

const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
};

function usage() {
    console.error('Usage: node tools/capture-effect.mjs <effect_name> <output_png> [values_json] [viewport_json]');
    process.exitCode = 1;
}

if (!effectName || !outputPath) usage();

function wait(ms) {
    return new Promise(function(resolveWait) { setTimeout(resolveWait, ms); });
}

function safePath(urlPath) {
    const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const target = resolve(rootDir, clean);
    const rel = relative(rootDir, target);
    if (rel.startsWith('..') || isAbsolute(rel)) return null;
    return target;
}

function startStaticServer() {
    const server = createServer(async function(req, res) {
        try {
            const target = safePath(req.url || '/');
            if (!target) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }
            const data = await readFile(target);
            res.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream' });
            res.end(data);
        } catch (err) {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    return new Promise(function(resolveServer, rejectServer) {
        server.once('error', rejectServer);
        server.listen(0, host, function() {
            const address = server.address();
            resolveServer({
                server,
                url: 'http://' + host + ':' + address.port + '/'
            });
        });
    });
}

function browserCandidates() {
    const env = process.env.BROWSER ? [process.env.BROWSER] : [];
    return env.concat([
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ]);
}

function findBrowser() {
    const found = browserCandidates().find(function(candidate) {
        return candidate && existsSync(candidate);
    });
    if (!found) throw new Error('No Edge/Chrome executable found. Set BROWSER to a Chromium executable path.');
    return found;
}

async function waitForJson(url, deadline) {
    let lastError = null;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
        } catch (err) {
            lastError = err;
        }
        await wait(100);
    }
    throw new Error('Timed out waiting for ' + url + (lastError ? ': ' + lastError.message : ''));
}

function connectWebSocket(wsUrl) {
    return new Promise(function(resolveSocket, rejectSocket) {
        const ws = new WebSocket(wsUrl);
        ws.addEventListener('open', function() { resolveSocket(ws); }, { once: true });
        ws.addEventListener('error', function(event) {
            rejectSocket(new Error('WebSocket connection failed: ' + (event.message || wsUrl)));
        }, { once: true });
    });
}

class CDPClient {
    constructor(ws) {
        this.ws = ws;
        this.nextId = 1;
        this.pending = new Map();
        this.console = [];

        ws.addEventListener('message', (event) => {
            const msg = JSON.parse(event.data);
            if (msg.method === 'Runtime.consoleAPICalled') {
                const args = msg.params && msg.params.args || [];
                this.console.push({
                    type: msg.params && msg.params.type || 'log',
                    text: args.map(arg => arg.value !== undefined ? String(arg.value) : String(arg.description || '')).join(' ')
                });
            } else if (msg.method === 'Runtime.exceptionThrown') {
                const details = msg.params && msg.params.exceptionDetails || {};
                this.console.push({ type: 'exception', text: details.text || 'Runtime exception' });
            }
            if (msg.id && this.pending.has(msg.id)) {
                const pending = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                if (msg.error) pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                else pending.resolve(msg.result || {});
            }
        });
    }

    send(method, params) {
        const id = this.nextId++;
        const payload = JSON.stringify({ id, method, params: params || {} });
        return new Promise((resolveSend, rejectSend) => {
            this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
            this.ws.send(payload);
        });
    }

    close() {
        try { this.ws.close(); } catch (err) { /* noop */ }
    }
}

async function createPage(url) {
    const newUrl = 'http://' + host + ':' + debugPort + '/json/new?' + encodeURIComponent(url);
    let pageInfo;
    try {
        const res = await fetch(newUrl, { method: 'PUT' });
        pageInfo = await res.json();
    } catch (err) {
        const res = await fetch(newUrl);
        pageInfo = await res.json();
    }
    const ws = await connectWebSocket(pageInfo.webSocketDebuggerUrl);
    return new CDPClient(ws);
}

async function evaluate(cdp, expression) {
    const result = await cdp.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true
    });
    if (result.exceptionDetails) {
        const details = result.exceptionDetails;
        throw new Error((details.text || 'Evaluation failed') +
            (details.exception && details.exception.description ? ': ' + details.exception.description : ''));
    }
    return result.result ? result.result.value : undefined;
}

function sampleDiff(a, b) {
    if (!a || !b || !a.samples || !b.samples || a.samples.length !== b.samples.length) return 0;
    let sum = 0;
    for (let i = 0; i < a.samples.length; i++) {
        sum += Math.abs(a.samples[i] - b.samples[i]);
    }
    return sum / a.samples.length / 255;
}

async function canvasStats(cdp) {
    return await evaluate(cdp, `(() => {
        const source = document.getElementById('mainCanvas');
        if (!source) return { error: 'missing canvas' };
        const w = 64, h = 36;
        const sample = document.createElement('canvas');
        sample.width = w;
        sample.height = h;
        const ctx = sample.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(source, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let sum = 0, sumSq = 0, alpha = 0;
        const samples = [];
        for (let i = 0; i < data.length; i += 4) {
            const lum = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
            sum += lum;
            sumSq += lum * lum;
            alpha += data[i + 3] / 255;
            samples.push(data[i], data[i + 1], data[i + 2]);
        }
        const count = data.length / 4;
        return {
            width: source.width,
            height: source.height,
            cssWidth: Math.round(source.getBoundingClientRect().width),
            cssHeight: Math.round(source.getBoundingClientRect().height),
            mean: sum / count,
            variance: Math.max(0, sumSq / count - (sum / count) * (sum / count)),
            alpha: alpha / count,
            samples
        };
    })()`);
}

async function glErrors(cdp) {
    return await evaluate(cdp, `(() => {
        if (!window.Renderer || !Renderer.getGL) return [];
        const gl = Renderer.getGL();
        if (!gl) return [];
        const errors = [];
        for (let i = 0; i < 32; i++) {
            const err = gl.getError();
            if (err === gl.NO_ERROR) break;
            errors.push(err);
        }
        return errors;
    })()`);
}

async function sidebarLayout(cdp) {
    return await evaluate(cdp, `(() => {
        const sidebar = document.getElementById('sidebar');
        const paramsContainer = document.getElementById('paramsContainer');
        if (!sidebar || !paramsContainer) return { available: false };
        const sidebarRect = sidebar.getBoundingClientRect();
        const rows = Array.from(paramsContainer.querySelectorAll('.param-row'));
        let rowOverflowCount = 0;
        let controlOverflowCount = 0;
        let labelOverflowCount = 0;
        let maxOverflow = 0;
        let maxLabelLines = 0;

        function overflowAmount(rect) {
            return Math.max(0, rect.right - sidebarRect.right, sidebarRect.left - rect.left);
        }

        rows.forEach(function(row) {
            const rowOverflow = overflowAmount(row.getBoundingClientRect());
            if (rowOverflow > 1) rowOverflowCount += 1;
            maxOverflow = Math.max(maxOverflow, rowOverflow);

            const label = row.querySelector('label');
            if (label) {
                const labelOverflow = overflowAmount(label.getBoundingClientRect());
                if (labelOverflow > 1) labelOverflowCount += 1;
                maxOverflow = Math.max(maxOverflow, labelOverflow);
                maxLabelLines = Math.max(maxLabelLines, label.getClientRects().length || 1);
            }

            Array.from(row.querySelectorAll('input, select, .slider-wrap, .val-display')).forEach(function(control) {
                const controlOverflow = overflowAmount(control.getBoundingClientRect());
                if (controlOverflow > 1) controlOverflowCount += 1;
                maxOverflow = Math.max(maxOverflow, controlOverflow);
            });
        });

        return {
            available: true,
            viewportWidth: window.innerWidth,
            sidebarWidth: Number(sidebarRect.width.toFixed(2)),
            paramRows: rows.length,
            rowOverflowCount,
            controlOverflowCount,
            labelOverflowCount,
            maxOverflow: Number(maxOverflow.toFixed(2)),
            maxLabelLines,
            pageHorizontalOverflow: Math.max(
                0,
                Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0) - window.innerWidth
            )
        };
    })()`);
}

async function waitForApp(cdp) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const ready = await evaluate(cdp, `(() => {
            const select = document.getElementById('effectSelect');
            return Boolean(document.readyState === 'complete' && window.Renderer && window.EffectRegistry &&
                window.Controls && select && select.options.length > 1 && EffectRegistry.getCurrent &&
                EffectRegistry.getCurrent() && Controls.getParamDefs);
        })()`);
        if (ready) {
            // Tools assert right after a dropdown change, so use the immediate switch.
            await evaluate(cdp, 'window.__psySyncSwitch = true');
            return;
        }
        await wait(100);
    }
    throw new Error('App did not expose Renderer/EffectRegistry before timeout');
}

async function waitForEffect(cdp, name) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const ready = await evaluate(cdp, `(() => {
            if (!window.EffectRegistry || !EffectRegistry.getList) return false;
            return EffectRegistry.getList().some(effect => effect.name === ${JSON.stringify(name)});
        })()`);
        if (ready) return;
        await wait(100);
    }
    throw new Error('Effect did not register before timeout: ' + name);
}

async function runCapture() {
    const staticServer = await startStaticServer();
    const userDataDir = mkdtempSync(join(tmpdir(), 'psychedelia-capture-'));
    const browserPath = findBrowser();
    const args = [
        '--headless=new',
        '--remote-debugging-port=' + debugPort,
        '--user-data-dir=' + userDataDir,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--autoplay-policy=no-user-gesture-required',
        '--window-size=' + Number(viewport.width || 1366) + ',' + Number(viewport.height || 900),
        'about:blank'
    ];

    const browser = spawn(browserPath, args, { stdio: 'ignore' });
    let cdp;
    try {
        const deadline = Date.now() + timeoutMs;
        await waitForJson('http://' + host + ':' + debugPort + '/json/version', deadline);
        cdp = await createPage(staticServer.url);
        await cdp.send('Runtime.enable');
        await cdp.send('Page.enable');
        await cdp.send('Page.bringToFront');
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: Number(viewport.width || 1366),
            height: Number(viewport.height || 900),
            deviceScaleFactor: Number(viewport.deviceScaleFactor || 1),
            mobile: !!viewport.mobile
        });
        await waitForApp(cdp);
        await waitForEffect(cdp, effectName);
        const setup = await evaluate(cdp, `(() => {
            const select = document.getElementById('effectSelect');
            select.value = ${JSON.stringify(effectName)};
            select.dispatchEvent(new Event('change', { bubbles: true }));
            const active = EffectRegistry.getCurrent();
            const switched = !!active && active.name === ${JSON.stringify(effectName)};
            if (Renderer.setAnimSpeed) Renderer.setAnimSpeed(1);
            if (Renderer.resetTime) Renderer.resetTime();
            if (Controls.setValues) Controls.setValues(${JSON.stringify(controlValues)});
            if (${hasCaptureSeed ? 'true' : 'false'} && Renderer.setSeed) {
                Renderer.setSeed(${hasCaptureSeed ? captureSeed : 0}, [0.21, 0.43, 0.67, 0.89]);
            }
            if (${hasCaptureTime ? 'true' : 'false'} && Renderer.setTime) {
                Renderer.setAnimSpeed(0);
                Renderer.setTime(${hasCaptureTime ? captureTime : 0});
            }
            const effect = EffectRegistry.getCurrent();
            return {
                switched,
                effectName: effect && effect.name,
                label: effect && effect.label,
                params: effect && effect.params ? effect.params.length : 0,
                captureTime: ${hasCaptureTime ? captureTime : 'null'},
                values: Controls.getValues ? Controls.getValues() : {}
            };
        })()`);
        await wait(950);
        const before = await canvasStats(cdp);
        await wait(700);
        const after = await canvasStats(cdp);
        const errors = await glErrors(cdp);
        const layout = await sidebarLayout(cdp);
        const diagnostics = await evaluate(cdp, `(() => {
            const effect = EffectRegistry.getCurrent && EffectRegistry.getCurrent();
            return effect && effect.getDiagnostics ? effect.getDiagnostics() : null;
        })()`);
        await cdp.send('Page.bringToFront');
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
        await writeFile(outputPath, Buffer.from(shot.data, 'base64'));
        return {
            ok: setup.switched === true && setup.effectName === effectName &&
                before.alpha > 0.1 && before.mean > 0.003 && before.variance > 0.00002 &&
                (hasCaptureTime || sampleDiff(before, after) > 0.001) && errors.length === 0,
            effect: effectName,
            output: outputPath,
            setup,
            stats: {
                mean: Number(before.mean.toFixed(6)),
                variance: Number(before.variance.toFixed(6)),
                alpha: Number(before.alpha.toFixed(6)),
                changed: Number(sampleDiff(before, after).toFixed(9)),
                glErrors: errors
            },
            console: cdp.console.filter(entry => entry.type === 'error' || entry.type === 'exception'),
            diagnostics,
            layout,
            viewport
        };
    } finally {
        if (cdp) cdp.close();
        stopBrowser(browser, userDataDir);
        staticServer.server.close();
        try { rmSync(userDataDir, { recursive: true, force: true }); } catch (err) { /* noop */ }
    }
}

runCapture().then(function(result) {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
}).catch(function(err) {
    console.error(err.stack || err.message);
    process.exitCode = 1;
});
