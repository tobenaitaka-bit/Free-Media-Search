// search.js — Full-page search logic (mirrors popup.js for use in search.html)

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ===== State =====
    let apiKeys = null;
    let currentType = 'images';
    let isSearching = false;
    let lastQuery = '';
    let currentPage = 1;
    let currentOrientation = 'all';
    let currentSource = 'all';

    // ===== DOM Elements =====
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const tabImages = document.getElementById('tabImages');
    const tabVideos = document.getElementById('tabVideos');
    const emptyState = document.getElementById('emptyState');
    const cardGrid = document.getElementById('cardGrid');
    const statusBar = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');

    // Filter elements
    const orientationSelect = document.getElementById('orientationSelect');
    const sourceSelect = document.getElementById('sourceSelect');
    const refreshBtn = document.getElementById('refreshBtn');

    // Pagination elements
    const paginationBar = document.getElementById('paginationBar');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    // ===== Load API Keys =====
    function loadApiKeys() {
        return new Promise(function (resolve, reject) {
            chrome.storage.local.get(['pexelsKey', 'pixabayKey'], function (result) {
                if (!result.pexelsKey && !result.pixabayKey) {
                    reject(new Error('NO_KEYS'));
                    return;
                }
                resolve({
                    PEXELS_API_KEY: result.pexelsKey || '',
                    PIXABAY_API_KEY: result.pixabayKey || ''
                });
            });
        });
    }

    function showApiKeyNotice() {
        emptyState.innerHTML = '';
        var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('class', 'empty-icon');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
        icon.setAttribute('stroke-width', '1.5');
        icon.setAttribute('stroke-linecap', 'round');
        icon.setAttribute('stroke-linejoin', 'round');
        var path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path1.setAttribute('d', 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z');
        var circle1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle1.setAttribute('cx', '12');
        circle1.setAttribute('cy', '12');
        circle1.setAttribute('r', '3');
        icon.appendChild(path1);
        icon.appendChild(circle1);
        emptyState.appendChild(icon);
        var msg = document.createElement('p');
        msg.textContent = 'APIキーが未設定です';
        msg.style.marginBottom = '8px';
        emptyState.appendChild(msg);
        var hint = document.createElement('span');
        hint.textContent = 'オプション画面でAPIキーを設定してください';
        hint.style.marginBottom = '14px';
        emptyState.appendChild(hint);
        var btn = document.createElement('button');
        btn.textContent = '⚙ 設定画面を開く';
        btn.style.cssText = 'padding:10px 24px;border:none;border-radius:12px;background:linear-gradient(135deg,#7c5cfc 0%,#9078ff 100%);color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;margin-top:4px;';
        btn.addEventListener('click', function () { chrome.runtime.openOptionsPage(); });
        emptyState.appendChild(btn);
        emptyState.style.display = 'flex';
    }

    // ===== Source helpers =====
    function hasPexelsKey() {
        return apiKeys && apiKeys.PEXELS_API_KEY && apiKeys.PEXELS_API_KEY.length > 0;
    }
    function hasPixabayKey() {
        return apiKeys && apiKeys.PIXABAY_API_KEY && apiKeys.PIXABAY_API_KEY.length > 0;
    }
    function shouldSearchPexels() {
        if (currentSource === 'pixabay') return false;
        return hasPexelsKey();
    }
    function shouldSearchPixabay() {
        if (currentSource === 'pexels') return false;
        return hasPixabayKey();
    }

    // ===== Orientation helpers =====
    function getPexelsOrientation() {
        if (currentOrientation === 'all') return '';
        return currentOrientation;
    }
    function getPixabayOrientation() {
        if (currentOrientation === 'all') return 'all';
        if (currentOrientation === 'landscape') return 'horizontal';
        if (currentOrientation === 'portrait') return 'vertical';
        return 'all';
    }
    function filterBySquare(items) {
        if (currentOrientation !== 'square') return items;
        return items.filter(function (item) {
            if (!item.width || !item.height) return true;
            var ratio = item.width / item.height;
            return ratio >= 0.8 && ratio <= 1.25;
        });
    }

    // ===== API: Pexels =====
    async function searchPexelsImages(query, perPage, page) {
        perPage = perPage || 20; page = page || 1;
        var url = 'https://api.pexels.com/v1/search?query=' + encodeURIComponent(query) + '&per_page=' + perPage + '&page=' + page;
        var orient = getPexelsOrientation();
        if (orient) url += '&orientation=' + orient;
        url += '&_t=' + Date.now();
        const res = await fetch(url, { headers: { 'Authorization': apiKeys.PEXELS_API_KEY } });
        if (!res.ok) throw new Error('Pexels API error: ' + res.status);
        const data = await res.json();
        return (data.photos || []).map(function (photo) {
            return { id: photo.id, source: 'Pexels', title: photo.alt || ('Pexels — ' + photo.photographer), author: photo.photographer, thumbnail: photo.src.medium, preview: photo.src.large, downloadUrl: photo.src.original, sourceUrl: photo.url, type: 'image', width: photo.width, height: photo.height };
        });
    }
    async function searchPexelsVideos(query, perPage, page) {
        perPage = perPage || 20; page = page || 1;
        var url = 'https://api.pexels.com/videos/search?query=' + encodeURIComponent(query) + '&per_page=' + perPage + '&page=' + page;
        url += '&_t=' + Date.now();
        const res = await fetch(url, { headers: { 'Authorization': apiKeys.PEXELS_API_KEY } });
        if (!res.ok) throw new Error('Pexels API error: ' + res.status);
        const data = await res.json();
        return (data.videos || []).map(function (video) {
            var files = video.video_files || [];
            var downloadFile = files.find(function (f) { return f.quality === 'hd'; }) || files[0] || {};
            var previewFile = files.find(function (f) { return f.quality === 'sd'; }) || files[0] || {};
            var userName = (video.user && video.user.name) ? video.user.name : 'Unknown';
            return { id: video.id, source: 'Pexels', title: 'Pexels — ' + userName, author: userName, thumbnail: video.image, preview: previewFile.link || '', downloadUrl: downloadFile.link || '', sourceUrl: video.url, type: 'video', width: video.width || 0, height: video.height || 0 };
        });
    }

    // ===== API: Pixabay =====
    async function searchPixabayImages(query, perPage, page) {
        perPage = perPage || 20; page = page || 1;
        var url = 'https://pixabay.com/api/?key=' + encodeURIComponent(apiKeys.PIXABAY_API_KEY) + '&q=' + encodeURIComponent(query) + '&per_page=' + perPage + '&page=' + page + '&image_type=photo';
        var orient = getPixabayOrientation();
        if (orient !== 'all') url += '&orientation=' + orient;
        url += '&_t=' + Date.now();
        const res = await fetch(url);
        if (!res.ok) throw new Error('Pixabay API error: ' + res.status);
        const data = await res.json();
        return (data.hits || []).map(function (hit) {
            return { id: hit.id, source: 'Pixabay', title: hit.tags || ('Pixabay — ' + hit.user), author: hit.user, thumbnail: hit.webformatURL, preview: hit.largeImageURL, downloadUrl: hit.largeImageURL, sourceUrl: hit.pageURL, type: 'image', width: hit.imageWidth || 0, height: hit.imageHeight || 0 };
        });
    }
    async function searchPixabayVideos(query, perPage, page) {
        perPage = perPage || 20; page = page || 1;
        var url = 'https://pixabay.com/api/videos/?key=' + encodeURIComponent(apiKeys.PIXABAY_API_KEY) + '&q=' + encodeURIComponent(query) + '&per_page=' + perPage + '&page=' + page;
        url += '&_t=' + Date.now();
        const res = await fetch(url);
        if (!res.ok) throw new Error('Pixabay API error: ' + res.status);
        const data = await res.json();
        console.log('[DEBUG-Search] Pixabay Video Response:', data);

        return (data.hits || []).map(function (hit) {
            console.log('[DEBUG-Search] Pixabay Hit:', hit.id, { picture_id: hit.picture_id, videos: hit.videos });
            var tiny = (hit.videos && hit.videos.tiny) ? hit.videos.tiny : {};
            var medium = (hit.videos && hit.videos.medium) ? hit.videos.medium : tiny;
            var large = (hit.videos && hit.videos.large) ? hit.videos.large : medium;
            return {
                id: hit.id,
                source: 'Pixabay',
                title: hit.tags || ('Pixabay — ' + hit.user),
                author: hit.user,
                thumbnail: hit.picture_id ? ('https://i.vimeocdn.com/video/' + hit.picture_id + '_640x360.jpg') : '',
                tinyVideoUrl: tiny.url || '',
                preview: medium.url || '',
                downloadUrl: large.url || medium.url || '',
                sourceUrl: hit.pageURL,
                type: 'video',
                width: 0,
                height: 0
            };
        });
    }

    // ===== Search Logic =====
    async function performSearch(query, opts) {
        opts = opts || {};
        if (!query || !query.trim()) return;
        if (isSearching) return;

        // Reload API keys every time to ensure we have the latest
        try {
            apiKeys = await loadApiKeys();
        } catch (err) {
            if (err.message === 'NO_KEYS') {
                showApiKeyNotice();
                setStatus('APIキーが未設定です — 設定画面で入力してください', 'error');
            } else {
                setStatus('Error loading API keys', 'error');
            }
            return;
        }

        // Get current filter values directly from DOM to be safe
        if (sourceSelect) currentSource = sourceSelect.value;
        if (orientationSelect) currentOrientation = orientationSelect.value;

        var doPexels = shouldSearchPexels();
        var doPixabay = shouldSearchPixabay();

        console.log('--- Search Debug (search.js) ---');
        console.log('Query:', query);
        console.log('Selected Source:', currentSource);
        console.log('Has Pexels Key:', hasPexelsKey());
        console.log('Has Pixabay Key:', hasPixabayKey());
        console.log('Will search Pexels:', doPexels);
        console.log('Will search Pixabay:', doPixabay);

        if (currentSource === 'pexels' && !hasPexelsKey()) { setStatus('Pexels APIキーが設定されていません', 'error'); return; }
        if (currentSource === 'pixabay' && !hasPixabayKey()) { setStatus('Pixabay APIキーが設定されていません', 'error'); return; }
        if (!doPexels && !doPixabay) { setStatus('検索可能なAPIキーがありません', 'error'); return; }

        isSearching = true;
        lastQuery = query.trim();
        if (!opts.keepPage) currentPage = 1;

        setSearching(true);
        setStatus('Searching...', '');
        clearResults();
        emptyState.style.display = 'none';
        updatePagination(false);

        try {
            var promises = [];
            var sourceLabels = [];

            if (doPexels) {
                promises.push(currentType === 'images' ? searchPexelsImages(lastQuery, 20, currentPage) : searchPexelsVideos(lastQuery, 20, currentPage));
                sourceLabels.push('Pexels');
            }
            if (doPixabay) {
                promises.push(currentType === 'images' ? searchPixabayImages(lastQuery, 20, currentPage) : searchPixabayVideos(lastQuery, 20, currentPage));
                sourceLabels.push('Pixabay');
            }

            var results = await Promise.allSettled(promises);
            var items = []; // Result array reset here
            var errors = [];

            results.forEach(function (result, i) {
                if (result.status === 'fulfilled') {
                    console.log('Results from ' + sourceLabels[i] + ':', result.value.length);
                    items = items.concat(result.value);
                }
                else {
                    console.error('Error from ' + sourceLabels[i] + ':', result.reason);
                    errors.push(sourceLabels[i] + ': ' + (result.reason ? result.reason.message : 'Unknown error'));
                }
            });

            // Ensure source filtering is correct even in results (safety check)
            if (currentSource === 'pexels') {
                items = items.filter(item => item.source === 'Pexels');
            } else if (currentSource === 'pixabay') {
                items = items.filter(item => item.source === 'Pixabay');
            }

            items = filterBySquare(items);
            items = items.slice(0, 40);

            if (items.length === 0 && errors.length > 0) {
                setStatus('Error: ' + errors.join(' / '), 'error');
                updatePagination(false);
            } else if (items.length === 0) {
                setStatus('No results found', '');
                emptyState.style.display = 'flex';
                emptyState.querySelector('p').textContent = 'No results for "' + lastQuery + '"';
                emptyState.querySelector('span').textContent = 'Try different keywords';
                updatePagination(false);
            } else {
                var warn = errors.length > 0 ? ' (' + errors.join(', ') + ')' : '';
                setStatus(items.length + ' results — Page ' + currentPage + warn, 'success');
                renderCards(items);
                updatePagination(items.length >= 10);
            }
        } catch (err) { setStatus('Error: ' + err.message, 'error'); }
        finally { isSearching = false; setSearching(false); }
    }

    function updatePagination(hasResults) {
        if (!paginationBar) return;
        if (!lastQuery || !hasResults) { paginationBar.style.display = 'none'; return; }
        paginationBar.style.display = 'flex';
        pageInfo.textContent = 'Page ' + currentPage;
        prevBtn.disabled = (currentPage <= 1);
        nextBtn.disabled = !hasResults;
    }

    function renderCards(items) {
        cardGrid.innerHTML = '';
        items.forEach(function (item, index) { cardGrid.appendChild(createCard(item, index)); });
    }

    function createCard(item, index) {
        var card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = (index * 30) + 'ms';
        var badgeClass = item.source === 'Pexels' ? 'badge-pexels' : 'badge-pixabay';
        var previewIconSvg = item.type === 'video'
            ? '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
        var thumbHtml = '';
        if (item.type === 'video') {
            var videoSrc = item.tinyVideoUrl || item.preview || item.downloadUrl;
            var posterUrl = item.thumbnail;
            console.log('[DEBUG-Search] Creating Video Card:', item.id, { videoSrc: videoSrc, posterUrl: posterUrl, source: item.source });
            thumbHtml = '<video src="' + escapeAttr(videoSrc) + '" poster="' + escapeAttr(posterUrl) + '" muted playsinline preload="metadata"></video>';
        } else {
            thumbHtml = '<img src="' + escapeAttr(item.thumbnail) + '" alt="' + escapeAttr(item.title) + '" loading="lazy">';
        }
        card.innerHTML =
            '<div class="card-thumb">' + thumbHtml + '<span class="card-source-badge ' + badgeClass + '">' + escapeHtml(item.source) + '</span><div class="card-preview-icon">' + previewIconSvg + '</div></div>' +
            '<div class="card-info"><div class="card-title" title="' + escapeAttr(item.title) + '">' + escapeHtml(item.title) + '</div><div class="card-author">by ' + escapeHtml(item.author) + '</div>' +
            '<div class="card-actions"><a class="card-btn btn-source" href="' + escapeAttr(item.sourceUrl) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>Source</a>' +
            '<button class="card-btn btn-download"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>Download</button></div></div>';
        card.querySelector('.card-thumb').addEventListener('click', function () { openPreview(item); });
        var dlBtn = card.querySelector('.btn-download');
        dlBtn.addEventListener('click', function (e) { e.stopPropagation(); handleDownload(dlBtn, item); });
        return card;
    }

    function handleDownload(btn, item) {
        if (btn.classList.contains('downloading')) return;
        btn.classList.add('downloading');
        btn.innerHTML = '<div class="spinner" style="width:12px;height:12px;border-width:2px;"></div>';
        var ext = item.type === 'video' ? 'mp4' : 'jpg';
        var safeName = lastQuery.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        var filename = item.source.toLowerCase() + '_' + safeName + '_' + item.id + '.' + ext;
        try {
            chrome.runtime.sendMessage({ action: 'download', url: item.downloadUrl, filename: filename }, function (response) {
                btn.classList.remove('downloading');
                if (response && response.success) {
                    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>Done';
                    setTimeout(function () {
                        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>Download';
                    }, 2000);
                } else {
                    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>Error';
                    setStatus('Download failed: ' + ((response && response.error) || 'Unknown error'), 'error');
                }
            });
        } catch (err) { btn.classList.remove('downloading'); setStatus('Download error: ' + err.message, 'error'); }
    }

    function openPreview(item) {
        modalBody.innerHTML = '';
        if (item.type === 'video') {
            var video = document.createElement('video');
            video.src = item.preview || item.downloadUrl; video.controls = true; video.autoplay = true; video.style.maxWidth = '100%';
            modalBody.appendChild(video);
        } else {
            var img = document.createElement('img');
            img.src = item.preview || item.thumbnail; img.alt = item.title;
            modalBody.appendChild(img);
        }
        modalOverlay.style.display = 'flex';
    }

    function closePreview() {
        modalOverlay.style.display = 'none';
        var video = modalBody.querySelector('video');
        if (video) video.pause();
        modalBody.innerHTML = '';
    }

    function setStatus(text, type) {
        statusText.textContent = text;
        statusBar.className = 'status-bar';
        if (type) statusBar.classList.add(type);
    }

    function setSearching(active) {
        searchBtn.disabled = active; searchInput.disabled = active;
        if (refreshBtn) refreshBtn.disabled = active;
        var btnText = searchBtn.querySelector('.btn-text');
        var btnLoader = searchBtn.querySelector('.btn-loader');
        if (active) { btnText.style.display = 'none'; btnLoader.style.display = 'flex'; }
        else { btnText.style.display = ''; btnLoader.style.display = 'none'; }
    }

    function clearResults() { cardGrid.innerHTML = ''; }

    function escapeHtml(str) { var div = document.createElement('div'); div.textContent = str || ''; return div.innerHTML; }
    function escapeAttr(str) { return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    // ===== Event Listeners =====
    searchBtn.addEventListener('click', function () { performSearch(searchInput.value); });
    searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') performSearch(searchInput.value); });

    tabImages.addEventListener('click', function () {
        if (currentType === 'images') return;
        currentType = 'images'; tabImages.classList.add('active'); tabVideos.classList.remove('active');
        if (lastQuery) performSearch(lastQuery);
    });
    tabVideos.addEventListener('click', function () {
        if (currentType === 'videos') return;
        currentType = 'videos'; tabVideos.classList.add('active'); tabImages.classList.remove('active');
        if (lastQuery) performSearch(lastQuery);
    });

    if (orientationSelect) { orientationSelect.addEventListener('change', function () { currentOrientation = orientationSelect.value; if (lastQuery) performSearch(lastQuery); }); }
    if (sourceSelect) {
        sourceSelect.addEventListener('change', function () {
            currentSource = sourceSelect.value;
            currentPage = 1; // Reset to page 1 on source change
            if (lastQuery) performSearch(lastQuery);
        });
    }
    if (refreshBtn) { refreshBtn.addEventListener('click', function () { if (lastQuery) performSearch(lastQuery, { keepPage: true }); }); }
    if (prevBtn) { prevBtn.addEventListener('click', function () { if (currentPage > 1) { currentPage--; performSearch(lastQuery, { keepPage: true }); } }); }
    if (nextBtn) { nextBtn.addEventListener('click', function () { currentPage++; performSearch(lastQuery, { keepPage: true }); }); }

    modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) closePreview(); });
    modalClose.addEventListener('click', closePreview);

    document.getElementById('settingsBtn').addEventListener('click', function () { chrome.runtime.openOptionsPage(); });

    var closeBtn = document.getElementById('closeBtn');
    if (closeBtn) { closeBtn.addEventListener('click', function () { window.close(); }); }

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modalOverlay.style.display !== 'none') closePreview(); });

    // ===== Storage Listener (Real-time updates) =====
    chrome.storage.onChanged.addListener(function (changes, namespace) {
        if (namespace === 'local' && (changes.pexelsKey || changes.pixabayKey)) {
            loadApiKeys().then(function (keys) {
                apiKeys = keys;
                searchBtn.disabled = false;
                emptyState.style.display = 'none';
                if (!lastQuery) { setStatus('Ready — enter a keyword to search', ''); }
                else { setStatus('API keys updated — ready to search', 'success'); }
            }).catch(function (err) {
                if (err.message === 'NO_KEYS') {
                    apiKeys = null;
                    searchBtn.disabled = true;
                    showApiKeyNotice();
                    setStatus('APIキーが未設定です — 設定画面で入力してください', 'error');
                }
            });
        }
    });

    // ===== Init =====
    loadApiKeys().then(function (keys) {
        apiKeys = keys;
        setStatus('Ready — enter a keyword to search', '');
        searchInput.focus();
    }).catch(function (err) {
        if (err.message === 'NO_KEYS') {
            showApiKeyNotice();
            setStatus('APIキーが未設定です — 設定画面で入力してください', 'error');
        } else {
            console.error('Failed to load API keys:', err);
        }
    });
});
