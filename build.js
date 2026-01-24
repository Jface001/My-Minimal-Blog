import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import frontMatter from 'front-matter';
import hljs from 'highlight.js';

const config = {
    srcDir: './src',
    contentDir: './content',
    imagesDir: './content/images',
    outDir: './public',
    siteTitle: '惊羽的博客',
    author: '惊羽',
    navCategories: ['杂货铺', '数据仓库'] // Optional: Specify categories to show in nav. Leave empty to show all.
};

// Configure marked with highlight.js and custom renderer
const renderer = new marked.Renderer();
renderer.code = function({ text, lang }) {
    const validLang = !!(lang && hljs.getLanguage(lang));
    const highlighted = validLang ? hljs.highlight(text, { language: lang }).value : hljs.highlightAuto(text).value;
    return `<pre><code class="hljs ${lang || ''}">${highlighted}</code></pre>`;
};

marked.use({ renderer });

// Ensure output directory exists
if (fs.existsSync(config.outDir)) {
    fs.rmSync(config.outDir, { recursive: true, force: true });
}
fs.mkdirSync(config.outDir);
fs.mkdirSync(path.join(config.outDir, 'images'));
fs.mkdirSync(path.join(config.outDir, 'tags'));
fs.mkdirSync(path.join(config.outDir, 'categories'));

// Copy CSS
fs.copyFileSync(path.join(config.srcDir, 'style.css'), path.join(config.outDir, 'style.css'));

// Copy Images if exist
if (fs.existsSync(config.imagesDir)) {
    const images = fs.readdirSync(config.imagesDir);
    images.forEach(img => {
        fs.copyFileSync(path.join(config.imagesDir, img), path.join(config.outDir, 'images', img));
    });
}

// Read Layout
const layoutTemplate = fs.readFileSync(path.join(config.srcDir, 'layout.html'), 'utf-8');

// Helper to format date as YYYY-MM-DD
const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
};

// 1. First Pass: Read all files and collect data
const posts = [];
let aboutPost = null; // Store about post data
const files = fs.readdirSync(config.contentDir);
const tagsMap = new Map();
const categoriesMap = new Map();

