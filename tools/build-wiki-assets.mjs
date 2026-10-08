#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
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
const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
};

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

// Real application captures in an isolated, disposable browser profile.
// Node 22+ with global WebSocket; BROWSER may point to Chrome or Edge.
const destination = join(rootDir, 'docs', 'wiki');
const mode = process.argv[2] || 'all';
const selectedScene = process.argv[3];
const shots = [];

async function run() {
    await mkdir(join(destination, 'images'), { recursive: true });
    const { server, url } = await startStaticServer();
    const profile = mkdtempSync(join(tmpdir(), 'psychedelia-wiki-'));
    const browser = spawn(findBrowser(), [
        '--headless=new', '--remote-debugging-port=' + debugPort,
        '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check',
        '--disable-background-networking', '--autoplay-policy=no-user-gesture-required',
        '--window-size=1600,1000', 'about:blank'
    ], { stdio: 'ignore' });
    let cdp;
    try {
        await waitForJson('http://' + host + ':' + debugPort + '/json/version', Date.now() + timeoutMs);
        cdp = await createPage(mode === 'live' ? 'https://aivrar.github.io/psychedelia-studio/' : url);
        await cdp.send('Runtime.enable');
        await cdp.send('Page.enable');
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
        const deadline = Date.now() + timeoutMs;
        while (!await evaluate(cdp, `Boolean(window.EditHistory && EditHistory.getState().ready && window.EndlessScenes && EffectRegistry.getList().length >= 104)`)) {
            if (Date.now() > deadline) throw new Error('App startup timed out');
            await wait(150);
        }
        await evaluate(cdp, `window.__psySyncSwitch = true`);
        if (mode === 'live') {
            const report=await evaluate(cdp, `({url:location.href,title:document.title,
                effects:EffectRegistry.getList().length,fx:PostProcess.getEffects().length,
                overlays:Overlays.getDefs().length,palettes:PsyPalettes.count,
                renderer:document.getElementById('gpuBadge').textContent,
                description:document.querySelector('meta[name="description"]')?.content,
                image:document.querySelector('meta[property="og:image"]')?.content,
                appReady:EditHistory.getState().ready})`);
            report.errors=cdp.console.filter(e=>e.type==='error'||e.type==='exception');
            const out=join(rootDir,'.wiki-preview');await mkdir(out,{recursive:true});
            const shot=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true});
            await writeFile(join(out,'live-app.png'),Buffer.from(shot.data,'base64'));
            await writeFile(join(out,'live-app.json'),JSON.stringify(report,null,2));
            console.log(JSON.stringify(report));
            if(!report.appReady||report.effects!==104||report.fx!==39||report.errors.length)throw new Error('Published app verification failed');
            return;
        }
        const inventory = await evaluate(cdp, `({
            effects: EffectRegistry.getList().map(e => { const d = EffectRegistry.getDefinition(e.name); return {
                name:d.name, label:d.label, category:d.category, description:d.description,
                params:d.params, fractalFlight:d.fractalFlight, cpuFallback:!!d.cpuRender
            }; }),
            fx:PostProcess.getEffects().map(d => ({name:d.name,label:d.label,category:d.category,description:d.hint,params:Object.entries(d.paramDefs).map(([name,p])=>({name,...p}))})),
            overlays:Overlays.getDefs(), palettes:PsyPalettes.list, endless:EndlessScenes.names,
            genres:Music.getGenreList().map(name=>({name,label:Music.getGenreLabel(name)})),
            scales:Music.getScaleList(), instruments:Music.getInstrumentList(),
            reactorSources:AudioReactor.getSources(),reactorDefaults:AudioReactor.getDefaults()
        })`);
        await writeFile(join(destination, 'catalog.json'), JSON.stringify(inventory, null, 2) + '\n');
        console.log('Inventory: ' + inventory.effects.length + ' effects, ' + inventory.fx.length + ' FX, ' + inventory.overlays.length + ' overlays, ' + inventory.palettes.length + ' palettes');
        if (mode === 'inventory') return;
        if (mode === 'social') {
            await cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:640,deviceScaleFactor:1,mobile:false});
            await cdp.send('Page.navigate',{url:url+'.github/social-preview.html'});
            await wait(700);
            await evaluate(cdp,'document.fonts.ready');
            const shot=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:92,fromSurface:true});
            const bytes=Buffer.from(shot.data,'base64');
            if(bytes.length>=1000000)throw new Error('Social preview exceeds GitHub size limit');
            await writeFile(join(rootDir,'.github','social-preview.jpg'),bytes);
            console.log('Captured 1280x640 social preview ('+bytes.length+' bytes).');
            return;
        }
        if (mode === 'review') {
            const review=join(rootDir,'.wiki-preview');
            const reports=[];
            for (const name of ['README','Home','Rendering-and-Recording','Effects-Fractals','Palette-Reference']) {
                await cdp.send('Page.navigate',{url:url+'.wiki-preview/'+name+'.html'});
                await wait(700);
                const report=await evaluate(cdp, `({page:${JSON.stringify(name)},title:document.title,
                    brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),
                    horizontalOverflow:document.documentElement.scrollWidth>innerWidth})`);
                if(!report.title || report.brokenImages.length || report.horizontalOverflow) throw new Error(JSON.stringify(report));
                reports.push(report);
                const shot=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true});
                await writeFile(join(review,name+'.png'),Buffer.from(shot.data,'base64'));
            }
            await writeFile(join(review,'review.json'),JSON.stringify(reports,null,2));
            console.log('Reviewed five rendered documentation pages.');
            return;
        }

        async function scene(name, values = {}, time = 8, width = 1280, height = 720) {
            await evaluate(cdp, `(() => {
                for (const scope of ['fx','overlays','reactor']) Looks.setAuto(scope,'off');
                PostProcess.resetAll(); Overlays.resetAll();
                AudioReactor.applyPreset('off'); AudioReactor.set('enabled',false);
                EffectRegistry.switchTo(${JSON.stringify(name)});
                Controls.setValues(${JSON.stringify(values)});
                for(let i=0;i<3;i++) AudioReactor.setLink(i,{param:''});
                Renderer.setSeed(0,[.31,.61,.83,.21]);
                Renderer.setResolution(${width},${height}); Renderer.setQualityMode('full');
                Renderer.setMaxPreviewFps(0); Renderer.setLoopEnabled(false);
                Renderer.setRotation(0); Renderer.setRotationSpeed(0);
                Renderer.setViewZoom(1); Renderer.setViewZoomDepth(0);
                Renderer.setAnimSpeed(0); Renderer.setTime(${time});
                Renderer.clearInputPriority(); Renderer.play();
                const select=document.getElementById('effectSelect'); select.value=${JSON.stringify(name)};
                UIShell.updateEffectMeta();
            })()`);
            await wait(450);
        }
        async function canvas(file, name, values = {}, time = 8, width = 1280, height = 720) {
            await scene(name, values, time, width, height);
            const png = await evaluate(cdp, `new Promise((resolve,reject) => {
                const original = Overlays.render; let frames = 2;
                const timeout = setTimeout(() => { Overlays.render=original; reject(new Error('Capture timeout')); },30000);
                Overlays.render = function() {
                    original.apply(this,arguments);
                    if (--frames <= 0) {
                        Overlays.render=original; clearTimeout(timeout);
                        const source=Renderer.getCanvas(), copy=document.createElement('canvas');
                        copy.width=source.width; copy.height=source.height;
                        copy.getContext('2d').drawImage(source,0,0);
                        resolve(copy.toDataURL('image/png').split(',')[1]);
                    }
                };
                Renderer.clearInputPriority(); Renderer.play();
            })`);
            await writeFile(join(destination, 'images', file), Buffer.from(png, 'base64'));
            shots.push({file, effect:name, values, time, width, height, seed:0, seedVector:[.31,.61,.83,.21]});
            console.log('Captured ' + file);
        }
        async function panel(file, tab, focus) {
            await evaluate(cdp, `(() => {
                UIShell.setTab(${JSON.stringify(tab)});
                if (${JSON.stringify(focus || '')}) {
                    const el=document.querySelector(${JSON.stringify(focus || 'body')});
                    if (!el) throw new Error('Missing capture panel');
                    el.classList.remove('is-collapsed'); el.scrollIntoView({block:'start'});
                }
            })()`);
            await wait(550);
            const shot = await cdp.send('Page.captureScreenshot', {format:'png',fromSurface:true});
            await writeFile(join(destination,'images',file),Buffer.from(shot.data,'base64'));
            const state=await evaluate(cdp, `({effect:EffectRegistry.getCurrent().name,values:Controls.getBaseValues()})`);
            shots.push({file,tab,focus:focus || null,width:1600,height:1000,...state});
            console.log('Captured ' + file);
        }
        if (mode === 'all' || mode === 'scenes') {
            const selectedPresets = {menger_citadel:1,recursive_cathedral:2,fractal_canyon:1,infinite_lattice:1,crystal_geode:5,golden_hour_clouds:3,planet_sunrise:5,robot_foundry:1};
            for (const name of inventory.endless) {
                const recipe=inventory.effects.find(e=>e.name===name).fractalFlight.smokePresets[selectedPresets[name]];
                if (!selectedScene || name === selectedScene) await canvas(name.replaceAll('_','-') + '.png', name,recipe.values);
            }
            if (!selectedScene) {
                for (const name of ['mandelbulb_flight','kaleidoscope','nebula','liquid_chrome','glow_lab']) {
                    if (inventory.effects.some(e => e.name === name)) await canvas(name.replaceAll('_','-') + '.png',name);
                }
            }
        }
        if (mode === 'hero') {
            await canvas('hero.png', selectedScene || 'glow_lab', {mode:2,palette:15,glow:1.5,twist:1.3,detail:90}, 8, 2560, 1440);
        }
        if (mode === 'all' || mode === 'panels') {
            const preset=(name,index)=>inventory.effects.find(e=>e.name===name).fractalFlight.smokePresets[index].values;
            await scene('mandelbulb_flight', {palette:1,glow:1.15}, 8);
            await panel('studio-overview-mandelbulb.png','effect');
            await scene('recursive_cathedral',preset('recursive_cathedral',2),8);
            await panel('render-mp4-cathedral.png','output');
            await scene('glow_lab',{mode:2,palette:15,glow:1.5,twist:1.3,detail:90},8);
            await panel('fx-shuffle-wormhole.png','fx');
            await scene('kaleidoscope',{palette:1},8);
            await panel('overlays-kaleidoscope.png','overlay');
            await scene('golden_hour_clouds',preset('golden_hour_clouds',3),8);
            await panel('audio-studio-clouds.png','audio');
            await scene('nebula',{},8);
            await evaluate(cdp, `AudioReactor.applyPreset('club'); AudioReactor.set('enabled',true); AudioReactor.suggestLinks(); document.getElementById('reactorPreset').value='club'; document.getElementById('reactorPreset').dispatchEvent(new Event('change',{bubbles:true}));`);
            await panel('beat-reactor-nebula.png','audio','[data-section="reactor"]');
            await panel('beat-fine-tune-nebula.png','audio','[data-section="reactor-fine-tune"]');
            await scene('crystal_geode',preset('crystal_geode',5),8);
            await evaluate(cdp,'AudioReactor.suggestLinks()');
            await panel('parameter-links-geode.png','audio','[data-section="links"]');
            await scene('planet_sunrise',preset('planet_sunrise',5),8);
            await panel('audio-source-planet.png','audio','[data-section="audio-source"]');
            await scene('liquid_chrome',{},8);
            await panel('music-mixer-chrome.png','audio','[data-section="mixer"]');
            await scene('menger_citadel',preset('menger_citadel',1),8);
            await evaluate(cdp, `Setups.save('Glacial Megacity')`);
            await panel('saved-setups-citadel.png','audio');
            await scene('menger_citadel',{palette:2},8);
            await evaluate(cdp, `Timeline.addCurrentAsClip()`);
            await scene('crystal_geode',{},8);
            await evaluate(cdp, `Timeline.addCurrentAsClip(); TimelineUI.toggle()`);
            await panel('timeline.png','effect');
            await evaluate(cdp, `TimelineUI.toggle()`);
            await scene('shadertoy_lab',{},8);
            await panel('shadertoy-lab.png','effect');
            const structure = await evaluate(cdp, `Array.from(document.querySelectorAll('#sidebar [id]')).map(e=>({id:e.id,tag:e.tagName,cls:e.className,text:e.tagName==='SECTION'?e.textContent.slice(0,100):undefined}))`);
            await writeFile(join(destination,'ui-capture-map.json'),JSON.stringify(structure,null,2));
        }
        const errors = cdp.console.filter(e => e.type === 'error' || e.type === 'exception');
        await writeFile(join(destination,'capture-' + mode + '.json'), JSON.stringify({shots,errors},null,2) + '\n');
        if (errors.length) throw new Error(JSON.stringify(errors));
    } finally {
        if (cdp) cdp.close();
        stopBrowser(browser, profile);
        server.close();
        const full=resolve(profile), parent=resolve(tmpdir());
        const rel=relative(parent,full);
        if (!rel.startsWith('psychedelia-wiki-') || rel.includes('/') || rel.includes('\\') || isAbsolute(rel)) {
            throw new Error('Refusing to clean unexpected browser profile path');
        }
        try { rmSync(full, {recursive:true,force:true}); } catch { /* Browser may still be releasing files. */ }
    }
}
run().catch(error => { console.error(error); process.exitCode=1; });
