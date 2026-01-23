import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import frontMatter from 'front-matter';

const config = {
    srcDir: './src',
    contentDir: './content',
    outDir: './public',
    siteTitle: 'My Minimal Blog'
};

// Ensure output directory exists
if (fs.existsSync(config.outDir)) {
    fs.rmSync(config.outDir, { recursive: true, force: true });
}
fs.mkdirSync(config.outDir);

// Copy CSS
fs.copyFileSync(path.join(config.srcDir, 'style.css'), path.join(config.outDir, 'style.css'));

// Read Layout
const layoutTemplate = fs.readFileSync(path.join(config.srcDir, 'layout.html'), 'utf-8');

// Helper to render page
function renderPage(title, description, content, filename) {
    let page = layoutTemplate
        .replace('{{title}}', title)
        .replace('{{description}}', description || '')
        .replace('{{content}}', content);
    
    fs.writeFileSync(path.join(config.outDir, filename), page);
    console.log(`Generated: ${filename}`);
}

// Process Content
const posts = [];
const files = fs.readdirSync(config.contentDir);

files.forEach(file => {
    if (path.extname(file) === '.md') {
        const content = fs.readFileSync(path.join(config.contentDir, file), 'utf-8');
        const data = frontMatter(content);
        const htmlContent = marked.parse(data.body);
        
        // Save post data for index
        posts.push({
            title: data.attributes.title,
            date: data.attributes.date,
            description: data.attributes.description,
            slug: path.basename(file, '.md')
        });

        // Render individual post page
        const postHtml = `
            <article>
                <div class="post-meta">${new Date(data.attributes.date).toLocaleDateString()}</div>
                ${htmlContent}
            </article>
        `;
        renderPage(data.attributes.title, data.attributes.description, postHtml, path.basename(file, '.md') + '.html');
    }
});

// Sort posts by date
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Generate Index Page
const indexHtml = `
    <ul class="post-list">
        ${posts.map(post => `
            <li class="post-item">
                <a href="/${post.slug}.html">${post.title}</a>
                <span class="post-item-date">${new Date(post.date).toLocaleDateString()}</span>
                ${post.description ? `<p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #666;">${post.description}</p>` : ''}
            </li>
        `).join('')}
    </ul>
`;

renderPage('首页', '欢迎来到我的极简博客', indexHtml, 'index.html');

console.log('Build complete!');
