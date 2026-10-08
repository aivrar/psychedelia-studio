import { mkdir, writeFile } from 'node:fs/promises';
const artifacts = new URL('./history-artifacts/', import.meta.url);
export async function auditEditHistory(cdp, evaluate) {
    await mkdir(artifacts, { recursive: true });
    const result = await evaluate(cdp, `(${run.toString()})()`);
    await evaluate(cdp, `UIShell.setTab('audio'); document.querySelector('[data-section="links"]').classList.remove('is-collapsed'); document.getElementById('reactLinkParam0').scrollIntoView({block:'center'}); new Promise(r=>setTimeout(r,250))`);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(new URL('suggested-links.png', artifacts), Buffer.from(shot.data, 'base64'));
    await writeFile(new URL('results.json', artifacts), JSON.stringify(result, null, 2));
    return result;
}
async function run() {
    const checks = [], check = (name, ok, detail) => checks.push({ name, ok: !!ok, ...(detail === undefined ? {} : { detail }) });
    const sleep = ms => new Promise(r => setTimeout(r, ms)), same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const fire = async (el, type = 'input') => { el.dispatchEvent(new Event(type, { bubbles: true })); await Promise.resolve(); };
    const click = async id => { document.getElementById(id).click(); await Promise.resolve(); };
    const select = async (id, value) => { const el = document.getElementById(id); el.value = value; await fire(el, 'change'); };
    try {
        for (let i = 0; i < 100 && !EditHistory.getState().ready; i++) await sleep(100);
        check('History initializes after setup restoration', EditHistory.getState().ready);
        EffectRegistry.switchTo('plasma'); MusicControls.refresh(); EditHistory.clear();
        const links = AudioReactor.getLinks();
        check('First visit assigns gentle light and color links', links.filter(l => l.param).length >= 2 && links[0].source === 'kick' && links.every(l => !l.param || Math.abs(l.amount) <= 0.08), links);
        check('Link selectors, source selectors and amounts match defaults', links.every((l, i) => document.getElementById('reactLinkParam' + i).value === l.param && document.getElementById('reactLinkSource' + i).value === l.source && +document.getElementById('reactLinkAmount' + i).value === Math.round(l.amount * 100)));
        const inventory = EffectRegistry.getList().map(e => {
            const def = EffectRegistry.getDefinition(e.name), rows = AudioReactor.getSuggestedLinks(e.name);
            const valid = rows.every(l => !l.param || (def.params.some(p => p.name === l.param && (!p.type || p.type === 'float') && p.audioLink !== false) && !(def.specialize || []).includes(l.param) && !/speed|camera|zoom|rotation|phase|bailout|power/.test(l.param) && Math.abs(l.amount) > 0 && Math.abs(l.amount) <= 0.08));
            check('Safe suggestions: ' + e.name, valid && new Set(rows.filter(l => l.param).map(l => l.param)).size === rows.filter(l => l.param).length);
            return { effect: e.name, links: rows.filter(l => l.param) };
        });
        check('Progressive density effects remain protected', inventory.filter(e => /density|buddhabrot/.test(e.effect)).every(e => !e.links.length));
        const amount = document.getElementById('reactLinkAmount0');
        amount.value = '11'; await fire(amount); amount.value = '18'; await fire(amount); amount.value = '23'; await fire(amount); await fire(amount, 'change');
        check('One slider drag creates one undo step', EditHistory.getState().undo === 1, EditHistory.getState());
        await click('btnUndo'); check('Undo restores the original link amount and UI', same(AudioReactor.getLinks(), links) && +document.getElementById('reactLinkAmount0').value === Math.round(links[0].amount * 100));
        await click('btnRedo'); check('Redo restores the drag result', AudioReactor.getLinks()[0].amount === 0.23);
        await select('reactLinkSource0', 'snare'); await click('btnUndo');
        check('Source edits undo independently', AudioReactor.getLinks()[0].source === links[0].source && EditHistory.getState().redo === 1);
        await select('reactLinkSource0', 'bass'); check('A new edit clears the redo branch', EditHistory.getState().redo === 0);
        const custom = AudioReactor.getLinks();
        EffectRegistry.switchTo('tunnel'); MusicControls.refresh();
        check('New effect chooses its own targets', AudioReactor.getLinks().every(l => !l.param || l.param === 'color_shift'));
        EffectRegistry.switchTo('plasma'); MusicControls.refresh();
        check('Returning preserves customized links', same(AudioReactor.getLinks(), custom));
        await click('reactLinkSuggest'); check('Suggested button restores useful defaults', same(AudioReactor.getLinks(), links));
        await click('btnUndo'); check('Suggested is undoable', same(AudioReactor.getLinks(), custom));
        for (let i = 0; i < 3; i++) await select('reactLinkParam' + i, '');
        const cleared = AudioReactor.getConfiguration(); AudioReactor.setConfiguration(cleared);
        EffectRegistry.switchTo('tunnel'); EffectRegistry.switchTo('plasma'); MusicControls.refresh();
        check('Intentionally cleared links survive save/restore and effect switches', AudioReactor.getLinks().every(l => !l.param));
        AudioReactor.setConfiguration({ settings: cleared.settings, effectLinks: { plasma: ['bass','kick','high'].map(source => ({ param: '', source, amount: 0.5 })) } }); MusicControls.refresh();
        check('Legacy empty links upgrade to useful suggestions', same(AudioReactor.getLinks(), links));
        const customConfig = AudioReactor.getConfiguration(); delete customConfig.linksVersion; customConfig.effectLinks.plasma = custom;
        AudioReactor.setConfiguration(customConfig); check('Legacy customized links are preserved', same(AudioReactor.getLinks(), custom));
        const clearedLegacy = structuredClone(customConfig); clearedLegacy.effectLinks.plasma.forEach(l => { l.param = ''; });
        AudioReactor.setConfiguration(clearedLegacy);
        check('Legacy empty links with customized amounts are preserved', same(AudioReactor.getLinks(), clearedLegacy.effectLinks.plasma));
        AudioReactor.setConfiguration(customConfig);
        EditHistory.clear();
        const base = structuredClone(Controls.getBaseValues()), seed = Renderer.getSeed(), seedVec = Renderer.getSeedVec().slice();
        await click('btnRandomize'); const randomized = structuredClone(Controls.getBaseValues()), randomSeed = Renderer.getSeed();
        check('Randomize is one edit', EditHistory.getState().undo === 1 && !same(base, randomized));
        await click('btnUndo'); check('Randomize undo restores values and random seed', same(base, Controls.getBaseValues()) && Renderer.getSeed() === seed && same(Renderer.getSeedVec(), seedVec));
        await click('btnRedo'); check('Randomize redo restores the exact values and seed', same(randomized, Controls.getBaseValues()) && Renderer.getSeed() === randomSeed);
        EditHistory.clear();
        const range = document.querySelector('[data-param="brightness"] input'); const oldBrightness = Controls.getBaseValues().brightness;
        range.value = oldBrightness > 1 ? '0.5' : '1.4'; await fire(range); await fire(range, 'change');
        const key = (key, extra = {}, target = document.body) => target.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, cancelable: true, ...extra }));
        key('z'); check('Ctrl+Z undoes effect sliders', Controls.getBaseValues().brightness === oldBrightness);
        key('z', { shiftKey: true }); check('Ctrl+Shift+Z redoes', Controls.getBaseValues().brightness !== oldBrightness);
        key('z'); key('y'); check('Ctrl+Y redoes', Controls.getBaseValues().brightness !== oldBrightness);
        const beforeNative = EditHistory.getState();
        const nativeAllowed = key('z', {}, document.getElementById('effectSearch'));
        check('Text fields keep native undo', nativeAllowed && same(beforeNative, EditHistory.getState()));
        EditHistory.clear();
        const preserved = structuredClone(Controls.getBaseValues());
        await select('effectSelect', 'metaballs');
        for (let i = 0; i < 200 && EffectRegistry.getCurrent().name !== 'metaballs'; i++) await sleep(30);
        check('Async effect switch records one step', EffectRegistry.getCurrent().name === 'metaballs' && EditHistory.getState().undo === 1);
        await click('btnUndo'); check('Effect undo restores the previous effect and settings', EffectRegistry.getCurrent().name === 'plasma' && same(preserved, Controls.getBaseValues()) && document.getElementById('effectSelect').value === 'plasma');
        await click('btnRedo'); check('Effect redo works', EffectRegistry.getCurrent().name === 'metaballs');
        EditHistory.clear();
        const spin = document.getElementById('rotSpeed'); spin.value = '0.5'; await fire(spin); await fire(spin, 'change');
        const n = EditHistory.getState().undo; await sleep(550);
        check('Animation does not fill edit history', EditHistory.getState().undo === n);
        await click('btnUndo'); check('Motion controls undo and refresh their UI', Renderer.getRotationSpeed() === 0 && +spin.value === 0);
        await Music.start(); await sleep(200); EditHistory.clear();
        const attack = AudioReactor.getSettings().attack;
        const input = document.getElementById('reactorAttack'); input.value = '75'; await fire(input); await fire(input, 'change');
        const musicBefore = Music.getBeatInfo().beats; await click('btnUndo'); await sleep(100);
        check('Beat fine-tuning undo preserves running music and playhead', Music.isPlaying() && AudioReactor.getSettings().attack === attack && Music.getBeatInfo().beats >= musicBefore);
        Music.stop();
        // The toolbar reset is a compound edit covering FX, overlays and links.
        PostProcess.setEnabled('bloom', true); Overlays.setEnabled('spectrum', true); AudioReactor.setLink(0, {param:'glow', amount:0.2}); EditHistory.clear();
        await click('btnResetLooks'); check('Reset all creates one compound undo step', EditHistory.getState().undo === 1 && !PostProcess.isEnabled('bloom') && !Overlays.isEnabled('spectrum'));
        await click('btnUndo'); check('Undo reset restores FX, overlays and beat links', PostProcess.isEnabled('bloom') && Overlays.isEnabled('spectrum') && AudioReactor.getLinks()[0].amount === 0.2);
        const realRecording = VideoExport.isRecording; VideoExport.isRecording = () => true;
        try { const state = EditHistory.getState(); check('History is locked during export', state.blocked && !EditHistory.undo() && EditHistory.getState().undo === state.undo); } finally { VideoExport.isRecording = realRecording; }
        EditHistory.clear(); await sleep(300); check('Empty history disables both buttons', document.getElementById('btnUndo').disabled && document.getElementById('btnRedo').disabled);
        EffectRegistry.switchTo('kaleidoscope'); EditHistory.clear();
        const palette = document.querySelector('[data-param="palette"] select'), originalPalette = Controls.getBaseValues().palette;
        palette.value = '5'; await fire(palette, 'change'); await click('btnUndo');
        check('Palette changes undo with their selector and swatch', Controls.getBaseValues().palette === originalPalette && +palette.value === originalPalette);
        await click('btnRedo'); check('Palette redo restores the chosen library color scheme', Controls.getBaseValues().palette === 5 && +palette.value === 5);
        const presetEffect = EffectRegistry.getList().find(e => (EffectRegistry.getDefinition(e.name).fractalFlight?.smokePresets?.length || 0) >= 2);
        EffectRegistry.switchTo(presetEffect.name); Controls.applyPreset(0); EditHistory.clear();
        const firstPreset = structuredClone(Controls.getBaseValues()); await select('fractalPresetSelect', '1'); await click('btnUndo');
        check('Preset undo restores parameters and the preset label', same(firstPreset, Controls.getBaseValues()) && document.getElementById('fractalPresetSelect').value === '0');
        await click('btnRedo'); check('Preset redo restores its label', document.getElementById('fractalPresetSelect').value === '1');
        const gain = AudioAnalysis.getFileStatus().gain, gainInput = document.getElementById('audioFileGain');
        gainInput.value = '0.4'; await fire(gainInput); await fire(gainInput, 'change'); await click('btnUndo');
        check('File gain undo restores its value and control', AudioAnalysis.getFileStatus().gain === gain && +gainInput.value === gain);
        // A plain volume edit must not reapply arrangement or unrelated knobs.
        const setSettings = Music.setSettings; let patch = null;
        Music.setSettings = state => { patch = state; return setSettings(state); };
        try {
            const volume = document.getElementById('musicVolume'); volume.value = '-19'; await fire(volume); await fire(volume, 'change'); await click('btnUndo');
            check('Mixer undo updates only the changed setting', patch && Object.keys(patch).join() === 'volume');
        } finally { Music.setSettings = setSettings; }
        EffectRegistry.switchTo('plasma'); AudioReactor.suggestLinks(); MusicControls.refresh();
        return { ok: checks.every(c => c.ok), checks, inventory };
    } catch (error) { return { ok: false, checks, error: error.stack }; }
}
