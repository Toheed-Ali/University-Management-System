import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';
import { renderAsync } from 'docx-preview';
import JSZip from 'jszip';
import { classify, getFileVisual, CODE_EXTS } from './fileVisual';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = ({ label = 'Loading…' }) => (
    <div style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: '2rem', height: '2rem', border: '3px solid rgba(255,255,255,0.15)', borderTop: '3px solid #1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '0.9rem' }}>{label}</span>
    </div>
);

// ─── Error ────────────────────────────────────────────────────────────────────

const ErrorBox = ({ msg, onDownload }) => (
    <div style={{ textAlign: 'center', color: 'white', backgroundColor: 'rgba(239,68,68,0.12)', padding: '2.5rem', borderRadius: '1rem', maxWidth: '304px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem', color: '#f87171' }}>error_outline</span>
        <p style={{ color: '#fca5a5', marginBottom: onDownload ? '1.5rem' : 0 }}>{msg}</p>
        {onDownload && (
            <button onClick={onDownload} style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '2rem', cursor: 'pointer', fontWeight: 500 }}>
                Download instead
            </button>
        )}
    </div>
);

// ─── PDF Viewer ───────────────────────────────────────────────────────────────

const PdfViewer = ({ blobUrl, onError, onNumPages, onPageChange }) => {
    const [numPages, setNumPages] = useState(null);
    const [width, setWidth] = useState(860);
    const pageRefs = useRef([]);
    const observerRef = useRef(null);

    useEffect(() => {
        const upd = () => setWidth(Math.min(Math.floor(window.innerWidth * 0.82), 1000));
        upd();
        window.addEventListener('resize', upd);
        return () => window.removeEventListener('resize', upd);
    }, []);

    useEffect(() => {
        if (!numPages) return;
        observerRef.current = new IntersectionObserver((entries) => {
            let best = null;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
                }
            });
            if (best && onPageChange) {
                onPageChange(parseInt(best.target.getAttribute('data-page-num'), 10));
            }
        }, { threshold: [0.2, 0.5, 0.8] });
        pageRefs.current.forEach(ref => { if (ref) observerRef.current.observe(ref); });
        return () => { if (observerRef.current) observerRef.current.disconnect(); };
    }, [numPages, onPageChange]);

    const handleLoadSuccess = ({ numPages: n }) => {
        setNumPages(n);
        if (onNumPages) onNumPages(n);
        if (onPageChange) onPageChange(1);
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Document
                file={blobUrl}
                onLoadSuccess={handleLoadSuccess}
                onLoadError={onError}
                loading={<Spinner label="Rendering PDF…" />}
            >
                {numPages && Array.from({ length: numPages }, (_, i) => (
                    <div
                        key={i}
                        data-page-num={i + 1}
                        ref={el => { pageRefs.current[i] = el; }}
                        style={{ marginBottom: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', borderRadius: '2px' }}
                    >
                        <Page
                            pageNumber={i + 1}
                            width={width}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                        />
                    </div>
                ))}
            </Document>
            {numPages && (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.5rem', paddingBottom: '2rem' }}>
                    {numPages} page{numPages > 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
};

// ─── Spreadsheet Viewer ───────────────────────────────────────────────────────

const SheetViewer = ({ blob, ext }) => {
    const [sheetNames, setSheetNames] = useState([]);
    const [activeSheet, setActiveSheet] = useState(0);
    const [html, setHtml] = useState('');
    const [error, setError] = useState('');
    const wbRef = useRef(null);

    useEffect(() => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                wbRef.current = wb;
                setSheetNames(wb.SheetNames);
                setActiveSheet(0);
                const rawHtml = XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]], { editable: false });
                setHtml(DOMPurify.sanitize(rawHtml));
            } catch (err) {
                setError('Failed to parse spreadsheet: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(blob);
    }, [blob]);

    const switchSheet = useCallback((idx) => {
        const wb = wbRef.current;
        if (!wb) return;
        const ws = wb.Sheets[wb.SheetNames[idx]];
        const rawHtml = XLSX.utils.sheet_to_html(ws, { editable: false });
        setHtml(DOMPurify.sanitize(rawHtml));
        setActiveSheet(idx);
    }, []);

    if (error) return <ErrorBox msg={error} />;
    if (!html) return <Spinner label="Parsing spreadsheet…" />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: '0.5rem', overflow: 'hidden' }}>
            {sheetNames.length > 1 && (
                <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', flexShrink: 0, overflowX: 'auto' }}>
                    {sheetNames.map((name, i) => (
                        <button key={i} onClick={() => switchSheet(i)} style={{
                            padding: '0.35rem 0.85rem', borderRadius: '0.35rem', border: 'none',
                            background: i === activeSheet ? '#1a73e8' : 'white',
                            color: i === activeSheet ? 'white' : '#374151',
                            cursor: 'pointer', fontSize: '0.82rem',
                            fontWeight: i === activeSheet ? 600 : 400,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', whiteSpace: 'nowrap',
                        }}>
                            {name}
                        </button>
                    ))}
                </div>
            )}
            <div style={{ overflow: 'auto', flex: 1, padding: '0.5rem' }}>
                <style>{`
                    .xlsx-table table  { border-collapse: collapse; font-size: 0.82rem; font-family: monospace; color: #1f2937; }
                    .xlsx-table td,
                    .xlsx-table th     { border: 1px solid #d1d5db; padding: 4px 10px; white-space: nowrap; }
                    .xlsx-table tr:first-child td,
                    .xlsx-table th     { background: #f8fafc; font-weight: 600; position: sticky; top: 0; color: #374151; }
                    .xlsx-table tr:hover td { background: #f0f9ff; }
                `}</style>
                <div className="xlsx-table" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
        </div>
    );
};

// ─── Code / Text Viewer ───────────────────────────────────────────────────────

const CodeViewer = ({ content, ext }) => {
    const lang = CODE_EXTS[ext] || 'text';
    return (
        <div style={{ width: '100%', height: '100%', overflow: 'auto', backgroundColor: '#1e1e1e', borderRadius: '0.5rem' }}>
            <SyntaxHighlighter
                language={lang}
                style={vscDarkPlus}
                showLineNumbers
                wrapLongLines={false}
                customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.875rem', minHeight: '100%', background: '#1e1e1e' }}
            >
                {content}
            </SyntaxHighlighter>
        </div>
    );
};

