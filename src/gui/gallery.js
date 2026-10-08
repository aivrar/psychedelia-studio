/* Psychedelia Studio - Gallery */
var Gallery = (function() {
    'use strict';

    var videos = []; // { blob, url, filename, meta }

    function addVideo(blob, filename, meta) {
        var url = URL.createObjectURL(blob);
        videos.push({
            blob: blob,
            url: url,
            filename: filename,
            meta: meta || {}
        });
    }

    function show() {
        var grid = document.getElementById('galleryGrid');
        grid.querySelectorAll('video').forEach(function(video) { video.pause(); video.removeAttribute('src'); video.load(); });
        grid.innerHTML = '';

        if (videos.length === 0) {
            var empty = document.createElement('p');
            empty.style.cssText = 'color: var(--text-dim); padding: 40px; text-align: center; grid-column: 1/-1;';
            empty.textContent = 'No recordings yet. Hit the record button to create your first video!';
            grid.appendChild(empty);
        }

        videos.forEach(function(v, i) {
            var item = document.createElement('div');
            item.className = 'gallery-item';

            var video = document.createElement('video');
            video.src = v.url;
            video.muted = true;
            video.loop = true;
            video.preload = 'metadata';
            video.addEventListener('mouseenter', function() { var play = video.play(); if (play) play.catch(function() {}); });
            video.addEventListener('mouseleave', function() { video.pause(); video.currentTime = 0; });

            var meta = document.createElement('div');
            meta.className = 'gallery-meta';
            var filename = document.createElement('strong');
            filename.textContent = v.filename;
            meta.appendChild(filename);
            if (v.meta.effect) {
                meta.appendChild(document.createElement('br'));
                meta.appendChild(document.createTextNode('Effect: ' + v.meta.effect));
            }

            var actions = document.createElement('div');
            actions.style.cssText = 'padding: 4px 10px 8px; display: flex; gap: 6px;';

            var dlBtn = document.createElement('button');
            dlBtn.className = 'sm-btn';
            dlBtn.textContent = 'Download';
            dlBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                var a = document.createElement('a');
                a.href = v.url;
                a.download = v.filename;
                a.click();
            });

            var delBtn = document.createElement('button');
            delBtn.className = 'sm-btn';
            delBtn.textContent = 'Delete';
            delBtn.style.color = '#ff4466';
            delBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                URL.revokeObjectURL(v.url);
                videos.splice(i, 1);
                show(); // Refresh
            });

            actions.appendChild(dlBtn);
            actions.appendChild(delBtn);

            item.appendChild(video);
            item.appendChild(meta);
            item.appendChild(actions);
            grid.appendChild(item);
        });

        document.getElementById('galleryModal').classList.remove('hidden');
    }

    function hide() {
        document.querySelectorAll('#galleryGrid video').forEach(function(video) { video.pause(); });
        document.getElementById('galleryModal').classList.add('hidden');
    }

    function getCount() { return videos.length; }

    return {
        addVideo: addVideo,
        show: show,
        hide: hide,
        getCount: getCount
    };
})();
