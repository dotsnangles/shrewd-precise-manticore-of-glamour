document.addEventListener('DOMContentLoaded', () => {
    const listView = document.getElementById('list-view');
    const readerView = document.getElementById('reader-view');
    const manuscriptList = document.getElementById('manuscript-list');
    const contentArea = document.getElementById('content-area');
    const backBtn = document.getElementById('back-to-list');
    const prevBtn = document.getElementById('prev-chapter');
    const nextBtn = document.getElementById('next-chapter');
    
    // Font controls
    const fontDecreaseBtn = document.getElementById('font-decrease');
    const fontIncreaseBtn = document.getElementById('font-increase');
    
    // Metadata elements
    const novelTitleElem = document.getElementById('novel-title');
    const authorNameElem = document.getElementById('author-name');
    const novelDescElem = document.getElementById('novel-description');
    const currentChapterTitleElem = document.getElementById('current-chapter-title');
    const footerCopyElem = document.getElementById('footer-copy');

    let config = null;
    let currentIndex = -1;
    let currentFontSize = parseFloat(localStorage.getItem('novel-font-size')) || 1.2;

    // Apply initial font size
    contentArea.style.fontSize = `${currentFontSize}rem`;

    // Load configuration and metadata
    async function loadConfig() {
        try {
            const response = await fetch('config.json');
            if (!response.ok) throw new Error('config.json not found');
            config = await response.json();
            
            // Apply Basic Metadata
            document.title = config.novelTitle;
            novelTitleElem.textContent = config.novelTitle;
            authorNameElem.textContent = config.author;
            novelDescElem.textContent = config.description;
            footerCopyElem.textContent = `© ${new Date().getFullYear()} ${config.author}. All rights reserved.`;
            
            // Dynamic Meta Tag Sync
            const metaMapping = {
                'description': config.description,
                'author': config.author,
                'og:title': config.novelTitle,
                'og:description': config.description,
                'twitter:title': config.novelTitle,
                'twitter:description': config.description
            };

            // Apply base mapping
            Object.entries(metaMapping).forEach(([name, content]) => {
                const attr = (name.startsWith('og:') || name.startsWith('fb:')) ? 'property' : 'name';
                updateMetaTag(name, content, attr);
            });

            // Apply extended siteMetadata if available
            if (config.siteMetadata) {
                Object.entries(config.siteMetadata).forEach(([name, content]) => {
                    const attr = (name.startsWith('og:') || name.startsWith('fb:')) ? 'property' : 'name';
                    updateMetaTag(name, content, attr);
                });
            }
            
            renderList();
            handleInitialHash();
        } catch (error) {
            console.error('Failed to load config:', error);
            manuscriptList.innerHTML = '<li style="color:red">설정 파일(config.json)을 불러오지 못했습니다.</li>';
        }
    }

    function updateMetaTag(name, content, attr = 'name') {
        let meta = document.querySelector(`meta[${attr}="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attr, name);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    }

    function renderList() {
        manuscriptList.innerHTML = '';
        config.chapters.forEach((chapter, index) => {
            const li = document.createElement('li');
            li.textContent = chapter.title;
            li.addEventListener('click', () => openReader(index));
            manuscriptList.appendChild(li);
        });
    }

    async function openReader(index) {
        if (!config || index < 0 || index >= config.chapters.length) return;
        
        currentIndex = index;
        const chapter = config.chapters[index];
        const filePath = `001-manuscripts/${chapter.file}`;
        
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error('File not found');
            let text = await response.text();
            
            // Remove the first line if it's a title starting with #
            const lines = text.split('\n');
            if (lines[0].startsWith('#')) {
                lines.shift();
                text = lines.join('\n').trim();
            }

            currentChapterTitleElem.textContent = chapter.title;
            contentArea.textContent = text;
            
            listView.classList.add('hidden');
            readerView.classList.remove('hidden');
            document.getElementById('site-header').classList.add('hidden');
            
            window.scrollTo(0, 0);
            updateNavButtons();
            window.location.hash = `chapter-${index + 1}`;
        } catch (error) {
            console.error('Error loading manuscript:', error);
            alert('파일을 불러오는 데 실패했습니다.');
        }
    }

    function updateNavButtons() {
        prevBtn.style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
        nextBtn.style.visibility = currentIndex < config.chapters.length - 1 ? 'visible' : 'hidden';
    }

    function changeFontSize(delta) {
        currentFontSize = Math.max(0.8, Math.min(2.5, currentFontSize + delta));
        contentArea.style.fontSize = `${currentFontSize}rem`;
        localStorage.setItem('novel-font-size', currentFontSize);
    }

    backBtn.addEventListener('click', () => {
        listView.classList.remove('hidden');
        readerView.classList.add('hidden');
        document.getElementById('site-header').classList.remove('hidden');
        window.location.hash = '';
        window.scrollTo(0, 0);
    });

    prevBtn.addEventListener('click', () => openReader(currentIndex - 1));
    nextBtn.addEventListener('click', () => openReader(currentIndex + 1));
    
    fontDecreaseBtn.addEventListener('click', () => changeFontSize(-0.1));
    fontIncreaseBtn.addEventListener('click', () => changeFontSize(0.1));

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash;
        if (!hash) {
            backBtn.click();
        } else {
            handleInitialHash();
        }
    });

    function handleInitialHash() {
        const hash = window.location.hash;
        if (hash.startsWith('#chapter-')) {
            const index = parseInt(hash.replace('#chapter-', '')) - 1;
            if (index >= 0 && index < config.chapters.length && index !== currentIndex) {
                openReader(index);
            }
        }
    }

    loadConfig();
});