// ─── Word Viewer ──────────────────────────────────────────────────────────────

const WordViewer = ({ blob, onNumPages, onPageChange }) => {
    const containerRef = useRef(null);
    const obsRef = useRef(null);

    useEffect(() => {
        if (!blob || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        if (obsRef.current) { obsRef.current.disconnect(); obsRef.current = null; }

        let cancelled = false;

        const load = async () => {
            try {
                try {
                    const zip = await JSZip.loadAsync(blob);
                    const appXml = await zip.file("docProps/app.xml").async("string");
                    const match = appXml.match(/<Pages>(\d+)<\/Pages>/);
                    if (match && onNumPages) onNumPages(parseInt(match[1], 10));
                } catch (e) {
                    console.warn("Word metadata count failed:", e);
                }

                await renderAsync(blob, containerRef.current, null, {
                    className: 'docx',
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    renderPages: true,
                    renderFonts: true,
                    useBase64URL: true,
                    debug: false,
                });

                if (cancelled || !containerRef.current) return;

                const findPages = () => {
                    const pages = containerRef.current.querySelectorAll('.docx-page');
                    if (pages.length > 0) {
                        if (onNumPages) onNumPages(pages.length);
                        if (onPageChange) onPageChange(1);

                        obsRef.current = new IntersectionObserver((entries) => {
                            let best = null;
                            entries.forEach(e => {
                                if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e;
                            });
                            if (best && onPageChange) {
                                const idx = Array.from(pages).indexOf(best.target);
                                if (idx !== -1) onPageChange(idx + 1);
                            }
                        }, { threshold: [0.1, 0.4, 0.7] });
                        pages.forEach(p => obsRef.current.observe(p));
                    }
                };

                setTimeout(findPages, 150);

            } catch (err) {
                console.error('Docx render error:', err);
            }
        };

        load();

        return () => {
            cancelled = true;
            if (obsRef.current) { obsRef.current.disconnect(); obsRef.current = null; }
        };
    }, [blob, onNumPages, onPageChange]);

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <style>{`
                .docx-container { width: 100%; display: flex; flex-direction: column; alignItems: center; }
                .docx-wrapper { 
                    background: transparent !important; padding: 0 !important; gap: 2rem !important; 
                    display: flex !important; flex-direction: column !important; align-items: center !important; 
                }
                .docx-page {
                    background: white !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
                    margin-bottom: 0 !important;
                    position: relative;
                }
                .docx table { border-collapse: collapse; width: 100% !important; margin: 1rem 0; }
                .docx td, .docx th { border: 1px solid #ddd; padding: 6px; }
            `}</style>
            <div ref={containerRef} className="docx-container" />
        </div>
    );
};

// ─── ZIP Viewer ───────────────────────────────────────────────────────────────