files.forEach(file => {
    if (path.extname(file) === '.md') {
        const content = fs.readFileSync(path.join(config.contentDir, file), 'utf-8');
        const data = frontMatter(content);
        const slug = path.basename(file, '.md');
        
        // Helper to extract first image from content
        const getFirstImage = (content) => {
            const match = content.match(/!\[.*?\]\((.*?)\)/);
            return match ? match[1] : null;
        };

        const coverImage = data.attributes.cover || getFirstImage(data.body);

        // Helper to generate description from content if missing
        let description = data.attributes.description;
        if (!description) {
            // Remove markdown syntax, newlines, and images to get plain text
            const plainText = data.body
                .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
                .replace(/\[.*?\]\(.*?\)/g, '$1') // Remove links but keep text
                .replace(/#+\s/g, '') // Remove headings
                .replace(/(\r\n|\n|\r)/gm, ' ') // Replace newlines with spaces
                .replace(/\s+/g, ' ') // Collapse multiple spaces
                .trim();
            description = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
        }

        // TOC toggle script handling
        // Move inline script logic to global layout script for smoother transitions if needed
        // For now, we keep it simple.

        // Handle tags: Support both array (new format) and space-separated string (old hexo format)
        let tags = [];
        if (Array.isArray(data.attributes.tags)) {
            tags = data.attributes.tags;
        } else if (typeof data.attributes.tags === 'string') {
            // Split by space, comma, or brackets if present
            tags = data.attributes.tags.split(/[\s,\[\]]+/).filter(t => t.length > 0);
        }

        // Save post data
        const postData = {
            title: data.attributes.title,
            date: data.attributes.date,
            description: description,
            tags: tags,
            category: data.attributes.category || '未分类',
            slug: slug,
            body: data.body, // Store body for second pass
            author: data.attributes.author || config.author,
            cover: coverImage
        };

        if (slug === 'about') {
            aboutPost = postData;
        } else {
            posts.push(postData);

            // Collect tags
            postData.tags.forEach(tag => {
                if (!tagsMap.has(tag)) {
                    tagsMap.set(tag, []);
                }
                tagsMap.get(tag).push(postData);
            });

            // Collect categories
            const category = postData.category;
            if (!categoriesMap.has(category)) {
                categoriesMap.set(category, []);
            }
            categoriesMap.get(category).push(postData);
        }
    }
});

// Sort posts by date
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// 2. Build Navigation Links (Dynamic Categories)
let navLinksHtml = '';

// Add categories to nav
const categoriesToShow = config.navCategories.length > 0 
    ? config.navCategories 
    : Array.from(categoriesMap.keys()).sort().filter(c => c !== '未分类');

categoriesToShow.forEach(cat => {
    // Only add if category exists (for manual config safety)
    if (categoriesMap.has(cat)) {
        navLinksHtml += `<a href="/categories/${cat}.html">${cat}</a>`;
    }
});

navLinksHtml += `<a href="/about.html">关于</a>`;

// Helper to render page with dynamic nav
function renderPage(title, description, content, filename) {
    let page = layoutTemplate
        .replace('{{title}}', title)
        .replace('{{siteTitle}}', config.siteTitle)
        .replace('{{navLinks}}', navLinksHtml) // Inject dynamic nav
        .replace('{{description}}', description || '')
        .replace('{{content}}', content);
    
    fs.writeFileSync(path.join(config.outDir, filename), page);
    console.log(`Generated: ${filename}`);
}

// 3. Second Pass: Render all pages

// Render Individual Posts
posts.forEach(post => {
    // Generate TOC
    const toc = [];
    const renderer = new marked.Renderer();
    
    // Override heading renderer to collect TOC items and add IDs
    renderer.heading = function({ text, depth, raw }) {
        // Use text content for ID generation, NOT raw (which includes ## prefix)
        const content = text || '';
        
        // Robust ID generation
        let anchor = content.toString().toLowerCase()
            .trim()
            .replace(/\s+/g, '-')          // Replace spaces with -
            .replace(/[^\w\u4e00-\u9fa5\-]+/g, '') // Remove all non-word chars
            .replace(/\-\-+/g, '-');       // Replace multiple - with single -
            
        // Fallback for empty anchors
        if (!anchor || anchor.length === 0) {
            anchor = `section-${toc.length}`;
        }
        
        toc.push({
            anchor: anchor,
            level: depth,
            text: text
        });
        return `<h${depth} id="${anchor}">${text}</h${depth}>`;
    };
    
    // Configure code highlighting
    renderer.code = function({ text, lang }) {
        const validLang = !!(lang && hljs.getLanguage(lang));
        const highlighted = validLang ? hljs.highlight(text, { language: lang }).value : hljs.highlightAuto(text).value;
        return `<pre><code class="hljs ${lang || ''}">${highlighted}</code></pre>`;
    };

    const htmlContent = marked.parse(post.body, { renderer: renderer });
    const tagsHtml = (post.tags || []).map(tag => `<a href="/tags/${tag}.html" class="tag">#${tag}</a>`).join('');
    
    // Breadcrumb logic
    let breadcrumbHtml = '';
    if (post.category && post.category !== '未分类') {
        // Use trim to remove whitespace
        breadcrumbHtml = `<nav class="breadcrumb"><a href="/categories/${post.category}.html">${post.category}</a><span class="sep">»</span><span class="current">${post.title}</span></nav>`;
    }

    // Generate TOC HTML
    let tocHtml = '';
    if (toc.length > 0) {
        tocHtml = `
        <div class="toc-container">
            <button class="toc-toggle" id="toc-toggle">目录</button>
            <div class="toc-content" id="toc-content">
                <ul>
                    ${toc.map(item => `
                        <li class="toc-level-${item.level}">
                            <a href="#${item.anchor}">${item.text}</a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
        `;
    }

    const postHtml = `
        <article class="post-detail">
            ${tocHtml}
            ${breadcrumbHtml}
            
            <h1 class="post-title-large">${post.title}</h1>
            
            <div class="post-meta">
                <div class="meta-primary">
                    <span class="meta-item">${formatDate(post.date)}</span>
                    <span class="meta-sep">·</span>
                    <span class="meta-item">${post.author}</span>
                </div>
                ${tagsHtml ? `<div class="meta-tags">${tagsHtml}</div>` : ''}
            </div>
            
            <div class="post-content">
                ${htmlContent}
            </div>
        </article>
        <div id="comments-section" style="margin-top: 50px; padding-top: 20px; border-top: 1px solid var(--border-color);">
            <h3>评论与互动</h3>
            <script src="https://giscus.app/client.js"
                data-repo="Jface001/My-Minimal-Blog"
                data-repo-id="R_kgDONsU0_w"
                data-category="Announcements"
                data-category-id="DIC_kwDONsU0_84CmI6Q"
                data-mapping="pathname"
                data-strict="0"
                data-reactions-enabled="1"
                data-emit-metadata="0"
                data-input-position="bottom"
                data-theme="light"
                data-lang="zh-CN"
                crossorigin="anonymous"
                async>
            </script>
        </div>
    `;
    renderPage(post.title, post.description, postHtml, post.slug + '.html');
});

// Generate Post List HTML Helper
const generatePostListHtml = (postList) => {
    return `
    <ul class="post-list">
        ${postList.map(post => {
            const tagsHtml = (post.tags || []).map(tag => `<a href="/tags/${tag}.html" class="tag-small">#${tag}</a>`).join('');
            return `
            <li class="post-item">
                <div class="post-item-content">
                    <div class="post-text">
                        <a href="/${post.slug}.html" class="post-title">${post.title}</a>
                        ${post.description ? `<p class="post-desc">${post.description}</p>` : ''}
                        <div class="post-item-meta">
                            <div class="meta-primary" style="flex-wrap: wrap;">
                                <span class="meta-item">${formatDate(post.date)}</span>
                                ${tagsHtml ? `<span class="meta-sep">·</span>${tagsHtml}` : ''}
                            </div>
                        </div>
                    </div>
                    ${post.cover ? `
                    <div class="post-cover-wrapper">
                        <a href="/${post.slug}.html" class="post-cover">
                            <img src="${post.cover}" alt="${post.title}" loading="lazy">
                        </a>
                    </div>
                    ` : ''}
                </div>
            </li>
            `;
        }).join('')}
    </ul>
    `;
};

// Render Index
const RECENT_POSTS_LIMIT = 10;
const recentPosts = posts.slice(0, RECENT_POSTS_LIMIT);
const viewAllLink = `
    <div style="text-align: center; margin-top: 40px;">
        <a href="/archives.html" style="display: inline-block; padding: 10px 20px; border: 1px solid var(--border-color); border-radius: 6px; text-decoration: none; color: var(--text-color); font-family: var(--font-primary); transition: all 0.2s;">
            查看所有文章 (${posts.length})
        </a>
    </div>
`;
renderPage('首页', '欢迎来到我的极简博客', generatePostListHtml(recentPosts) + viewAllLink, 'index.html');

// Render Archives Page
const archivesHtml = `
    <h1 style="margin-bottom: 40px;">所有文章</h1>
    ${generatePostListHtml(posts)}
`;
renderPage('归档', '所有文章列表', archivesHtml, 'archives.html');

// Render Tag Pages
tagsMap.forEach((tagPosts, tag) => {
    tagPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    const tagHtml = `
        <h1>标签: ${tag}</h1>
        ${generatePostListHtml(tagPosts)}
    `;
    renderPage(`标签: ${tag}`, `查看所有标签为 ${tag} 的文章`, tagHtml, `tags/${tag}.html`);
});

// Render Category Pages
categoriesMap.forEach((catPosts, category) => {
    catPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    const catHtml = `
        <h1>分类: ${category}</h1>
        ${generatePostListHtml(catPosts)}
    `;
    renderPage(`分类: ${category}`, `查看所有分类为 ${category} 的文章`, catHtml, `categories/${category}.html`);
});

// Render Categories List Page (Optional, but good to have)
const categoriesListHtml = `
    <h1>所有分类</h1>
    <ul class="category-list">
        ${Array.from(categoriesMap.keys()).map(cat => `
            <li><a href="/categories/${cat}.html">${cat} (${categoriesMap.get(cat).length})</a></li>
        `).join('')}
    </ul>
`;
renderPage('所有分类', '博客文章分类列表', categoriesListHtml, 'categories.html');

// Render About Page
if (aboutPost) {
    const htmlContent = marked.parse(aboutPost.body, { renderer: new marked.Renderer() });
    const aboutHtml = `
        <article class="post-detail">
            <h1 class="post-title-large" style="margin-bottom: 40px;">${aboutPost.title}</h1>
            <div class="post-content">
                ${htmlContent}
            </div>
        </article>
    `;
    renderPage(aboutPost.title, aboutPost.description, aboutHtml, 'about.html');
}

console.log('Build complete!');
