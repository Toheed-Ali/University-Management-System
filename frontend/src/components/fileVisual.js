const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'avif'];
const VIDEO_EXTS = ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi', 'flv', 'wmv', 'm4v', '3gp'];
const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus', 'aiff'];
const PDF_EXTS = ['pdf'];
const ZIP_EXTS = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz'];
const SHEET_EXTS = ['xlsx', 'xls', 'csv', 'tsv', 'ods'];
const DOC_EXTS = ['doc', 'docx', 'odt', 'rtf'];
const SLIDE_EXTS = ['ppt', 'pptx', 'odp'];
const TEXT_EXTS = ['txt', 'log', 'md', 'markdown', 'ini', 'cfg', 'conf', 'env', 'gitignore', 'editorconfig', 'toml'];
export const CODE_EXTS = {
    js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
    py: 'python', java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp',
    h: 'cpp', hpp: 'cpp', cc: 'cpp',
    html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
    json: 'json', jsonc: 'json', json5: 'json',
    xml: 'xml', yaml: 'yaml', yml: 'yaml',
    sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'bash',
    bat: 'batch', cmd: 'batch', ps1: 'powershell',
    sql: 'sql', graphql: 'graphql', gql: 'graphql',
    php: 'php', rb: 'ruby', go: 'go', rs: 'rust',
    kt: 'kotlin', kts: 'kotlin', swift: 'swift', dart: 'dart',
    lua: 'lua', r: 'r', scala: 'scala', ex: 'elixir', exs: 'elixir',
    erl: 'erlang', hs: 'haskell', clj: 'clojure', fs: 'fsharp',
    vue: 'html', svelte: 'html', astro: 'html',
    dockerfile: 'docker', makefile: 'makefile',
    tf: 'hcl', hcl: 'hcl', proto: 'protobuf',
    asm: 'asm', lst: 'asm',
};

export const classify = (ext) => {
    if (IMAGE_EXTS.includes(ext)) return 'image';
    if (VIDEO_EXTS.includes(ext)) return 'video';
    if (AUDIO_EXTS.includes(ext)) return 'audio';
    if (PDF_EXTS.includes(ext)) return 'pdf';
    if (ZIP_EXTS.includes(ext)) return 'zip';
    if (SHEET_EXTS.includes(ext)) return 'sheet';
    if (DOC_EXTS.includes(ext)) return 'doc';
    if (SLIDE_EXTS.includes(ext)) return 'slide';
    if (TEXT_EXTS.includes(ext)) return 'text';
    if (CODE_EXTS[ext]) return 'code';
    return 'unknown';
};

export const getFileVisual = (fileName = '') => {
    const ext = fileName.split('.').pop().toLowerCase();
    const type = classify(ext);
    const map = {
        pdf: { icon: 'picture_as_pdf', color: '#EF4444', label: 'PDF Document' },
        image: { icon: 'image', color: '#3B82F6', label: 'Image' },
        video: { icon: 'movie', color: '#8B5CF6', label: 'Video' },
        audio: { icon: 'audio_file', color: '#10B981', label: 'Audio' },
        zip: { icon: 'folder_zip', color: '#F59E0B', label: 'Archive' },
        sheet: { icon: 'table_chart', color: '#16A34A', label: ext.toUpperCase() },
        doc: { icon: 'description', color: '#2563EB', label: 'Document' },
        slide: { icon: 'slideshow', color: '#EA580C', label: 'Presentation' },
        text: { icon: 'article', color: '#6B7280', label: 'Text File' },
        code: { icon: 'terminal', color: '#1A73E8', label: (CODE_EXTS[ext] || ext).toUpperCase() },
        unknown: { icon: 'draft', color: '#9CA3AF', label: ext ? ext.toUpperCase() + ' File' : 'File' },
    };
    return map[type] || map.unknown;
};
