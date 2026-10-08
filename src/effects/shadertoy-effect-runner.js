/* Psychedelia Studio - Helper for built-in Shadertoy pass graph effects */
var ShadertoyEffectRunner = (function() {
    'use strict';

    function lines(parts) {
        return parts.join('\n');
    }

    function pass(project, id) {
        for (var i = 0; i < project.passes.length; i++) {
            if (project.passes[i].id === id) return project.passes[i];
        }
        return null;
    }

    function baseUniforms() {
        var values = typeof Controls !== 'undefined' && Controls.getValues ? Controls.getValues() : {};
        var uniforms = {};
        for (var key in values) {
            if (Object.prototype.hasOwnProperty.call(values, key)) uniforms[key] = values[key];
        }
        if (typeof Renderer !== 'undefined') {
            if (Renderer.getSeed) uniforms.seed = Renderer.getSeed();
            if (Renderer.getSeedVec) uniforms.seed_vec = Renderer.getSeedVec();
            if (Renderer.getMouse) {
                var mouse = Renderer.getMouse();
                uniforms.mouse_norm = [mouse.x || 0.5, mouse.y || 0.5];
            }
        }
        return uniforms;
    }

    function clearTarget(gl) {
        if (!gl || typeof Renderer === 'undefined') return;
        Renderer.bindFramebuffer(-1);
        var canvas = Renderer.getCanvas();
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function make(options) {
        var graph = null;
        var compileResult = null;
        var glRef = null;
        var lastResetKey = null;

        function dispose() {
            if (graph && graph.dispose) {
                try { graph.dispose(); } catch (err) { /* context resources may already be gone */ }
            }
            graph = null;
            compileResult = null;
            lastResetKey = null;
        }

        function build() {
            if (!glRef || !options.project) return;
            dispose();
            graph = ShadertoyPassGraph.create(glRef, options.project());
            compileResult = graph.compileAll();
            lastResetKey = resetKey();
        }

        function resetKey() {
            if (!options.resetKey) return '';
            var values = typeof Controls !== 'undefined' && Controls.getValues ? Controls.getValues() : {};
            return String(options.resetKey(values));
        }

        function ensure(gl) {
            glRef = gl || glRef || (typeof Renderer !== 'undefined' ? Renderer.getGL() : null);
            if (!graph && glRef) build();
            return graph;
        }

        function uniforms() {
            var result = baseUniforms();
            if (options.uniforms) {
                var extra = options.uniforms(result) || {};
                for (var key in extra) {
                    if (Object.prototype.hasOwnProperty.call(extra, key)) result[key] = extra[key];
                }
            }
            return result;
        }

        return {
            init: function(gl) {
                glRef = gl || glRef;
                build();
            },
            cleanup: dispose,
            reset: function() {
                if (!graph) return;
                graph.reset();
                lastResetKey = resetKey();
            },
            render: function(gl) {
                var g = ensure(gl);
                if (!g || !compileResult || !compileResult.success) {
                    clearTarget(glRef || gl);
                    return;
                }
                var key = resetKey();
                if (key !== lastResetKey) {
                    g.reset();
                    lastResetKey = key;
                }
                if (!g.render({ uniforms: uniforms() })) {
                    compileResult = g.getStatus();
                    clearTarget(glRef || gl);
                }
            },
            getStatus: function() {
                return compileResult;
            },
            getDiagnostics: function() {
                return graph && graph.getDiagnostics ? graph.getDiagnostics() : null;
            },
            getGraph: function() {
                return graph;
            }
        };
    }

    return {
        make: make,
        lines: lines,
        pass: pass
    };
})();