const ZipViewer = ({ files, originalName, onDownload }) => {
    const fmt = (b) => {
        if (!b) return '0 B';
        const k = 1024, s = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(b) / Math.log(k));
        return (b / Math.pow(k, i)).toFixed(1) + ' ' + s[i];
    };
    return (
        <div style={{ width: '90%', maxWidth: '720px', backgroundColor: '#fff', borderRadius: '0.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f8fafc', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: '#F59E0B' }}>folder_zip</span>
                <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#111827' }}>{originalName}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{files.length} file{files.length !== 1 ? 's' : ''}</div>
                </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '0.6rem 1rem', color: '#6b7280', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                            <th style={{ textAlign: 'right', padding: '0.6rem 1rem', color: '#6b7280', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid #e5e7eb' }}>Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.map((f, i) => {
                            const { icon, color } = getFileVisual(f.name);
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td style={{ padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.15rem', color, flexShrink: 0 }}>{icon}</span>
                                        <span style={{ fontSize: '0.875rem', color: '#374151', wordBreak: 'break-all' }}>{f.name}</span>
                                    </td>
                                    <td style={{ padding: '0.7rem 1rem', textAlign: 'right', color: '#9ca3af', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{fmt(f.size)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ─── Image Viewer ─────────────────────────────────────────────────────────────

const ImageViewer = ({ src, alt }) => {
    const [zoom, setZoom] = useState(1);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%', height: '100%' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {[0.5, 0.75, 1, 1.5, 2].map(z => (
                    <button key={z} onClick={() => setZoom(z)} style={{
                        padding: '0.2rem 0.6rem', borderRadius: '1rem',
                        border: '1px solid rgba(255,255,255,0.25)',
                        background: zoom === z ? 'rgba(255,255,255,0.25)' : 'transparent',
                        color: 'white', cursor: 'pointer', fontSize: '0.78rem',
                    }}>
                        {z === 1 ? '100%' : (z * 100) + '%'}
                    </button>
                ))}
            </div>
            <div style={{ overflow: 'auto', flex: 1, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                <img src={src} alt={alt} style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', maxWidth: '100%', transition: 'transform 0.2s', imageRendering: 'auto' }} />
            </div>
        </div>
    );
};

// ─── Video Viewer ─────────────────────────────────────────────────────────────

const VideoViewer = ({ src, ext }) => (
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <video controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', outline: 'none' }}>
            <source src={src} type={`video/${ext === 'mov' ? 'quicktime' : ext === 'mkv' ? 'x-matroska' : ext}`} />
            <source src={src} type="video/mp4" />
            Your browser does not support this video format.
        </video>
    </div>
);

// ─── Audio Viewer ─────────────────────────────────────────────────────────────

const AudioViewer = ({ src, ext, originalName }) => (
    <div style={{ padding: '3rem 2rem', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '1.5rem', textAlign: 'center', minWidth: '272px', maxWidth: '384px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '6rem', color: '#10B981', display: 'block', marginBottom: '1rem' }}>audio_file</span>
        <div style={{ color: 'white', fontWeight: 500, marginBottom: '1.25rem', fontSize: '1rem', wordBreak: 'break-all' }}>{originalName}</div>
        <audio controls autoPlay style={{ width: '100%' }}>
            <source src={src} type={`audio/${ext === 'm4a' ? 'mp4' : ext === 'flac' ? 'flac' : ext}`} />
            <source src={src} type="audio/mpeg" />
            Your browser does not support this audio.
        </audio>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PowerPoint Viewer (PPTX) ─────────────────────────────────────────────────
// Parses PPTX (ZIP of XML) using JSZip — no external CDN dependencies.
// Faithfully renders: slide backgrounds, shapes, text formatting, images, tables.
// ═══════════════════════════════════════════════════════════════════════════════

// ── XML helpers ───────────────────────────────────────────────────────────────

const _parseXml = (str) => new DOMParser().parseFromString(str, 'application/xml');

const _attr = (el, ...names) => {
    for (const n of names) {
        const v = el?.getAttribute?.(n) ?? el?.getAttribute?.(n.replace(/^[a-z]+:/, ''));
        if (v != null) return v;
    }
    return null;
};

const _emu2px = (emu) => Math.round(Number(emu) / 914400 * 96);

// Resolve OOXML color to CSS hex/rgb
const _resolveColor = (el, themeColors = {}) => {
    if (!el) return null;
    const srgb = el.querySelector('srgbClr');
    if (srgb) return '#' + _attr(srgb, 'val');

    const sys = el.querySelector('sysClr');
    if (sys) { const last = _attr(sys, 'lastClr'); if (last) return '#' + last; }

    const scheme = el.querySelector('schemeClr');
    if (scheme) {
        const key = _attr(scheme, 'val');
        let hex = themeColors[key];
        if (hex) {
            const lumMod = scheme.querySelector('lumMod');
            const lumOff = scheme.querySelector('lumOff');
            if (lumMod || lumOff) {
                let r = parseInt(hex.slice(1, 3), 16);
                let g = parseInt(hex.slice(3, 5), 16);
                let b = parseInt(hex.slice(5, 7), 16);
                const mod = lumMod ? Number(_attr(lumMod, 'val')) / 100000 : 1;
                const off = lumOff ? Number(_attr(lumOff, 'val')) / 100000 : 0;
                r = Math.min(255, Math.round(r * mod + off * 255));
                g = Math.min(255, Math.round(g * mod + off * 255));
                b = Math.min(255, Math.round(b * mod + off * 255));
                return `rgb(${r},${g},${b})`;
            }
            return hex;
        }
        const DEFAULTS = {
            dk1: '#000000', lt1: '#ffffff', dk2: '#44546a', lt2: '#e8e8e8',
            accent1: '#4472c4', accent2: '#ed7d31', accent3: '#a9d18e',
            accent4: '#ffc000', accent5: '#5b9bd5', accent6: '#70ad47',
            hlink: '#0563c1', folHlink: '#954f72',
        };
        return DEFAULTS[key] || null;
    }

    const prstClr = el.querySelector('prstClr');
    if (prstClr) {
        const PRESETS = {
            white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000',
            blue: '#0000ff', yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff',
            silver: '#c0c0c0', gray: '#808080', orange: '#ffa500', navy: '#000080',
        };
        return PRESETS[_attr(prstClr, 'val')] || null;
    }
    return null;
};

// ── Parse theme colors from zip ───────────────────────────────────────────────

const _parseTheme = async (zip) => {
    const themeColors = {};
    try {
        const paths = Object.keys(zip.files).filter(p => /ppt\/theme\/theme\d*\.xml/.test(p));
        if (!paths.length) return themeColors;
        const doc = _parseXml(await zip.file(paths[0]).async('string'));
        const clrScheme = doc.querySelector('clrScheme');
        if (!clrScheme) return themeColors;
        for (const child of clrScheme.children) {
            const name = child.localName || child.tagName.split(':').pop();
            const srgb = child.querySelector('srgbClr');
            const sys = child.querySelector('sysClr');
            if (srgb) themeColors[name] = '#' + _attr(srgb, 'val');
            else if (sys) { const last = _attr(sys, 'lastClr'); if (last) themeColors[name] = '#' + last; }
        }
    } catch (e) { console.warn('Theme parse failed:', e); }
    return themeColors;
};

// ── Parse slide dimensions ────────────────────────────────────────────────────

const SLIDE_W_EMU = 9144000;
const SLIDE_H_EMU = 5143500;

const _parseDims = async (zip) => {
    try {
        const presXml = await zip.file('ppt/presentation.xml')?.async('string');
        if (!presXml) return { w: SLIDE_W_EMU, h: SLIDE_H_EMU };
        const doc = _parseXml(presXml);
        const sldSz = doc.querySelector('sldSz');
        return {
            w: parseInt(_attr(sldSz, 'cx') || SLIDE_W_EMU, 10),
            h: parseInt(_attr(sldSz, 'cy') || SLIDE_H_EMU, 10),
        };
    } catch { return { w: SLIDE_W_EMU, h: SLIDE_H_EMU }; }
};

// ── Build imageMap (rId → dataURL) for a slide ────────────────────────────────

const _buildImageMap = async (zip, relPath) => {
    const imageMap = {};
    try {
        const relsXml = await zip.file(relPath)?.async('string');
        if (!relsXml) return imageMap;
        const doc = _parseXml(relsXml);
        for (const rel of doc.querySelectorAll('Relationship')) {
            const id = _attr(rel, 'Id');
            const target = _attr(rel, 'Target') || '';
            const type = _attr(rel, 'Type') || '';
            if (!type.includes('image') || !target) continue;

            const imgPath = target.startsWith('..') ? 'ppt/' + target.replace('../', '')
                : target.startsWith('/') ? target.slice(1)
                    : 'ppt/slides/' + target;

            try {
                const f = zip.file(imgPath);
                if (!f) continue;
                const ext2 = imgPath.split('.').pop().toLowerCase();
                if (ext2 === 'emf' || ext2 === 'wmf') { imageMap[id] = null; continue; }
                const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp', tiff: 'image/tiff' };
                const mime = MIME[ext2] || 'image/png';
                imageMap[id] = `data:${mime};base64,${await f.async('base64')}`;
            } catch (e) { console.warn('Image skip:', imgPath); }
        }
    } catch (e) { console.warn('Rels parse failed:', e); }
    return imageMap;
};

// ── Parse slide background ────────────────────────────────────────────────────

const _parseBg = (cSld, themeColors, imageMap) => {
    const solidFill = cSld?.querySelector('bg solidFill') || cSld?.querySelector('bg bgPr solidFill');
    if (solidFill) return { type: 'solid', color: _resolveColor(solidFill, themeColors) };

    const gradFill = cSld?.querySelector('bg gradFill') || cSld?.querySelector('bg bgPr gradFill');
    if (gradFill) {
        const stops = Array.from(gradFill.querySelectorAll('gs')).map(gs => {
            const pos = Math.round(Number(_attr(gs, 'pos')) / 1000);
            return `${_resolveColor(gs, themeColors)} ${pos}%`;
        });
        const lin = gradFill.querySelector('lin');
        const angle = lin ? Math.round(Number(_attr(lin, 'ang')) / 60000) : 180;
        return { type: 'gradient', stops, angle };
    }

    const blipFill = cSld?.querySelector('bg blipFill') || cSld?.querySelector('bg bgPr blipFill');
    if (blipFill) {
        const blip = blipFill.querySelector('blip');
        const rId = _attr(blip, 'r:embed') || _attr(blip, 'embed');
        if (rId && imageMap[rId]) return { type: 'image', url: imageMap[rId] };
    }

    return null;
};

const _bgCss = (bg) => {
    if (!bg) return { backgroundColor: '#ffffff' };
    if (bg.type === 'solid') return { backgroundColor: bg.color || '#ffffff' };
    if (bg.type === 'gradient') return { background: `linear-gradient(${bg.angle}deg, ${bg.stops.join(', ')})` };
    if (bg.type === 'image') return { backgroundImage: `url(${bg.url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    return {};
};

// ── Parse text run ────────────────────────────────────────────────────────────

const _parseRun = (rEl, defaultFontSize, themeColors) => {
    const rPr = rEl.querySelector('rPr');
    const tEl = rEl.querySelector('t');
    if (!tEl) return null;
    const text = tEl.textContent;

    const style = {};
    const sz = _attr(rPr, 'sz');
    style.fontSize = sz ? `${Number(sz) / 100}pt` : `${defaultFontSize}pt`;
    if (_attr(rPr, 'b') === '1') style.fontWeight = 'bold';
    if (_attr(rPr, 'i') === '1') style.fontStyle = 'italic';
    const u = _attr(rPr, 'u');
    if (u && u !== 'none') style.textDecoration = 'underline';
    const strike = _attr(rPr, 'strike');
    if (strike && strike !== 'noStrike') style.textDecoration = (style.textDecoration ? style.textDecoration + ' ' : '') + 'line-through';

    const latin = rPr?.querySelector('latin');
    if (latin) {
        const tf = _attr(latin, 'typeface');
        if (tf && tf !== '+mj-lt' && tf !== '+mn-lt') style.fontFamily = `"${tf}", sans-serif`;
    }
    const sf = rPr?.querySelector('solidFill');
    const color = sf ? _resolveColor(sf, themeColors) : null;
    if (color) style.color = color;

    return { text, style };
};

// ── Parse paragraph ───────────────────────────────────────────────────────────

const _parsePara = (pEl, themeColors) => {
    const pPr = pEl.querySelector('pPr');
    const lvl = parseInt(_attr(pPr, 'lvl') || '0', 10);
    const algn = _attr(pPr, 'algn');
    const textAlign = algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : algn === 'just' ? 'justify' : 'left';
    const defRPr = pPr?.querySelector('defRPr');
    const defSz = _attr(defRPr, 'sz');
    const defaultFontSize = defSz ? Number(defSz) / 100 : 16;
    const buNone = pPr?.querySelector('buNone');
    const buChar = pPr?.querySelector('buChar');
    const buAutoNum = pPr?.querySelector('buAutoNum');
    const hasBullet = !buNone && (!!buChar || !!buAutoNum);
    const bulletChar = buChar ? _attr(buChar, 'char') : null;

    const richRuns = [];
    for (const child of pEl.children) {
        const local = child.localName || child.tagName.split(':').pop();
        if (local === 'r') {
            const rn = _parseRun(child, defaultFontSize, themeColors);
            if (rn) richRuns.push({ type: 'run', ...rn });
        } else if (local === 'br') {
            richRuns.push({ type: 'br' });
        }
    }

    return {
        richRuns,
        paraStyle: { textAlign, paddingLeft: lvl > 0 ? `${lvl * 1.2}em` : undefined, marginBottom: '0.1em', lineHeight: 1.3 },
        hasBullet,
        bulletChar,
    };
};

// ── Parse shape (sp) ──────────────────────────────────────────────────────────

const _parseShape = (sp, themeColors, imageMap) => {
    const spPr = sp.querySelector('spPr');
    if (!spPr) return null;

    const xfrm = spPr.querySelector('xfrm');
    const off = xfrm?.querySelector('off');
    const ext2 = xfrm?.querySelector('ext');
    if (!off || !ext2) return null;

    const x = _emu2px(_attr(off, 'x') || 0);
    const y = _emu2px(_attr(off, 'y') || 0);
    const w = _emu2px(_attr(ext2, 'cx') || 0);
    const h = _emu2px(_attr(ext2, 'cy') || 0);

    const rot = _attr(xfrm, 'rot');
    const flipH = _attr(xfrm, 'flipH') === '1';
    const flipV = _attr(xfrm, 'flipV') === '1';

    let transform = '';
    if (rot) transform += ` rotate(${-Number(rot) / 60000}deg)`;
    if (flipH) transform += ' scaleX(-1)';
    if (flipV) transform += ' scaleY(-1)';

    // Fill
    let fillStyle = {};
    const solidFill = spPr.querySelector(':scope > solidFill');
    const gradFill = spPr.querySelector(':scope > gradFill');
    const blipFill = spPr.querySelector(':scope > blipFill');
    const noFill = spPr.querySelector(':scope > noFill');

    if (noFill) {
        fillStyle.backgroundColor = 'transparent';
    } else if (solidFill) {
        const c = _resolveColor(solidFill, themeColors);
        if (c) fillStyle.backgroundColor = c;
    } else if (gradFill) {
        const stops = Array.from(gradFill.querySelectorAll('gs')).map(gs => {
            const pos = Math.round(Number(_attr(gs, 'pos')) / 1000);
            return `${_resolveColor(gs, themeColors)} ${pos}%`;
        });
        const lin = gradFill.querySelector('lin');
        const angle = lin ? Math.round(Number(_attr(lin, 'ang')) / 60000) : 180;
        if (stops.length) fillStyle.background = `linear-gradient(${angle}deg, ${stops.join(', ')})`;
    } else if (blipFill) {
        const blip = blipFill.querySelector('blip');
        const rId = _attr(blip, 'r:embed') || _attr(blip, 'embed');
        if (rId && imageMap[rId]) {
            fillStyle.backgroundImage = `url(${imageMap[rId]})`;
            fillStyle.backgroundSize = 'cover';
            fillStyle.backgroundPosition = 'center';
        }
    }

    // Border
    let borderStyle = {};
    const ln = spPr.querySelector(':scope > ln');
    if (ln && !ln.querySelector('noFill')) {
        const lnSolid = ln.querySelector('solidFill');
        const lnColor = lnSolid ? _resolveColor(lnSolid, themeColors) : null;
        const lnW = Math.max(1, _emu2px(_attr(ln, 'w') || 12700));
        if (lnColor) borderStyle.border = `${lnW}px solid ${lnColor}`;
    }

    // Shape geometry
    let shapeStyle = {};
    const prst = _attr(spPr.querySelector('prstGeom'), 'prst');
    if (prst === 'ellipse' || prst === 'oval') shapeStyle.borderRadius = '50%';
    else if (prst === 'roundRect') shapeStyle.borderRadius = '6.4px';

    // Text body
    let textContent = null;
    const txBody = sp.querySelector('txBody');
    if (txBody) {
        const bodyPr = txBody.querySelector('bodyPr');
        const anchor = _attr(bodyPr, 'anchor');
        const verticalAlign = anchor === 'ctr' ? 'center' : anchor === 'b' ? 'flex-end' : 'flex-start';
        const vert = _attr(bodyPr, 'vert');
        const isVertical = vert === 'vert' || vert === 'vert270';
        const insetL = _emu2px(_attr(bodyPr, 'lIns') ?? 91440);
        const insetR = _emu2px(_attr(bodyPr, 'rIns') ?? 91440);
        const insetT = _emu2px(_attr(bodyPr, 'tIns') ?? 45720);
        const insetB = _emu2px(_attr(bodyPr, 'bIns') ?? 45720);
        const paras = Array.from(txBody.querySelectorAll(':scope > p')).map(p => _parsePara(p, themeColors));
        textContent = { paras, verticalAlign, insetL, insetR, insetT, insetB, isVertical };
    }

    return { type: 'shape', x, y, w, h, fillStyle, borderStyle, shapeStyle, textContent, transform: transform.trim() };
};

// ── Parse picture (pic) ───────────────────────────────────────────────────────

const _parsePic = (pic, imageMap) => {
    const spPr = pic.querySelector('spPr');
    const blipFill = pic.querySelector('blipFill');
    const blip = blipFill?.querySelector('blip');
    const rId = _attr(blip, 'r:embed') || _attr(blip, 'embed');
    if (!spPr || !rId || !imageMap[rId]) return null;

    const xfrm = spPr.querySelector('xfrm');
    const off = xfrm?.querySelector('off');
    const ext2 = xfrm?.querySelector('ext');
    if (!off || !ext2) return null;

    const x = _emu2px(_attr(off, 'x') || 0);
    const y = _emu2px(_attr(off, 'y') || 0);
    const w = _emu2px(_attr(ext2, 'cx') || 0);
    const h = _emu2px(_attr(ext2, 'cy') || 0);
    const rot = _attr(xfrm, 'rot');
    const transform = rot ? `rotate(${-Number(rot) / 60000}deg)` : '';

    return { type: 'pic', x, y, w, h, imgSrc: imageMap[rId], transform };
};

// ── Parse table (graphicFrame) ────────────────────────────────────────────────

const _parseTable = (gf, themeColors) => {
    const spPr = gf.querySelector('spPr');
    const xfrm = spPr?.querySelector('xfrm');
    const off = xfrm?.querySelector('off');
    const ext2 = xfrm?.querySelector('ext');
    if (!off || !ext2) return null;

    const x = _emu2px(_attr(off, 'x') || 0);
    const y = _emu2px(_attr(off, 'y') || 0);
    const w = _emu2px(_attr(ext2, 'cx') || 0);
    const h = _emu2px(_attr(ext2, 'cy') || 0);

    const tbl = gf.querySelector('tbl');
    if (!tbl) return null;

    const colWidths = Array.from(tbl.querySelectorAll('gridCol')).map(gc => _emu2px(_attr(gc, 'w') || 0));
    const rows = Array.from(tbl.querySelectorAll('tr')).map(tr => {
        const trPr = tr.querySelector('trPr');
        const rowH = _emu2px(_attr(trPr, 'h') || _attr(tr, 'h') || 0);
        const cells = Array.from(tr.querySelectorAll('tc')).map(tc => {
            const paras = Array.from(tc.querySelectorAll('p')).map(p => _parsePara(p, themeColors));
            const tcPr = tc.querySelector('tcPr');
            let cellBg = {};
            const sf = tcPr?.querySelector('solidFill');
            if (sf) { const c = _resolveColor(sf, themeColors); if (c) cellBg.backgroundColor = c; }
            return {
                paras, cellBg,
                gridSpan: parseInt(_attr(tc, 'gridSpan') || '1', 10),
                rowSpan: parseInt(_attr(tc, 'rowSpan') || '1', 10),
                vMerge: _attr(tc, 'vMerge'),
                hMerge: _attr(tc, 'hMerge'),
            };
        });
        return { cells, rowH };
    });

    return { type: 'table', x, y, w, h, rows, colWidths };
};

// ── Parse one slide ───────────────────────────────────────────────────────────

const _parseSlide = async (zip, slidePath, themeColors) => {
    const slideXml = await zip.file(slidePath)?.async('string');
    if (!slideXml) return null;
    const doc = _parseXml(slideXml);

    const relPath = slidePath.replace(/ppt\/slides\/slide(\d+)\.xml/, 'ppt/slides/_rels/slide$1.xml.rels');
    const imageMap = await _buildImageMap(zip, relPath);

    const cSld = doc.querySelector('cSld');
    const bg = _parseBg(cSld, themeColors, imageMap);
    const elements = [];

    const processSpTree = (spTree) => {
        for (const child of spTree.children) {
            const local = child.localName || child.tagName.split(':').pop();
            if (local === 'sp') {
                const el = _parseShape(child, themeColors, imageMap);
                if (el) elements.push(el);
            } else if (local === 'pic') {
                const el = _parsePic(child, imageMap);
                if (el) elements.push(el);
            } else if (local === 'graphicFrame') {
                const el = _parseTable(child, themeColors);
                if (el) elements.push(el);
            } else if (local === 'grpSp') {
                processSpTree(child); // recurse into group shapes
            }
        }
    };

    const spTree = doc.querySelector('spTree');
    if (spTree) processSpTree(spTree);

    return { bg, elements };
};

// ── SlideView React component ─────────────────────────────────────────────────

const PPTX_DISPLAY_W = 800;

const PptxSlideView = ({ slide, slideW, slideH }) => {
    const scale = PPTX_DISPLAY_W / _emu2px(slideW);
    const displayH = Math.round(_emu2px(slideH) * scale);

    return (
        <div style={{
            position: 'relative',
            width: PPTX_DISPLAY_W,
            height: displayH,
            overflow: 'hidden',
            flexShrink: 0,
            ..._bgCss(slide.bg),
        }}>
            {slide.elements.map((el, i) => {
                if (el.type === 'pic') {
                    return (
                        <div key={i} style={{
                            position: 'absolute',
                            left: el.x * scale, top: el.y * scale,
                            width: el.w * scale, height: el.h * scale,
                            transform: el.transform || undefined,
                            transformOrigin: 'center center',
                            overflow: 'hidden',
                        }}>
                            <img src={el.imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                        </div>
                    );
                }

                if (el.type === 'table') {
                    return (
                        <div key={i} style={{
                            position: 'absolute',
                            left: el.x * scale, top: el.y * scale,
                            width: el.w * scale, height: el.h * scale,
                            overflow: 'hidden',
                            fontSize: `${Math.round(11 * scale)}px`,
                        }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%', height: '100%', tableLayout: 'fixed' }}>
                                <colgroup>{el.colWidths.map((cw, ci) => <col key={ci} style={{ width: cw * scale }} />)}</colgroup>
                                <tbody>
                                    {el.rows.map((row, ri) => (
                                        <tr key={ri} style={{ height: row.rowH * scale || undefined }}>
                                            {row.cells.map((cell, ci) => {
                                                if (cell.vMerge === '1' || cell.hMerge === '1') return null;
                                                return (
                                                    <td key={ci}
                                                        colSpan={cell.gridSpan > 1 ? cell.gridSpan : undefined}
                                                        rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                                                        style={{ border: '1px solid #d0d0d0', padding: '2px 4px', verticalAlign: 'middle', overflow: 'hidden', ...cell.cellBg }}
                                                    >
                                                        {cell.paras.map((para, pi) => (
                                                            <div key={pi} style={para.paraStyle}>
                                                                {para.richRuns.map((rn, ri2) =>
                                                                    rn.type === 'br' ? <br key={ri2} /> :
                                                                        <span key={ri2} style={rn.style}>{rn.text}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }

                if (el.type === 'shape') {
                    const tc = el.textContent;
                    return (
                        <div key={i} style={{
                            position: 'absolute',
                            left: el.x * scale, top: el.y * scale,
                            width: el.w * scale, height: el.h * scale,
                            transform: el.transform || undefined,
                            transformOrigin: 'center center',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: tc?.verticalAlign || 'flex-start',
                            boxSizing: 'border-box',
                            ...el.fillStyle,
                            ...el.borderStyle,
                            ...el.shapeStyle,
                        }}>
                            {tc && (
                                <div style={{
                                    paddingLeft: (tc.insetL || 0) * scale,
                                    paddingRight: (tc.insetR || 0) * scale,
                                    paddingTop: (tc.insetT || 0) * scale,
                                    paddingBottom: (tc.insetB || 0) * scale,
                                    width: '100%',
                                    overflow: 'hidden',
                                    writingMode: tc.isVertical ? 'vertical-rl' : undefined,
                                }}>
                                    {tc.paras.map((para, pi) => {
                                        const isEmpty = !para.richRuns.some(r => r.type !== 'br' && r.text);
                                        return (
                                            <div key={pi} style={{ ...para.paraStyle, minHeight: isEmpty ? `${Math.round(16 * scale)}px` : undefined }}>
                                                {para.hasBullet && para.richRuns.length > 0 && (
                                                    <span style={{ marginRight: 4 }}>{para.bulletChar || '•'}</span>
                                                )}
                                                {para.richRuns.map((rn, ri) =>
                                                    rn.type === 'br' ? <br key={ri} /> : (
                                                        <span key={ri} style={{
                                                            ...rn.style,
                                                            fontSize: rn.style?.fontSize
                                                                ? `${parseFloat(rn.style.fontSize) * scale * 1.33}px`
                                                                : `${Math.round(14 * scale)}px`,
                                                        }}>
                                                            {rn.text}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
};

// ── PptViewer main component ──────────────────────────────────────────────────

const PptViewer = ({ blob, onNumSlides, onSlideChange }) => {
    const [slides, setSlides] = useState([]);
    const [dims, setDims] = useState({ w: SLIDE_W_EMU, h: SLIDE_H_EMU });
    const [status, setStatus] = useState('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const slideRefs = useRef([]);
    const observerRef = useRef(null);
    const onNumSlidesRef = useRef(onNumSlides);
    const onSlideChangeRef = useRef(onSlideChange);

    useEffect(() => { onNumSlidesRef.current = onNumSlides; }, [onNumSlides]);
    useEffect(() => { onSlideChangeRef.current = onSlideChange; }, [onSlideChange]);

    useEffect(() => {
        if (!blob) return;
        let cancelled = false;
        setStatus('loading');
        setSlides([]);

        (async () => {
            try {
                const zip = await JSZip.loadAsync(await blob.arrayBuffer());
                const themeColors = await _parseTheme(zip);
                const d = await _parseDims(zip);
                if (!cancelled) setDims(d);

                const slidePaths = Object.keys(zip.files)
                    .filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p))
                    .sort((a, b) => {
                        const na = parseInt(a.match(/(\d+)\.xml$/)[1], 10);
                        const nb = parseInt(b.match(/(\d+)\.xml$/)[1], 10);
                        return na - nb;
                    });

                if (!slidePaths.length) {
                    if (!cancelled) { setErrorMsg('No slides found in this PPTX file.'); setStatus('error'); }
                    return;
                }

                const parsed = await Promise.all(slidePaths.map(p => _parseSlide(zip, p, themeColors)));
                if (cancelled) return;

                const valid = parsed.filter(Boolean);
                setSlides(valid);
                setStatus('ready');
                if (onNumSlidesRef.current) onNumSlidesRef.current(valid.length);
                if (onSlideChangeRef.current) onSlideChangeRef.current(1);
            } catch (err) {
                console.error('PPTX parse error:', err);
                if (!cancelled) { setErrorMsg('Failed to parse PPTX: ' + err.message); setStatus('error'); }
            }
        })();

        return () => { cancelled = true; };
    }, [blob]);

    useEffect(() => {
        if (status !== 'ready' || !slides.length) return;
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver((entries) => {
            let best = null;
            entries.forEach(e => { if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e; });
            if (best && onSlideChangeRef.current) {
                onSlideChangeRef.current(parseInt(best.target.getAttribute('data-slide-idx'), 10) + 1);
            }
        }, { threshold: [0.2, 0.5, 0.8] });

        slideRefs.current.forEach(ref => { if (ref) observerRef.current.observe(ref); });
        return () => { if (observerRef.current) observerRef.current.disconnect(); };
    }, [status, slides.length]);

    if (status === 'loading') return <Spinner label="Parsing slides…" />;

    if (status === 'error') return (
        <div style={{ color: '#fca5a5', textAlign: 'center', padding: '2rem', maxWidth: 400 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>error_outline</span>
            <p>{errorMsg}</p>
        </div>
    );

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            {slides.map((slide, i) => (
                <div
                    key={i}
                    data-slide-idx={i}
                    ref={el => { slideRefs.current[i] = el; }}
                    style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.6)', borderRadius: 4, overflow: 'hidden', flexShrink: 0, position: 'relative' }}
                >
                    <PptxSlideView slide={slide} slideW={dims.w} slideH={dims.h} />
                    <div style={{
                        position: 'absolute', bottom: 6, right: 8,
                        color: 'rgba(255,255,255,0.5)', fontSize: 11,
                        fontFamily: 'monospace', pointerEvents: 'none',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    }}>
                        {i + 1} / {slides.length}
                    </div>
                </div>
            ))}
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', paddingBottom: '2rem' }}>
                {slides.length} slide{slides.length !== 1 ? 's' : ''}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Office Fallback (doc / old ppt) ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const OfficeViewer = ({ originalName, type, onDownload }) => (
    <div style={{ textAlign: 'center', color: 'white', backgroundColor: 'rgba(255,255,255,0.06)', padding: '3rem 2.5rem', borderRadius: '1.5rem', maxWidth: '336px' }}>
        <span className="material-symbols-outlined" style={{
            fontSize: '5rem', display: 'block', marginBottom: '1rem',
            color: type === 'slide' ? '#EA580C' : '#2563EB',
        }}>
            {type === 'slide' ? 'slideshow' : 'description'}
        </span>
        <h3 style={{ margin: '0 0 0.5rem', wordBreak: 'break-all' }}>{originalName}</h3>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
            {type === 'slide' ? 'PowerPoint (PPT/ODP)' : 'Word (DOC/ODT/RTF)'} — This format requires a download to view in your Office application.
        </p>
        <button onClick={onDownload} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: type === 'slide' ? '#EA580C' : '#2563EB', color: 'white',
            padding: '0.75rem 1.75rem', borderRadius: '2rem', border: 'none',
            fontWeight: 500, cursor: 'pointer', fontSize: '0.9rem',
        }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>download</span>
            Download to View
        </button>
    </div>
);

// ─── Unknown Fallback ─────────────────────────────────────────────────────────

const UnknownViewer = ({ ext, onDownload }) => (
    <div style={{ textAlign: 'center', color: 'white', padding: '3rem', maxWidth: '304px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '5rem', display: 'block', marginBottom: '1rem', color: '#9CA3AF' }}>draft</span>
        <h3 style={{ margin: '0 0 0.5rem' }}>{ext ? ext.toUpperCase() : 'Unknown'} file</h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>No preview available for this file type.</p>
        <button onClick={onDownload} style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '0.75rem 1.75rem', borderRadius: '2rem', cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>download</span>
            Download File
        </button>
    </div>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────

const FilePreviewModal = ({ isOpen, onClose, fileName, originalName }) => {

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [mediaUrl, setMediaUrl] = useState('');
    const [textContent, setTextContent] = useState('');
    const [sheetBlob, setSheetBlob] = useState(null);
    const [zipFiles, setZipFiles] = useState(null);
    const [wordBlob, setWordBlob] = useState(null);
    const [pptBlob, setPptBlob] = useState(null);

    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const tokenRef = useRef(localStorage.getItem('token'));
    useEffect(() => { tokenRef.current = localStorage.getItem('token'); }, []);

    const authGet = useCallback((url, opts = {}) =>
        axios.get(url, {
            ...opts,
            headers: { Authorization: `Bearer ${tokenRef.current}`, ...(opts.headers || {}) },
        }), []);

    const ext = (originalName || '').split('.').pop().toLowerCase();
    const type = classify(ext);
    const apiUrl = fileName ? `/api/v1/submissions/${encodeURIComponent(fileName)}/download` : '';

    useEffect(() => {
        setPdfBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
        setMediaUrl(prev => { if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev); return ''; });
        setTextContent('');
        setSheetBlob(null);
        setZipFiles(null);
        setWordBlob(null);
        setPptBlob(null);
        setNumPages(null);
        setCurrentPage(1);
        setError('');

        if (!isOpen || !fileName) { setLoading(false); return; }
        setLoading(true);

        let cancelled = false;

        const load = async () => {
            try {
                if (type === 'pdf') {
                    const res = await authGet(apiUrl, { params: { inline: 'true' }, responseType: 'blob' });
                    if (!cancelled) setPdfBlobUrl(URL.createObjectURL(res.data));

                } else if (type === 'image') {
                    const res = await authGet(apiUrl, { params: { inline: 'true' }, responseType: 'blob' });
                    if (!cancelled) setMediaUrl(URL.createObjectURL(res.data));

                } else if (type === 'video' || type === 'audio') {
                    if (!cancelled) setMediaUrl(`${apiUrl}?token=${encodeURIComponent(tokenRef.current)}&inline=true`);

                } else if (type === 'sheet') {
                    const res = await authGet(apiUrl, { params: { inline: 'true' }, responseType: 'blob' });
                    if (!cancelled) setSheetBlob(res.data);

                } else if (type === 'code' || type === 'text') {
                    const res = await authGet(apiUrl, { params: { inline: 'true' }, responseType: 'text' });
                    if (!cancelled) setTextContent(res.data);

                } else if (type === 'zip') {
                    const res = await authGet(`/api/v1/submissions/${encodeURIComponent(fileName)}/preview`);
                    if (!cancelled) setZipFiles(res.data.data || []);

                } else if (type === 'doc' && ext === 'docx') {
                    const res = await authGet(apiUrl, { params: { inline: 'true' }, responseType: 'blob' });
                    if (!cancelled) setWordBlob(res.data);

                } else if (type === 'slide' && ext === 'pptx') {
                    const res = await authGet(apiUrl, { params: { inline: 'true' }, responseType: 'blob' });
                    if (!cancelled) setPptBlob(res.data);
                }
            } catch (err) {
                console.error('Preview load error:', err);
                if (!cancelled) setError('Failed to load preview.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [fileName, isOpen, type, ext, authGet, apiUrl]);

    useEffect(() => {
        return () => {
            if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
            if (mediaUrl && mediaUrl.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
        };
    }, [pdfBlobUrl, mediaUrl]);

    if (!isOpen) return null;

    const handleDownload = async () => {
        try {
            const res = await authGet(apiUrl, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url; a.download = originalName || fileName;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1500);
        } catch {
            alert('Download failed. Please try again.');
        }
    };

    const btnCircle = {
        background: 'none', border: 'none', color: 'white', cursor: 'pointer',
        display: 'flex', alignItems: 'center', padding: '0.5rem', borderRadius: '50%',
        transition: 'background 0.15s', flexShrink: 0,
    };
    const hover = e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.13)';
    const leave = e => e.currentTarget.style.backgroundColor = 'transparent';

    const { icon, color } = getFileVisual(originalName || '');

    const isDocType = ['pdf', 'sheet', 'code', 'text', 'zip'].includes(type) ||
        (type === 'doc' && ext === 'docx') ||
        (type === 'slide' && ext === 'pptx');

    const showPageCounter =
        numPages != null &&
        (type === 'pdf' || (type === 'slide' && ext === 'pptx') || (type === 'doc' && ext === 'docx'));

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)',
            zIndex: 9999, display: 'flex', flexDirection: 'column',
        }}>
            {/* ── Header ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.6rem 1.25rem', backgroundColor: 'rgba(0,0,0,0.6)',
                flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <button onClick={onClose} style={btnCircle} onMouseEnter={hover} onMouseLeave={leave} title="Close">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <span className="material-symbols-outlined" style={{ color, fontSize: '1.4rem', flexShrink: 0 }}>{icon}</span>
                    <span style={{ color: 'white', fontWeight: 500, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {originalName}
                    </span>
                    {showPageCounter && (
                        <div style={{
                            marginLeft: '0.5rem', padding: '0.15rem 0.6rem',
                            backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem',
                            color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem',
                            fontWeight: 600, letterSpacing: '0.025em', whiteSpace: 'nowrap',
                        }}>
                            {type === 'slide' ? 'Slide' : 'Page'} {currentPage} of {numPages}
                        </div>
                    )}
                </div>
                <button onClick={handleDownload} style={btnCircle} onMouseEnter={hover} onMouseLeave={leave} title="Download">
                    <span className="material-symbols-outlined">download</span>
                </button>
            </div>

            {/* ── Body ── */}
            <div style={{
                flex: 1,
                display: 'flex',
                overflowY: 'auto',
                padding: isDocType ? '2rem 1rem' : '1.5rem',
                justifyContent: 'center',
                alignItems: isDocType ? 'flex-start' : 'center',
            }}>
                {loading && <Spinner label={`Loading ${ext.toUpperCase()} preview…`} />}

                {!loading && error && <ErrorBox msg={error} onDownload={handleDownload} />}

                {!loading && !error && (
                    <>
                        {type === 'pdf' && pdfBlobUrl && (
                            <PdfViewer
                                blobUrl={pdfBlobUrl}
                                onError={() => setError('Failed to render PDF.')}
                                onNumPages={setNumPages}
                                onPageChange={setCurrentPage}
                            />
                        )}
                        {type === 'image' && mediaUrl && (
                            <ImageViewer src={mediaUrl} alt={originalName} />
                        )}
                        {type === 'video' && mediaUrl && (
                            <VideoViewer src={mediaUrl} ext={ext} />
                        )}
                        {type === 'audio' && mediaUrl && (
                            <AudioViewer src={mediaUrl} ext={ext} originalName={originalName} />
                        )}
                        {type === 'sheet' && sheetBlob && (
                            <SheetViewer blob={sheetBlob} ext={ext} />
                        )}
                        {(type === 'code' || type === 'text') && textContent !== '' && (
                            <CodeViewer content={textContent} ext={ext} />
                        )}
                        {type === 'zip' && zipFiles && (
                            <ZipViewer files={zipFiles} originalName={originalName} onDownload={handleDownload} />
                        )}
                        {type === 'doc' && (
                            ext === 'docx' && wordBlob
                                ? <WordViewer blob={wordBlob} onNumPages={setNumPages} onPageChange={setCurrentPage} />
                                : <OfficeViewer originalName={originalName} type="doc" onDownload={handleDownload} />
                        )}
                        {type === 'slide' && (
                            ext === 'pptx' && pptBlob
                                ? <PptViewer blob={pptBlob} onNumSlides={setNumPages} onSlideChange={setCurrentPage} />
                                : <OfficeViewer originalName={originalName} type="slide" onDownload={handleDownload} />
                        )}
                        {type === 'unknown' && (
                            <UnknownViewer ext={ext} onDownload={handleDownload} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default FilePreviewModal;