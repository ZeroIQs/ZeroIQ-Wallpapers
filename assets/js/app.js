/**
 * WALLSPACE — Vault Application Manager
 * Manages Left Vertical Sidebar Navigation, Featured Spotlight Banner,
 * Responsive CSS Grid Vault, Search, Light/Dark Theme, Audio, and HD Lightbox.
 */

(function() {
    'use strict';

    // State Variables
    let currentCategory = 'ALL';
    let currentSearch = '';
    let currentSort = 'default';
    let currentTheme = localStorage.getItem('wallspace_theme') || 'dark';
    let soundEnabled = localStorage.getItem('wallspace_sound') === 'true';
    let favorites = new Set(JSON.parse(localStorage.getItem('wallspace_favs') || '[]'));
    let currentLightboxItem = null;
    let currentFeaturedItem = null;

    // DOM Elements
    const sidebarFeeds = document.getElementById('sidebar-feeds');
    const sidebarCategories = document.getElementById('sidebar-categories');
    const appSidebar = document.getElementById('app-sidebar');
    const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const brandBtn = document.getElementById('brandBtn');

    const vaultGrid = document.getElementById('vaultGrid');
    const vaultTotalCount = document.getElementById('vaultTotalCount');
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const randomBtn = document.getElementById('randomBtn');
    const sortSelect = document.getElementById('sortSelect');
    const lightboxModal = document.getElementById('lightbox-modal');
    const toastContainer = document.getElementById('toast-container');

    // Featured Spotlight Elements
    const spotlightImg = document.getElementById('spotlightImg');
    const spotlightTitle = document.getElementById('spotlightTitle');
    const spotlightCat = document.getElementById('spotlightCat');
    const spotlightFormat = document.getElementById('spotlightFormat');
    const spotlightSize = document.getElementById('spotlightSize');
    const spotlightDlBtn = document.getElementById('spotlightDlBtn');
    const spotlightViewBtn = document.getElementById('spotlightViewBtn');
    const spotlightNextBtn = document.getElementById('spotlightNextBtn');

    // ==================== AUDIO SYNTHESIZER ====================
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playClickSound() {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.045);
        } catch (e) {
            // Ignore audio context autoplay errors
        }
    }

    function playOpenSound() {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.085);
        } catch (e) {}
    }

    // ==================== UTILITIES ====================
    // XSS-safe HTML escaping
    function escapeHTML(str) {
        if (typeof str !== 'string') return String(str);
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Safe path encoding that handles & and special chars in directory names
    function safeEncodePath(path) {
        return path.split('/').map(function(segment) {
            return encodeURIComponent(segment);
        }).join('/');
    }

    function showToast(msg, icon) {
        if (!icon) icon = 'fa-check';
        if (!toastContainer) return;
        var toast = document.createElement('div');
        toast.className = 'toast';
        var iconEl = document.createElement('i');
        iconEl.className = 'fa-solid ' + escapeHTML(icon);
        var span = document.createElement('span');
        span.textContent = msg;
        toast.appendChild(iconEl);
        toast.appendChild(document.createTextNode(' '));
        toast.appendChild(span);
        toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 2800);
    }

    function scrambleElement(element, duration = 300) {
        if (!element) return;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789//';
        const originalText = element.textContent;
        const startTime = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                clearInterval(interval);
                element.textContent = originalText;
                return;
            }

            let result = '';
            for (let i = 0; i < originalText.length; i++) {
                if (originalText[i] === ' ') {
                    result += ' ';
                } else if (i / originalText.length < progress) {
                    result += originalText[i];
                } else {
                    result += chars[Math.floor(Math.random() * chars.length)];
                }
            }
            element.textContent = result;
        }, 30);
    }

    function setTheme(theme, isInit = false) {
        if (theme === currentTheme && !isInit) return;

        const apply = () => {
            currentTheme = theme;
            localStorage.setItem('wallspace_theme', theme);
            document.documentElement.setAttribute('data-theme', theme);

            const themeIcon = document.getElementById('themeIcon');
            const themeBtnText = document.getElementById('themeBtnText');
            if (themeIcon && themeBtnText) {
                if (theme === 'light') {
                    themeIcon.className = 'fa-solid fa-moon';
                    themeBtnText.textContent = 'Dark';
                } else {
                    themeIcon.className = 'fa-solid fa-sun';
                    themeBtnText.textContent = 'Light';
                }
            }
        };

        if (!isInit && document.startViewTransition) {
            const cls = theme === 'dark' ? 'theme-transition-to-dark' : 'theme-transition-to-light';
            document.documentElement.classList.add(cls);

            const transition = document.startViewTransition(apply);
            transition.finished.finally(() => {
                document.documentElement.classList.remove('theme-transition-to-dark', 'theme-transition-to-light');
            });
        } else {
            apply();
        }
    }

    function setSound(enabled) {
        soundEnabled = enabled;
        localStorage.setItem('wallspace_sound', enabled);
        if (!soundToggleBtn) return;
        const icon = soundToggleBtn.querySelector('i');
        const text = soundToggleBtn.querySelector('span');
        if (!icon || !text) return;
        if (enabled) {
            icon.className = 'fa-solid fa-volume-high';
            text.textContent = 'Sound ON';
            getAudioContext();
            playClickSound();
        } else {
            icon.className = 'fa-solid fa-volume-xmark';
            text.textContent = 'Sound OFF';
        }
    }

    // Data Helpers
    function getAllWallpapers() {
        return window.WALLPAPERS_DATA || [];
    }

    function getAllCategories() {
        return window.WALLPAPERS_CATEGORIES || {};
    }

    // ==================== FEATURED SPOTLIGHT ====================
    function setFeaturedWallpaper(item) {
        if (!item) return;
        currentFeaturedItem = item;
        const safeUrl = safeEncodePath(item.path);

        if (spotlightImg) spotlightImg.src = safeUrl;
        if (spotlightTitle) {
            spotlightTitle.textContent = item.title;
            scrambleElement(spotlightTitle, 350);
        }

        if (spotlightCat) spotlightCat.textContent = item.category;
        if (spotlightFormat) spotlightFormat.textContent = item.format;
        if (spotlightSize) spotlightSize.textContent = item.sizeFormatted;

        if (spotlightDlBtn) {
            spotlightDlBtn.href = safeUrl;
            spotlightDlBtn.setAttribute('download', item.filename);
        }
    }

    function shuffleFeatured() {
        playClickSound();
        const filtered = getFilteredWallpapers();
        if (filtered.length > 0) {
            const rand = filtered[Math.floor(Math.random() * filtered.length)];
            setFeaturedWallpaper(rand);
        }
    }

    // ==================== FILTERING & DATASET ====================
    function getFilteredWallpapers() {
        let list = [...getAllWallpapers()];

        if (currentCategory === 'FAVORITES') {
            list = list.filter(w => favorites.has(w.id));
        } else if (currentCategory !== 'ALL') {
            list = list.filter(w => w.category === currentCategory);
        }

        if (currentSearch) {
            const clean = currentSearch.toLowerCase().trim();
            list = list.filter(w => 
                w.title.toLowerCase().includes(clean) ||
                w.category.toLowerCase().includes(clean) ||
                w.filename.toLowerCase().includes(clean)
            );
        }

        if (currentSort === 'name-asc') {
            list.sort((a, b) => a.title.localeCompare(b.title));
        } else if (currentSort === 'name-desc') {
            list.sort((a, b) => b.title.localeCompare(a.title));
        } else if (currentSort === 'size-desc') {
            list.sort((a, b) => b.sizeBytes - a.sizeBytes);
        } else if (currentSort === 'size-asc') {
            list.sort((a, b) => a.sizeBytes - b.sizeBytes);
        }

        return list;
    }

    // ==================== SIDEBAR RENDERING ====================
    function renderSidebar() {
        const allWps = getAllWallpapers();
        const allCats = getAllCategories();

        // 1. Render Feeds Section
        if (sidebarFeeds) {
            sidebarFeeds.innerHTML = '';

            // "ALL" Item
            const allBtn = document.createElement('button');
            allBtn.className = 'sidebar-nav-item' + (currentCategory === 'ALL' ? ' active' : '');
            allBtn.innerHTML = `
                <div class="sidebar-item-left">
                    <i class="fa-solid fa-layer-group sidebar-item-icon"></i>
                    <span>All Wallpapers</span>
                </div>
                <span class="sidebar-item-count">${allWps.length}</span>
            `;
            allBtn.addEventListener('click', () => selectCategory('ALL'));
            sidebarFeeds.appendChild(allBtn);

            // "FAVORITES" Item
            const favBtn = document.createElement('button');
            favBtn.className = 'sidebar-nav-item' + (currentCategory === 'FAVORITES' ? ' active' : '');
            favBtn.innerHTML = `
                <div class="sidebar-item-left">
                    <i class="fa-solid fa-heart sidebar-item-icon" style="color: var(--pink);"></i>
                    <span>Favorites</span>
                </div>
                <span class="sidebar-item-count" id="sidebar-fav-count">${favorites.size}</span>
            `;
            favBtn.addEventListener('click', () => selectCategory('FAVORITES'));
            sidebarFeeds.appendChild(favBtn);
        }

        // 2. Render Categories Section
        if (sidebarCategories) {
            sidebarCategories.innerHTML = '';
            const catKeys = Object.keys(allCats).sort();

            for (const cat of catKeys) {
                const count = allCats[cat];
                const btn = document.createElement('button');
                btn.className = 'sidebar-nav-item' + (currentCategory === cat ? ' active' : '');

                let icon = 'fa-folder';
                if (cat.includes('Anime')) icon = 'fa-wand-magic-sparkles';
                else if (cat.includes('Cars')) icon = 'fa-car-side';
                else if (cat.includes('City')) icon = 'fa-city';
                else if (cat.includes('Color')) icon = 'fa-palette';
                else if (cat.includes('Cyberpunk')) icon = 'fa-microchip';
                else if (cat.includes('Dark')) icon = 'fa-skull';
                else if (cat.includes('Minimalist')) icon = 'fa-shapes';
                else if (cat.includes('Nature') || cat.includes('Animals')) icon = 'fa-leaf';
                else if (cat.includes('OS') || cat.includes('Technology')) icon = 'fa-terminal';
                else if (cat.includes('Pixel')) icon = 'fa-gamepad';
                else if (cat.includes('Space')) icon = 'fa-shuttle-space';
                else if (cat.includes('Superheroes')) icon = 'fa-mask';

                btn.innerHTML = `
                    <div class="sidebar-item-left">
                        <i class="fa-solid ${escapeHTML(icon)} sidebar-item-icon"></i>
                        <span>${escapeHTML(cat)}</span>
                    </div>
                    <span class="sidebar-item-count">${count}</span>
                `;
                btn.addEventListener('click', () => selectCategory(cat));
                sidebarCategories.appendChild(btn);
            }
        }
    }

    function selectCategory(category) {
        playClickSound();
        currentCategory = category;
        renderSidebar();
        renderVaultGrid();

        if (window.innerWidth <= 900 && appSidebar) {
            appSidebar.classList.remove('open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        }

        const filtered = getFilteredWallpapers();
        if (filtered.length > 0) {
            setFeaturedWallpaper(filtered[0]);
        }
    }

    // ==================== VAULT GRID RENDERING ====================
    function createSkeletonCard() {
        var skel = document.createElement('div');
        skel.className = 'skeleton-card';
        skel.innerHTML =
            '<div class="skeleton-thumb"></div>' +
            '<div class="skeleton-info">' +
                '<div class="skeleton-line title"></div>' +
                '<div class="skeleton-line meta"></div>' +
                '<div class="skeleton-line btn"></div>' +
            '</div>';
        return skel;
    }

    function showSkeletons(count) {
        vaultGrid.innerHTML = '';
        var frag = document.createDocumentFragment();
        for (var i = 0; i < count; i++) {
            frag.appendChild(createSkeletonCard());
        }
        vaultGrid.appendChild(frag);
    }

    function renderVaultGrid() {
        const allWps = getAllWallpapers();
        const filtered = getFilteredWallpapers();
        vaultTotalCount.textContent = 'Showing ' + filtered.length + ' of ' + allWps.length + ' wallpapers';

        if (filtered.length === 0) {
            vaultGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted); font-family: var(--font-mono);">
                    <i class="fa-solid fa-image" style="font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.35;"></i>
                    <p style="font-size: 1rem; font-weight: 600;">No wallpapers found in this category.</p>
                </div>
            `;
            return;
        }

        // Show skeleton placeholders immediately
        var skeletonCount = Math.min(filtered.length, 12);
        showSkeletons(skeletonCount);

        // Build real cards off-screen, then swap in
        requestAnimationFrame(function() {
            setTimeout(function() {
                vaultGrid.innerHTML = '';
                const fragment = document.createDocumentFragment();

                filtered.forEach((item, index) => {
                    const card = document.createElement('div');
                    card.className = 'wallpaper-card skeleton-reveal';
                    card.style.animationDelay = Math.min(index * 20, 400) + 'ms';
                    const isFav = favorites.has(item.id);
                    const safeUrl = safeEncodePath(item.path);

                    card.innerHTML = `
                        <div class="card-thumb-wrap">
                            <div class="card-top-badges">
                                <span class="card-category-badge">${escapeHTML(item.category)}</span>
                                <button class="card-fav-btn ${isFav ? 'active' : ''}" title="Favorite" data-id="${escapeHTML(item.id)}"><i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i></button>
                            </div>
                            <img class="card-img" src="${safeUrl}" alt="${escapeHTML(item.title)}" loading="lazy">
                        </div>
                        <div class="card-info">
                            <div class="card-title">${escapeHTML(item.title)}</div>
                            <div class="card-meta-row">
                                <span>${escapeHTML(item.format)}</span>
                                <span>${escapeHTML(item.sizeFormatted)}</span>
                            </div>
                            <div class="card-actions-row">
                                <button class="card-btn card-view-btn">
                                    <i class="fa-solid fa-expand"></i> View HD
                                </button>
                                <a href="${safeUrl}" download="${escapeHTML(item.filename)}" class="card-btn card-dl-btn" title="Download">
                                    <i class="fa-solid fa-download"></i>
                                </a>
                            </div>
                        </div>
                    `;

                    // Open Lightbox
                    card.querySelector('.card-thumb-wrap').addEventListener('click', (e) => {
                        if (e.target.closest('.card-fav-btn')) return;
                        openLightbox(item);
                    });

                    card.querySelector('.card-view-btn').addEventListener('click', () => {
                        openLightbox(item);
                    });

                    // Favorite toggle
                    const favBtn = card.querySelector('.card-fav-btn');
                    favBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id, favBtn);
                    });

                    fragment.appendChild(card);
                });

                vaultGrid.appendChild(fragment);
            }, 180);
        });
    }

    function toggleFavorite(id, buttonEl) {
        playClickSound();
        if (favorites.has(id)) {
            favorites.delete(id);
            showToast('Removed from favorites', 'fa-heart-crack');
        } else {
            favorites.add(id);
            showToast('Added to favorites!', 'fa-heart');
        }
        localStorage.setItem('wallspace_favs', JSON.stringify([...favorites]));

        // Optimized: update only the fav count instead of full sidebar rebuild
        const favCountEl = document.getElementById('sidebar-fav-count');
        if (favCountEl) {
            favCountEl.textContent = favorites.size;
        } else {
            renderSidebar();
        }

        if (buttonEl) {
            const isFav = favorites.has(id);
            buttonEl.classList.toggle('active', isFav);
            buttonEl.querySelector('i').className = (isFav ? 'fa-solid' : 'fa-regular') + ' fa-heart';
        }

        if (currentCategory === 'FAVORITES') {
            renderVaultGrid();
        }
    }

    // ==================== LIGHTBOX MODAL ====================
    function openLightbox(item) {
        if (!item) return;
        playOpenSound();
        currentLightboxItem = item;

        const imgEl = document.getElementById('lightbox-img');
        const titleEl = document.getElementById('lightbox-title');
        const badgeEl = document.getElementById('lightbox-category-badge');
        const valFilename = document.getElementById('lightbox-val-filename');
        const valCategory = document.getElementById('lightbox-val-category');
        const valFormat = document.getElementById('lightbox-val-format');
        const valSize = document.getElementById('lightbox-val-size');
        const dlBtn = document.getElementById('lightbox-dl-btn');
        const favBtn = document.getElementById('lightbox-fav-btn');

        const safeUrl = safeEncodePath(item.path);
        if (imgEl) imgEl.src = safeUrl;
        if (titleEl) {
            titleEl.textContent = item.title;
            scrambleElement(titleEl, 300);
        }

        if (badgeEl) badgeEl.textContent = item.category;
        if (valFilename) valFilename.textContent = item.filename;
        if (valCategory) valCategory.textContent = item.subCategory || item.category;
        if (valFormat) valFormat.textContent = item.format;
        if (valSize) valSize.textContent = item.sizeFormatted;

        if (dlBtn) {
            dlBtn.href = safeUrl;
            dlBtn.setAttribute('download', item.filename);
        }

        if (favBtn) {
            const isFav = favorites.has(item.id);
            favBtn.innerHTML = '';
            const heartIcon = document.createElement('i');
            heartIcon.className = (isFav ? 'fa-solid' : 'fa-regular') + ' fa-heart';
            heartIcon.style.color = isFav ? 'var(--pink)' : 'inherit';
            const span = document.createElement('span');
            span.textContent = isFav ? 'Favorited' : 'Add to Favorites';
            favBtn.appendChild(heartIcon);
            favBtn.appendChild(document.createTextNode(' '));
            favBtn.appendChild(span);
        }

        lightboxModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        playClickSound();
        lightboxModal.classList.remove('active');
        document.body.style.overflow = '';
        currentLightboxItem = null;
    }

    function navigateLightbox(direction) {
        if (!currentLightboxItem) return;
        playClickSound();
        const filtered = getFilteredWallpapers();
        if (filtered.length <= 1) return;

        let index = filtered.findIndex(w => w.id === currentLightboxItem.id);
        if (index === -1) index = 0;
        index = (index + direction + filtered.length) % filtered.length;
        openLightbox(filtered[index]);
    }

    // ==================== INIT ====================
    function init() {
        setTheme(currentTheme, true);
        setSound(soundEnabled);
        renderSidebar();

        // Brand click & hover text scramble
        if (brandBtn) {
            brandBtn.addEventListener('click', () => {
                playClickSound();
                selectCategory('ALL');
            });
            brandBtn.addEventListener('mouseenter', () => {
                const title = brandBtn.querySelector('.brand-title');
                if (title) scrambleElement(title, 350);
            });
        }

        // Mobile drawer toggle
        if (mobileSidebarToggle && appSidebar) {
            mobileSidebarToggle.addEventListener('click', () => {
                appSidebar.classList.toggle('open');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.toggle('active', appSidebar.classList.contains('open'));
                }
            });
        }

        // Mobile overlay click-to-close
        if (sidebarOverlay && appSidebar) {
            sidebarOverlay.addEventListener('click', () => {
                appSidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            });
        }

        // Set initial featured wallpaper
        const allWps = getAllWallpapers();
        if (allWps.length > 0) {
            setFeaturedWallpaper(allWps[0]);
        }

        // Render initial vault grid
        renderVaultGrid();

        // Spotlight Action Buttons
        if (spotlightViewBtn) {
            spotlightViewBtn.addEventListener('click', () => {
                if (currentFeaturedItem) openLightbox(currentFeaturedItem);
            });
        }

        if (spotlightNextBtn) {
            spotlightNextBtn.addEventListener('click', shuffleFeatured);
        }

        // Theme Toggle Button
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                playClickSound();
                setTheme(currentTheme === 'dark' ? 'light' : 'dark');
            });
        }

        // Sound Toggle
        if (soundToggleBtn) {
            soundToggleBtn.addEventListener('click', () => {
                setSound(!soundEnabled);
            });
        }

        // Search Input (with debounce)
        let searchDebounceTimer = null;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearch = e.target.value;
                if (searchClearBtn) searchClearBtn.classList.toggle('active', !!currentSearch);
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                    renderVaultGrid();
                }, 150);
            });
        }

        if (searchClearBtn) {
            searchClearBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                currentSearch = '';
                searchClearBtn.classList.remove('active');
                clearTimeout(searchDebounceTimer);
                renderVaultGrid();
            });
        }

        // Sort Selector
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                renderVaultGrid();
            });
        }

        // Lightbox Modal Bindings
        const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
        const lightboxPrevBtn = document.getElementById('lightbox-prev-btn');
        const lightboxNextBtnEl = document.getElementById('lightbox-next-btn');
        const lightboxFavBtn = document.getElementById('lightbox-fav-btn');
        const lightboxCopyBtn = document.getElementById('lightbox-copy-btn');

        if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
        if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', () => navigateLightbox(-1));
        if (lightboxNextBtnEl) lightboxNextBtnEl.addEventListener('click', () => navigateLightbox(1));

        if (lightboxModal) {
            lightboxModal.addEventListener('click', (e) => {
                if (e.target === lightboxModal || e.target.classList.contains('lightbox-main-view')) {
                    closeLightbox();
                }
            });
        }

        if (lightboxFavBtn) {
            lightboxFavBtn.addEventListener('click', () => {
                if (currentLightboxItem) {
                    toggleFavorite(currentLightboxItem.id);
                    const isFav = favorites.has(currentLightboxItem.id);
                    lightboxFavBtn.innerHTML = '';
                    const heartIcon = document.createElement('i');
                    heartIcon.className = (isFav ? 'fa-solid' : 'fa-regular') + ' fa-heart';
                    heartIcon.style.color = isFav ? 'var(--pink)' : 'inherit';
                    const span = document.createElement('span');
                    span.textContent = isFav ? 'Favorited' : 'Add to Favorites';
                    lightboxFavBtn.appendChild(heartIcon);
                    lightboxFavBtn.appendChild(document.createTextNode(' '));
                    lightboxFavBtn.appendChild(span);
                }
            });
        }

        if (lightboxCopyBtn) {
            lightboxCopyBtn.addEventListener('click', () => {
                if (currentLightboxItem) {
                    playClickSound();
                    const url = window.location.origin + window.location.pathname + '#' + encodeURIComponent(currentLightboxItem.title);
                    navigator.clipboard.writeText(url).then(() => {
                        showToast('Link copied to clipboard!', 'fa-link');
                    }).catch(() => {
                        showToast('Direct link ready', 'fa-check');
                    });
                }
            });
        }

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (lightboxModal && lightboxModal.classList.contains('active')) {
                if (e.key === 'Escape') closeLightbox();
                else if (e.key === 'ArrowLeft') navigateLightbox(-1);
                else if (e.key === 'ArrowRight') navigateLightbox(1);
                else if (e.key.toLowerCase() === 'f' && currentLightboxItem) {
                    toggleFavorite(currentLightboxItem.id);
                }
            } else {
                if (e.key === '/' && searchInput && document.activeElement !== searchInput) {
                    e.preventDefault();
                    searchInput.focus();
                }
            }
        });

        // Dismiss loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    if (loadingScreen.parentNode) loadingScreen.parentNode.removeChild(loadingScreen);
                }, 900);
            }, 3200);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
