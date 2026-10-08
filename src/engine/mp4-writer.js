/* Psychedelia Studio - minimal MP4 writer for WebCodecs output
 * Muxes H.264 video (avcC) and optional AAC audio into a regular MP4 with
 * the index (moov) in front, so files open and seek immediately. Sample
 * offsets are 64-bit, so recordings larger than 4 GB work.
 *
 *   var w = Mp4Writer.create({ width: 1920, height: 1080, audio: true });
 *   w.addVideo(chunk, meta);          // EncodedVideoChunk (+ metadata)
 *   w.addAudio(chunk, meta);          // EncodedAudioChunk (+ metadata)
 *   var blob = w.finish();            // video/mp4
 * Timestamps are microseconds; the writer makes each track start at 0.
 */
var Mp4Writer = (function() {
    'use strict';

    var VIDEO_TIMESCALE = 90000;

    // Growable big-endian byte writer.
    function Bytes() {
        this.buf = new Uint8Array(4096);
        this.dv = new DataView(this.buf.buffer);
        this.len = 0;
    }
    Bytes.prototype.ensure = function(n) {
        if (this.len + n <= this.buf.length) return;
        var nb = new Uint8Array(Math.max(this.buf.length * 2, this.len + n));
        nb.set(this.buf.subarray(0, this.len));
        this.buf = nb;
        this.dv = new DataView(nb.buffer);
    };
    Bytes.prototype.u8 = function(v) { this.ensure(1); this.dv.setUint8(this.len, v & 0xff); this.len += 1; };
    Bytes.prototype.u16 = function(v) { this.ensure(2); this.dv.setUint16(this.len, v & 0xffff); this.len += 2; };
    Bytes.prototype.u24 = function(v) { this.u8(v >>> 16); this.u16(v & 0xffff); };
    Bytes.prototype.u32 = function(v) { this.ensure(4); this.dv.setUint32(this.len, v >>> 0); this.len += 4; };
    Bytes.prototype.i32 = function(v) { this.ensure(4); this.dv.setInt32(this.len, v | 0); this.len += 4; };
    Bytes.prototype.u64 = function(v) { this.u32(Math.floor(v / 4294967296)); this.u32(v % 4294967296); };
    Bytes.prototype.str = function(s) { for (var i = 0; i < s.length; i++) this.u8(s.charCodeAt(i)); };
    Bytes.prototype.bytes = function(a) { this.ensure(a.length); this.buf.set(a, this.len); this.len += a.length; };
    Bytes.prototype.zeros = function(n) { this.ensure(n); for (var i = 0; i < n; i++) this.buf[this.len + i] = 0; this.len += n; };
    Bytes.prototype.box = function(type, fn) {
        var start = this.len;
        this.u32(0);
        this.str(type);
        fn.call(this);
        this.dv.setUint32(start, this.len - start);
    };
    Bytes.prototype.full = function(type, version, flags, fn) {
        this.box(type, function() { this.u8(version); this.u24(flags); fn.call(this); });
    };
    Bytes.prototype.result = function() { return this.buf.slice(0, this.len); };

    var MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000];

    function toBytes(desc) {
        if (!desc) return null;
        if (desc instanceof Uint8Array) return desc;
        if (desc instanceof ArrayBuffer) return new Uint8Array(desc);
        if (ArrayBuffer.isView(desc)) return new Uint8Array(desc.buffer, desc.byteOffset, desc.byteLength);
        return null;
    }

    function chunkBytes(chunk) {
        var data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        return data;
    }

    function create(opts) {
        var video = { samples: [], config: null, width: opts.width, height: opts.height, base: null };
        var audio = opts.audio ? { samples: [], config: null, sampleRate: 48000, channels: 2, base: null } : null;
        // Sample data goes into Blobs every few MB, so the browser can keep long
        // recordings on disk instead of in page memory. Samples are stored in
        // arrival order (audio and video arrive interleaved in real time) and
        // each sample remembers its offset inside the data block.
        var SPILL_BYTES = 32 * 1048576;
        var stored = [], pending = [], pendingBytes = 0;
        var bytes = 0;
        function store(data) {
            var off = bytes;
            pending.push(data);
            pendingBytes += data.length;
            bytes += data.length;
            if (pendingBytes >= SPILL_BYTES) {
                stored.push(new Blob(pending));
                pending = [];
                pendingBytes = 0;
            }
            return off;
        }

        function addVideo(chunk, meta) {
            if (meta && meta.decoderConfig && meta.decoderConfig.description && !video.config) {
                video.config = toBytes(meta.decoderConfig.description).slice();
            }
            if (video.base === null) video.base = chunk.timestamp;
            var data = chunkBytes(chunk);
            video.samples.push({ pts: chunk.timestamp - video.base, key: chunk.type === 'key', size: data.length, off: store(data), dur: chunk.duration || 0 });
        }

        function addAudio(chunk, meta) {
            if (!audio) return;
            if (meta && meta.decoderConfig) {
                if (meta.decoderConfig.description && !audio.config) audio.config = toBytes(meta.decoderConfig.description).slice();
                if (meta.decoderConfig.sampleRate) audio.sampleRate = meta.decoderConfig.sampleRate;
                if (meta.decoderConfig.numberOfChannels) audio.channels = meta.decoderConfig.numberOfChannels;
            }
            if (audio.base === null) audio.base = chunk.timestamp;
            var data = chunkBytes(chunk);
            audio.samples.push({ pts: chunk.timestamp - audio.base, key: true, size: data.length, off: store(data), dur: chunk.duration || 0 });
        }

        // Per-track timing in the track timescale: decode times, durations and
        // composition offsets (non-zero only if the encoder reorders frames).
        function timing(track, timescale, fallbackDur, endTimeUs) {
            var s = track.samples;
            var n = s.length;
            var pts = s.map(function(x) { return Math.round(x.pts * timescale / 1e6); });
            var sorted = pts.slice().sort(function(a, b) { return a - b; });
            var reordered = false;
            for (var i = 0; i < n; i++) if (pts[i] !== sorted[i]) { reordered = true; break; }
            var dts = reordered ? sorted : pts;
            var durs = [];
            var last = reordered ? s[pts.indexOf(sorted[n - 1])] : s[n - 1];
            var lastDur = last && last.dur ? Math.round(last.dur * timescale / 1e6) : fallbackDur;
            if (endTimeUs !== undefined && n) lastDur = Math.max(1, Math.round(endTimeUs * timescale / 1e6) - sorted[n - 1]);
            for (var j = 0; j < n; j++) {
                // The final sample has no successor. Its own duration (or the
                // configured frame rate) must not inherit a preceding dropped-frame gap.
                var d = j + 1 < n ? dts[j + 1] - dts[j] : lastDur;
                durs.push(Math.max(1, d));
            }
            var ctts = reordered ? pts.map(function(p, k) { return p - dts[k]; }) : null;
            var total = durs.reduce(function(a, b) { return a + b; }, 0);
            return { durs: durs, ctts: ctts, total: total };
        }

        function writeStbl(b, track, t, offsets, isVideo) {
            b.box('stbl', function() {
                b.full('stsd', 0, 0, function() {
                    b.u32(1);
                    if (isVideo) {
                        b.box('avc1', function() {
                            b.zeros(6); b.u16(1);
                            b.u16(0); b.u16(0); b.zeros(12);
                            b.u16(track.width); b.u16(track.height);
                            b.u32(0x00480000); b.u32(0x00480000);
                            b.u32(0); b.u16(1);
                            b.zeros(32);
                            b.u16(0x0018); b.u16(0xffff);
                            b.box('avcC', function() { b.bytes(track.config || new Uint8Array(0)); });
                        });
                    } else {
                        b.box('mp4a', function() {
                            b.zeros(6); b.u16(1);
                            b.zeros(8);
                            b.u16(track.channels); b.u16(16);
                            b.u16(0); b.u16(0);
                            b.u32(track.sampleRate * 65536);
                            b.full('esds', 0, 0, function() {
                                var asc = track.config || new Uint8Array([0x11, 0x90]);
                                // ES_Descriptor > DecoderConfigDescriptor > DecoderSpecificInfo, SLConfig
                                b.u8(0x03); b.u8(23 + asc.length);
                                b.u16(0); b.u8(0);
                                b.u8(0x04); b.u8(15 + asc.length);
                                b.u8(0x40); b.u8(0x15); b.u24(0);
                                b.u32(0); b.u32(0);
                                b.u8(0x05); b.u8(asc.length); b.bytes(asc);
                                b.u8(0x06); b.u8(1); b.u8(0x02);
                            });
                        });
                    }
                });
                // stts: run-length encoded durations
                var runs = [];
                t.durs.forEach(function(d) {
                    if (runs.length && runs[runs.length - 1][1] === d) runs[runs.length - 1][0]++;
                    else runs.push([1, d]);
                });
                b.full('stts', 0, 0, function() {
                    b.u32(runs.length);
                    runs.forEach(function(r) { b.u32(r[0]); b.u32(r[1]); });
                });
                if (t.ctts) {
                    b.full('ctts', 1, 0, function() {
                        b.u32(t.ctts.length);
                        t.ctts.forEach(function(c) { b.u32(1); b.i32(c); });
                    });
                }
                if (isVideo) {
                    var keys = [];
                    track.samples.forEach(function(s, i) { if (s.key) keys.push(i + 1); });
                    if (keys.length && keys.length < track.samples.length) {
                        b.full('stss', 0, 0, function() {
                            b.u32(keys.length);
                            keys.forEach(function(k) { b.u32(k); });
                        });
                    }
                }
                b.full('stsc', 0, 0, function() { b.u32(1); b.u32(1); b.u32(1); b.u32(1); });
                b.full('stsz', 0, 0, function() {
                    b.u32(0);
                    b.u32(track.samples.length);
                    track.samples.forEach(function(s) { b.u32(s.size); });
                });
                b.full('co64', 0, 0, function() {
                    b.u32(offsets.length);
                    offsets.forEach(function(o) { b.u64(o); });
                });
            });
        }

        function writeTrak(b, id, track, timescale, t, offsets, isVideo) {
            var durMs = Math.round(t.total / timescale * 1000);
            b.box('trak', function() {
                b.full('tkhd', 0, 3, function() {
                    b.u32(0); b.u32(0); b.u32(id); b.u32(0); b.u32(durMs);
                    b.zeros(8); b.u16(0); b.u16(0);
                    b.u16(isVideo ? 0 : 0x0100); b.u16(0);
                    MATRIX.forEach(function(m) { b.u32(m); });
                    b.u32(isVideo ? track.width * 65536 : 0);
                    b.u32(isVideo ? track.height * 65536 : 0);
                });
                b.box('mdia', function() {
                    b.full('mdhd', 0, 0, function() {
                        b.u32(0); b.u32(0); b.u32(timescale); b.u32(t.total);
                        b.u16(0x55c4); b.u16(0);
                    });
                    b.full('hdlr', 0, 0, function() {
                        b.u32(0); b.str(isVideo ? 'vide' : 'soun'); b.zeros(12);
                        b.str(isVideo ? 'VideoHandler' : 'SoundHandler'); b.u8(0);
                    });
                    b.box('minf', function() {
                        if (isVideo) b.full('vmhd', 0, 1, function() { b.u16(0); b.zeros(6); });
                        else b.full('smhd', 0, 0, function() { b.u16(0); b.u16(0); });
                        b.box('dinf', function() {
                            b.full('dref', 0, 0, function() {
                                b.u32(1);
                                b.full('url ', 0, 1, function() {});
                            });
                        });
                        writeStbl(b, track, t, offsets, isVideo);
                    });
                });
            });
        }

        function buildMoov(vt, at, vOff, aOff) {
            var b = new Bytes();
            var durMs = Math.max(Math.round(vt.total / VIDEO_TIMESCALE * 1000), at ? Math.round(at.total / audio.sampleRate * 1000) : 0);
            b.box('moov', function() {
                b.full('mvhd', 0, 0, function() {
                    b.u32(0); b.u32(0); b.u32(1000); b.u32(durMs);
                    b.u32(0x00010000); b.u16(0x0100); b.zeros(10);
                    MATRIX.forEach(function(m) { b.u32(m); });
                    b.zeros(24);
                    b.u32(at ? 3 : 2);
                });
                writeTrak(b, 1, video, VIDEO_TIMESCALE, vt, vOff, true);
                if (at) writeTrak(b, 2, audio, audio.sampleRate, at, aOff, false);
            });
            return b.result();
        }

        function finish(videoEndUs) {
            if (!video.samples.length || !video.config || !video.config.length) throw new Error('MP4 is missing H.264 frames or decoder configuration.');
            var vt = timing(video, VIDEO_TIMESCALE, Math.round(VIDEO_TIMESCALE / (opts.fps || 30)), videoEndUs);
            // Audio keeps running for a moment after the last frame; end both together.
            if (audio) {
                var videoEndUs = vt.total / VIDEO_TIMESCALE * 1e6;
                audio.samples = audio.samples.filter(function(x) { return x.pts < videoEndUs; });
            }
            var hasAudio = !!(audio && audio.samples.length);
            var at = hasAudio ? timing(audio, audio.sampleRate, 1024) : null;

            var ftyp = new Bytes();
            ftyp.box('ftyp', function() {
                ftyp.str('isom'); ftyp.u32(0x200);
                ftyp.str('isom'); ftyp.str('iso2'); ftyp.str('avc1'); ftyp.str('mp41');
            });
            var ftypBytes = ftyp.result();

            function offsetsFor(dataStart) {
                return {
                    v: video.samples.map(function(x) { return dataStart + x.off; }),
                    a: hasAudio ? audio.samples.map(function(x) { return dataStart + x.off; }) : []
                };
            }
            // The moov size does not depend on the offset values (all 64-bit),
            // so build once to measure, then again with the real offsets.
            var probe = offsetsFor(0);
            var moovSize = buildMoov(vt, at, probe.v, probe.a).length;
            var dataStart = ftypBytes.length + moovSize + 16;
            var real = offsetsFor(dataStart);
            var moov = buildMoov(vt, at, real.v, real.a);

            var mdat = new Bytes();
            mdat.u32(1); mdat.str('mdat'); mdat.u64(16 + bytes);

            var parts = [ftypBytes, moov, mdat.result()].concat(stored, pending);
            return new Blob(parts, { type: 'video/mp4' });
        }

        return {
            addVideo: addVideo,
            addAudio: addAudio,
            finish: finish,
            getBytes: function() { return bytes; },
            getFrameCount: function() { return video.samples.length; }
        };
    }

    return { create: create };
})();
