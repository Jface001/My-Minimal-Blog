import fs from 'fs';
import path from 'path';
import frontMatter from 'front-matter';

const OLD_BLOG_POSTS_DIR = '/Users/jface/work/07_vibe_coding/old_blog/source/_posts';
const OLD_BLOG_IMG_DIR = '/Users/jface/work/07_vibe_coding/old_blog/source/img/post';
const NEW_BLOG_CONTENT_DIR = '/Users/jface/work/07_vibe_coding/my-minimal-blog/content';
const NEW_BLOG_IMAGES_DIR = '/Users/jface/work/07_vibe_coding/my-minimal-blog/content/images';

// Ensure new images directory exists
if (!fs.existsSync(NEW_BLOG_IMAGES_DIR)) {
    fs.mkdirSync(NEW_BLOG_IMAGES_DIR, { recursive: true });
}

// Helper to copy images
function copyImages() {
    if (fs.existsSync(OLD_BLOG_IMG_DIR)) {
        const images = fs.readdirSync(OLD_BLOG_IMG_DIR);
        images.forEach(img => {
            const srcPath = path.join(OLD_BLOG_IMG_DIR, img);
            const destPath = path.join(NEW_BLOG_IMAGES_DIR, img);
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied image: ${img}`);
        });
    } else {
        console.log('No old images directory found.');
    }
}

// Helper to process posts
function processPosts() {
    const files = fs.readdirSync(OLD_BLOG_POSTS_DIR);
    
    files.forEach(file => {
        if (path.extname(file) === '.md') {
            const oldPath = path.join(OLD_BLOG_POSTS_DIR, file);
            const content = fs.readFileSync(oldPath, 'utf-8');
            const parsed = frontMatter(content);
            
            // Map Metadata
            const title = parsed.attributes.title || path.basename(file, '.md');
            const date = parsed.attributes.date ? new Date(parsed.attributes.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            
            // Handle tags
            let tags = parsed.attributes.tags || [];
            if (typeof tags === 'string') {
                tags = [tags];
            }
            // Filter out null/undefined tags just in case
            tags = tags.filter(t => t);

            // Handle category
            let category = parsed.attributes.categories;
            if (Array.isArray(category)) {
                category = category[0]; // Pick first category
            }
            if (!category) category = '未分类';

            const author = '惊羽'; // Default author

            // Handle cover image
            let cover = parsed.attributes.index_img || parsed.attributes.banner_img || null;
            if (cover) {
                cover = cover.replace(/\/img\/post\//g, '/images/');
            }

            // Create new Front Matter
            // Note: front-matter parser might return title with quotes if it had special chars, but usually it's clean.
            // We should ensure tags are properly formatted.
            const tagsString = tags.map(t => `${t}`).join(', ');

            const newFrontMatterLines = [
                '---',
                `title: ${title}`,
                `date: ${date}`,
                `description: ${parsed.attributes.description || ''}`,
                `tags: [${tagsString}]`,
                `category: ${category}`,
                `author: ${author}`
            ];

            if (cover) {
                newFrontMatterLines.push(`cover: ${cover}`);
            }

            newFrontMatterLines.push('---', '');
            const newFrontMatter = newFrontMatterLines.join('\n');

            // Process Body Content
            let body = parsed.body;
            
            // Replace image paths: /img/post/ -> /images/
            body = body.replace(/\/img\/post\//g, '/images/');

            // Write to new file
            const newPath = path.join(NEW_BLOG_CONTENT_DIR, file);
            fs.writeFileSync(newPath, newFrontMatter + body);
            console.log(`Migrated: ${file}`);
        }
    });
}

console.log('Starting migration...');
copyImages();
processPosts();
console.log('Migration complete!');
