/* Direct MP4 rendering: explicit length, uploaded-track matching and progress. */
var RenderControls = (function() {
    'use strict';
    var ownsJob = false, resultText = '', completed = false;
    function el(id) { return document.getElementById(id); }
    function durationText(seconds) {
        if (seconds < 60) return (Math.round(seconds * 10) / 10) + ' s';
        var total = Math.round(seconds), minutes = Math.floor(total / 60), rest = total % 60;
        return minutes + ':' + (rest < 10 ? '0' : '') + rest;
    }
    function config() {
        return { lengthMode: el('renderLengthMode').value, duration: Number(el('renderSeconds').value),
            fps: Number(el('fpsSelect').value), audio: el('recAudio').value, quality: el('recQuality').value };
    }
    function sync() {
        var state = VideoExport.getStatus(), busy = VideoExport.isRecording() || VideoExport.isSaving();
        var active = state.directRender, plan = VideoExport.getRenderPlan(config());
        el('renderSecondsRow').classList.toggle('hidden', el('renderLengthMode').value !== 'custom');
        el('btnRenderMP4').disabled = busy || !plan.valid;
        el('btnRenderAudio').disabled = busy;
        el('renderLengthMode').disabled = busy;
        el('renderSeconds').disabled = busy;
        el('renderActions').classList.toggle('hidden', !active);
        el('btnRenderCancel').disabled = !state.recording || state.canceling;
        el('btnRenderStop').disabled = !state.recording || state.frames < 1;
        el('renderProgress').classList.toggle('hidden', !active && !completed);
        el('renderProgress').value = active ? state.progress : completed ? 1 : 0;
        var message = resultText;
        if (active) {
            if (state.canceling) message = 'Canceling soundtrack preparation…';
            else if (state.preparing) message = 'Preparing soundtrack…';
            else if (state.saving) message = 'Finishing MP4…';
            else {
                message = Math.floor(state.progress * 100) + '% · ' + state.frames + ' / ' + state.totalFrames + ' frames';
                if (state.wallElapsed > 1 && state.renderFps > 0) message += ' · ' + Math.round(state.renderFps) + ' frames/s';
                if (state.wallElapsed > 1 && state.remainingSeconds !== null) message += ' · about ' + durationText(state.remainingSeconds) + ' left';
            }
        } else if (!message) {
            if (!plan.valid) message = plan.error;
            else {
                message = durationText(plan.duration) + ' of video at ' + plan.fps + ' FPS.';
                if (plan.lengthMode !== 'custom') {
                    var file = AudioAnalysis.getFileStatus();
                    message += ' ' + (plan.lengthMode === 'audio' ? 'Full track: ' : 'From the current playhead: ') + file.fileName + '.';
                    if (plan.audio !== 'none') message += ' Includes this file as the soundtrack.';
                } else if (plan.audio !== 'none') {
                    message += plan.audioSettings.source === 'studio' ? ' Studio creates a new take.' : ' Audio starts at the current file position.';
                }
            }
        }
        if (el('renderStatus').textContent !== message) el('renderStatus').textContent = message;
    }
    function start() {
        if (VideoExport.isRecording() || VideoExport.isSaving()) return;
        resultText = ''; completed = false;
        ownsJob = VideoExport.renderMP4(Renderer.getCanvas(), config());
        if (!ownsJob) {
            resultText = VideoExport.getLastError();
            if (window.PsychedeliaNotify) window.PsychedeliaNotify(resultText, 'error');
        }
        sync();
    }
    function init() {
        el('btnRenderMP4').addEventListener('click', start);
        el('btnRenderAudio').addEventListener('click', function() { el('audioFileInput').click(); });
        el('btnRenderCancel').addEventListener('click', function() { VideoExport.cancelRender(); sync(); });
        el('btnRenderStop').addEventListener('click', function() { VideoExport.stopRecording(); sync(); });
        ['renderLengthMode', 'renderSeconds', 'fpsSelect', 'recAudio', 'recQuality', 'resSelect'].forEach(function(id) {
            el(id).addEventListener('input', function() { resultText = ''; completed = false; sync(); });
            el(id).addEventListener('change', function() { resultText = ''; completed = false; sync(); });
        });
        AudioAnalysis.onStatusChange(sync);
        window.addEventListener('psychedelia:recording-saved', function(e) {
            if (!ownsJob) return;
            ownsJob = false; completed = true;
            resultText = 'Rendered ' + durationText(e.detail.seconds) + ' · ' + e.detail.frames + ' frames. MP4 saved and added to Gallery.';
            sync();
        });
        window.addEventListener('psychedelia:recording-error', function(e) {
            if (!ownsJob) return;
            ownsJob = false; completed = false; resultText = e.detail.message; sync();
        });
        window.addEventListener('psychedelia:render-canceled', function() {
            if (!ownsJob) return;
            ownsJob = false; completed = false; resultText = 'Render canceled. No video was saved.'; sync();
        });
        window.setInterval(sync, 250);
        sync();
    }
    return { init: init, refresh: sync };
})();
