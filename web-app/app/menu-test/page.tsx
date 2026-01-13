'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Coffee, Sparkles, Pencil, Upload, Image as ImageIcon, Type, Palmtree, Wand2, ChevronLeft, Save, LayoutTemplate } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import Link from 'next/link';
const ColorThief = require('colorthief').default;

export default function MenuGeneratorPage() {
    const [rawText, setRawText] = useState(`Brunch Vibes
Avocado Toast - $12
Acai Bowl - $14
Matcha Latte - $6

Lunch Hour
Poke Bowl - $16
Truffle Burger - $18
Caesar Salad - $12

Sweet Treats
Vegan Brownie - $5
Banana Bread - $4`);

    const [theme, setTheme] = useState<'cyberpunk' | 'elegant' | 'chalkboard' | 'minimal' | 'tropical'>('minimal');
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [logo, setLogo] = useState<string | null>(null);
    const [title, setTitle] = useState('MENU');
    const [customColors, setCustomColors] = useState<{ accent: string, text: string, bg: string, border: string } | null>(null);
    const [isMatching, setIsMatching] = useState(false);

    const previewRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        const email = localStorage.getItem('userEmail');
        if (!email) return alert("Please set your email in Dashboard first.");

        setIsSaving(true);
        try {
            const res = await fetch('http://localhost:8080/api/menus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-email': email },
                body: JSON.stringify({
                    title,
                    content: rawText,
                    theme_config: { theme, customColors, bg: bgImage, logo },
                    image_url: null
                })
            });
            const data = await res.json();
            if (data.success) alert("Menu Saved!");
            else alert("Save failed: " + data.error);
        } catch (e) { console.error(e); alert("Network Error"); }
        setIsSaving(false);
    };

    // Simple parser
    const parseMenu = (text: string) => {
        const sections = text.split('\n\n').map(block => {
            const lines = block.split('\n');
            const title = lines[0];
            const items = lines.slice(1).map(line => {
                const parts = line.split('-');
                return {
                    name: parts[0]?.trim(),
                    price: parts[1]?.trim()
                };
            });
            return { title, items };
        });
        return sections;
    };

    const parsedData = parseMenu(rawText);

    const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setBgImage(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setLogo(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMagicMatch = async () => {
        if (!logo) return;
        setIsMatching(true);

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = logo;

        img.onload = () => {
            try {
                const colorThief = new ColorThief();
                const palette = colorThief.getPalette(img, 5); // [[r,g,b], ...]
                console.log("Extracted Palette:", palette);

                // Helper: RGB to Hex
                const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(x => {
                    const hex = x.toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                }).join('');

                // Helper: Check if color is very light (near white)
                const isLight = (r: number, g: number, b: number) => (r > 200 && g > 200 && b > 200);

                // Strategy: Find first non-light color for accent
                let accentRgb = palette[0];
                for (const color of palette) {
                    if (!isLight(color[0], color[1], color[2])) {
                        accentRgb = color;
                        break;
                    }
                }

                const accentColor = rgbToHex(accentRgb[0], accentRgb[1], accentRgb[2]);
                // Secondary: Try to find a contrasting text color, valid fallback to black
                const secondaryColor = palette[1] && !isLight(palette[1][0], palette[1][1], palette[1][2])
                    ? rgbToHex(palette[1][0], palette[1][1], palette[1][2])
                    : '#000000';

                console.log("Applied Colors:", { accent: accentColor, text: secondaryColor });

                setCustomColors({
                    accent: accentColor,
                    text: secondaryColor,
                    bg: '#fafafa', // Slight off-white to show change
                    border: accentColor
                });
                setTheme('minimal'); // Base theme
            } catch (error) {
                console.error("Color theft failed", error);
                alert("Could not extract colors. Try a different image.");
            }
            setIsMatching(false);
        };
    };

    const handleDownload = async () => {
        if (previewRef.current) {
            setIsExporting(true);
            try {
                const dataUrl = await htmlToImage.toPng(previewRef.current, {
                    cacheBust: true,
                    pixelRatio: 2
                });
                const link = document.createElement('a');
                link.download = `menu-${title.toLowerCase()}.png`;
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error("Export failed", err);
                alert("Failed to export. Try again.");
            }
            setIsExporting(false);
        }
    };


    // Dynamic Scale for Mobile
    const [scale, setScale] = useState(1);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleResize = () => {
            const w = window.innerWidth;
            // Target width 550px.
            // If screen < 600px, we scale down. Padding 32px.
            if (w < 600) {
                const s = (w - 32) / 550;
                setScale(s);
            } else {
                setScale(1);
            }
        };
        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!mounted) return null; // Prevent hydration mismatch on transform

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden selection:bg-pink-500/30">

            {/* LEFT PANEL: Control Center */}
            <div className="w-full lg:w-[420px] bg-black/40 backdrop-blur-xl border-r border-white/5 flex flex-col z-20 shadow-2xl shrink-0 h-screen overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/20">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white">
                            <ChevronLeft size={18} />
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 flex items-center gap-2">
                                <LayoutTemplate size={18} className="text-pink-400" /> Menu Architect
                            </h1>
                            <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">v2.0 Professional</p>
                        </div>
                    </div>
                </div>

                {/* Scrollable Controls */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">

                    {/* Section 1: Content */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Type size={12} className="text-pink-500" /> Content
                            </h3>
                            <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-gray-500 font-mono">Markdown</span>
                        </div>

                        <div className="space-y-3">
                            <div className="relative group">
                                <label className="absolute -top-2 left-3 px-1 bg-[#0a0a0a] text-[9px] font-bold text-gray-500">TITLE</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 text-sm font-bold tracking-wider text-white focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/50 transition-all placeholder:text-gray-700"
                                    placeholder="MENU TITLE"
                                />
                            </div>

                            <div className="relative group flex-1">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 pointer-events-none rounded-xl" />
                                <div className="flex flex-col h-[250px] bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500/50 transition-all">
                                    <div className="px-3 py-2 bg-white/5 border-b border-white/5 flex gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                        <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                        <div className="w-2 h-2 rounded-full bg-green-500/50" />
                                    </div>
                                    <textarea
                                        value={rawText}
                                        onChange={(e) => setRawText(e.target.value)}
                                        className="w-full h-full bg-transparent p-4 font-mono text-xs text-gray-300 focus:outline-none resize-none leading-relaxed"
                                        placeholder="Starters..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Aesthetic */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={12} className="text-purple-500" /> Style & Theme
                            </h3>
                            {customColors && (
                                <button onClick={() => setCustomColors(null)} className="text-[9px] text-red-400 hover:text-red-300 transition-colors">Reset</button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <ThemeCard active={theme === 'minimal'} onClick={() => setTheme('minimal')} icon={Type} label="Minimal" color="bg-white text-black" previewColor="bg-gray-100" />
                            <ThemeCard active={theme === 'tropical'} onClick={() => setTheme('tropical')} icon={Palmtree} label="Tropical" color="bg-[#0f4c3a] text-[#f2e8cf]" previewColor="bg-green-900" />
                            <ThemeCard active={theme === 'cyberpunk'} onClick={() => setTheme('cyberpunk')} icon={Sparkles} label="Cyber" color="bg-[#050510] text-cyan-400" previewColor="bg-cyan-950" />
                            <ThemeCard active={theme === 'elegant'} onClick={() => setTheme('elegant')} icon={Coffee} label="Elegant" color="bg-[#fffbf0] text-[#2a2a2a]" previewColor="bg-amber-50" />
                            <ThemeCard active={theme === 'chalkboard'} onClick={() => setTheme('chalkboard')} icon={Pencil} label="Chalk" color="bg-[#222] text-white" previewColor="bg-stone-800" />
                        </div>
                    </div>

                    {/* Section 3: Assets */}
                    <div className="space-y-4 pb-20">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <ImageIcon size={12} className="text-blue-500" /> Assets
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Logo Upload */}
                            <div className="relative group h-24 rounded-2xl border border-dashed border-white/20 hover:border-purple-500/50 transition-all bg-white/5 hover:bg-purple-500/5 cursor-pointer overflow-hidden">
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} id="logo-upload" />
                                <label htmlFor="logo-upload" className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer z-10">
                                    {logo ? (
                                        <img src={logo} className="w-12 h-12 object-contain drop-shadow-lg" />
                                    ) : (
                                        <>
                                            <div className="p-2 rounded-full bg-white/5 text-gray-400 group-hover:text-purple-400 transition-colors"><Sparkles size={16} /></div>
                                            <span className="text-[9px] text-gray-500 font-bold uppercase">Upload Logo</span>
                                        </>
                                    )}
                                </label>
                                {/* Magic Match Button */}
                                {logo && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                        <button onClick={() => handleMagicMatch()} disabled={isMatching} className="flex flex-col items-center gap-1 scale-90 hover:scale-100 transition-transform">
                                            <div className={`p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-xl ${isMatching ? 'animate-spin' : ''}`}>
                                                <Wand2 size={16} />
                                            </div>
                                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">{isMatching ? 'Scanning...' : 'Auto-Match'}</span>
                                        </button>
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLogo(null); setCustomColors(null); }}
                                            className="absolute top-2 right-2 text-white/50 hover:text-red-400 transition-colors"
                                        >
                                            <LayoutTemplate size={12} className="rotate-45" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* BG Upload */}
                            <div className="relative group h-24 rounded-2xl border border-dashed border-white/20 hover:border-blue-500/50 transition-all bg-white/5 hover:bg-blue-500/5 cursor-pointer overflow-hidden">
                                <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} id="bg-upload" />
                                <label htmlFor="bg-upload" className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer">
                                    {bgImage ? (
                                        <img src={bgImage} className="w-full h-full object-cover opacity-60" />
                                    ) : (
                                        <>
                                            <div className="p-2 rounded-full bg-white/5 text-gray-400 group-hover:text-blue-400 transition-colors"><Upload size={16} /></div>
                                            <span className="text-[9px] text-gray-500 font-bold uppercase">Background</span>
                                        </>
                                    )}
                                </label>
                                {bgImage && (
                                    <button
                                        onClick={(e) => { e.preventDefault(); setBgImage(null); }}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-500"
                                    >
                                        <LayoutTemplate size={10} className="rotate-45" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-xl shrink-0 absolute bottom-0 left-0 right-0 z-30">
                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group"
                        >
                            {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} className="group-hover:text-green-400 transition-colors" />}
                            <span>Save</span>
                        </button>

                        <button
                            onClick={handleDownload}
                            disabled={isExporting}
                            className="flex-[1.5] bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-lg shadow-purple-900/40 transform active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isExporting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={14} />}
                            <span>{isExporting ? 'Rendering...' : 'Export PNG'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Preview Canvas */}
            <div className="flex-1 bg-[#09090b] relative flex items-start justify-center p-8 lg:p-12 overflow-hidden">
                {/* DOt Pattern Background */}
                <div className="absolute inset-0 opacity-[0.2]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                        maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
                    }}
                />

                {/* Floating Gradient Orbs */}
                <div className="absolute top-20 left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]" />

                {/* Canvas Container - Centered & Scaled */}
                <div className="w-full h-full flex items-center justify-center overflow-auto lg:overflow-visible pb-32 lg:pb-0 z-10 relative">
                    <div
                        className="relative transition-all duration-500 ease-out origin-center shadow-2xl group hover:shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                        style={{
                            width: 550 * scale,
                            height: 800 * scale,
                        }}
                    >
                        {/* Hover Effect: Border Glow */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/0 via-purple-500/20 to-pink-500/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

                        <div
                            ref={previewRef}
                            style={{
                                transform: `scale(${scale})`,
                                transformOrigin: 'top left',
                            }}
                            className={`
                                w-[550px] min-h-[800px] absolute top-0 left-0 overflow-hidden
                                ${!customColors && theme === 'minimal' ? 'bg-white text-black font-sans' : ''}
                                ${!customColors && theme === 'tropical' ? 'bg-[#0f4c3a] text-[#f2e8cf] font-serif border-[12px] border-[#d8b066]' : ''}
                                ${!customColors && theme === 'cyberpunk' ? 'bg-[#050510] text-cyan-400 font-mono border-2 border-cyan-500 shadow-[0_0_60px_rgba(6,182,212,0.3)]' : ''}
                                ${!customColors && theme === 'elegant' ? 'bg-[#fffbf0] text-[#2a2a2a] font-serif border-double border-[6px] border-[#1a1a1a] p-[10px]' : ''}
                                ${!customColors && theme === 'chalkboard' ? 'bg-[#222] text-white font-sans border-[16px] border-[#5d4037] shadow-[2px_2px_4px_#3e2723,inset_0_0_20px_rgba(0,0,0,0.8)]' : ''}
                            `}
                        >
                            {/* THEME CONTENT (Unchanged) */}
                            <div style={customColors ? {
                                backgroundColor: customColors.bg,
                                color: customColors.text,
                                borderColor: customColors.border,
                                borderWidth: '12px',
                                fontFamily: 'sans-serif',
                                height: '100%'
                            } : { height: '100%' }}>

                                {/* Dynamic Styles for Custom Colors */}
                                {customColors && (
                                    <style jsx>{`
                                        .custom-accent { color: ${customColors.accent} !important; border-color: ${customColors.accent} !important; }
                                `}</style>
                                )}

                                {bgImage && (
                                    <div className="absolute inset-0 z-0">
                                        <img src={bgImage} className="w-full h-full object-cover opacity-100" />
                                        <div className={`absolute inset-0 ${theme === 'cyberpunk' ? 'bg-black/70' : theme === 'chalkboard' ? 'bg-black/40' : 'bg-white/60'} backdrop-blur-[2px]`} />
                                    </div>
                                )}

                                <div className={`relative z-10 flex flex-col h-full ${theme === 'elegant' && !customColors ? 'border border-[#1a1a1a] h-full p-12' : 'p-16'}`}>

                                    {theme === 'tropical' && !customColors && (
                                        <>
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 rounded-bl-[100px] blur-xl" />
                                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-green-400/10 rounded-tr-[100px] blur-2xl" />
                                        </>
                                    )}

                                    {logo && (
                                        <div className="mb-6 flex justify-center">
                                            <img
                                                src={logo}
                                                className={`
                                                    max-h-28 object-contain
                                                    ${theme === 'cyberpunk' && !customColors ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : ''}
                                                    ${theme === 'chalkboard' && !customColors ? 'opacity-90 contrast-125' : ''}
                                                `}
                                            />
                                        </div>
                                    )}

                                    <div className="text-center mb-12">
                                        <h2 className={`text-5xl leading-tight
                                        ${customColors ? 'font-black uppercase tracking-widest custom-accent' : ''}
                                        ${!customColors && theme === 'minimal' ? 'font-black tracking-tighter uppercase' : ''}
                                        ${!customColors && theme === 'tropical' ? 'font-serif text-[#d8b066] drop-shadow-md italic' : ''}
                                        ${!customColors && theme === 'cyberpunk' ? 'font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 filter drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : ''}
                                        ${!customColors && theme === 'elegant' ? 'font-serif uppercase tracking-[0.2em] text-4xl' : ''}
                                        ${!customColors && theme === 'chalkboard' ? 'font-handwriting text-5xl text-yellow-100 opacity-90 -rotate-2 ml-4' : ''}
                                    `}>
                                            {title}
                                        </h2>
                                        {!customColors && theme === 'minimal' && <div className="w-12 h-1 bg-black mx-auto mt-6" />}
                                        {!customColors && theme === 'elegant' && <div className="text-xs uppercase tracking-[0.4em] mt-3 italic text-gray-500">Fine Selection</div>}
                                    </div>

                                    <div className="flex-1 space-y-10">
                                        {parsedData.map((section, i) => (
                                            <div key={i} className="space-y-5">
                                                <h3 className={`text-xl
                                                ${customColors ? 'font-bold uppercase tracking-wide opacity-50 mb-6' : ''}
                                                ${!customColors && theme === 'minimal' ? 'font-bold uppercase tracking-wide text-xs text-gray-400 mb-6' : ''}
                                                ${!customColors && theme === 'tropical' ? 'font-bold text-[#d8b066] uppercase tracking-widest border-b border-[#d8b066]/30 pb-2' : ''}
                                                ${!customColors && theme === 'cyberpunk' ? 'text-pink-500 font-bold border-l-4 border-cyan-500 pl-3 uppercase tracking-wider' : ''}
                                                ${!customColors && theme === 'elegant' ? 'font-serif text-2xl italic text-center text-[#555]' : ''}
                                                ${!customColors && theme === 'chalkboard' ? 'font-bold text-blue-200 text-2xl border-b-2 border-dashed border-white/20 pb-1 inline-block' : ''}
                                            `}>
                                                    {section.title}
                                                </h3>

                                                <ul className="space-y-4">
                                                    {section.items.map((item, j) => (
                                                        <li key={j} className="flex justify-between items-baseline gap-4 group">
                                                            <span className={`text-lg
                                                            ${customColors ? 'font-medium' : ''}
                                                            ${!customColors && theme === 'minimal' ? 'font-medium' : ''}
                                                            ${!customColors && theme === 'tropical' ? 'font-medium tracking-wide' : ''}
                                                            ${!customColors && theme === 'cyberpunk' ? 'font-bold text-gray-100 group-hover:text-cyan-300 transition-colors' : ''}
                                                            ${!customColors && theme === 'elegant' ? 'font-serif text-[#1a1a1a]' : ''}
                                                            ${!customColors && theme === 'chalkboard' ? 'font-handwriting text-white text-xl' : ''}
                                                        `}>
                                                                {item.name}
                                                            </span>
                                                            <div className={`flex-1 border-b mb-1 opacity-20
                                                            ${customColors ? 'border-current' : ''}
                                                            ${!customColors && theme === 'tropical' ? 'border-[#f2e8cf]/50 border-dotted' : ''}
                                                            ${!customColors && theme === 'cyberpunk' ? 'border-gray-700' : ''}
                                                            ${!customColors && theme === 'elegant' ? 'border-gray-300' : 'border-current'}
                                                            ${!customColors && theme === 'minimal' ? 'hidden' : ''}
                                                        `}></div>
                                                            <span className={`text-lg
                                                            ${customColors ? 'font-bold custom-accent' : ''}
                                                            ${!customColors && theme === 'minimal' ? 'font-bold' : ''}
                                                            ${!customColors && theme === 'tropical' ? 'text-[#d8b066] font-bold' : ''}
                                                            ${!customColors && theme === 'cyberpunk' ? 'text-yellow-400 font-mono text-sm' : ''}
                                                            ${!customColors && theme === 'elegant' ? 'font-bold text-[#1a1a1a]' : ''}
                                                            ${!customColors && theme === 'chalkboard' ? 'text-green-300 font-bold' : ''}
                                                        `}>
                                                                {item.price}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>

                                    <div className={`mt-auto pt-12 text-center text-[10px] uppercase
                                    ${customColors ? 'tracking-widest opacity-40' : ''}
                                    ${!customColors && theme === 'minimal' ? 'tracking-widest text-gray-300' : 'tracking-widest opacity-40'}
                                    ${!customColors && theme === 'cyberpunk' ? 'text-cyan-900 font-bold' : ''}
                                `}>
                                        Created for you
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ThemeCard({ active, onClick, icon: Icon, label, color, previewColor }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-start p-3 rounded-xl border transition-all duration-300 relative overflow-hidden group
            ${active ? 'border-white/20 bg-white/5 shadow-2xl' : 'border-white/5 bg-white/5 opacity-60 hover:opacity-100 hover:border-white/10'}
        `}
        >
            {/* Preview Strip */}
            <div className={`absolute top-0 right-0 bottom-0 w-1.5 ${active ? 'bg-pink-500' : 'bg-transparent'}`} />

            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${previewColor} bg-opacity-20`}>
                    <Icon size={16} className={active ? 'text-white' : 'text-gray-400'} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-white' : 'text-gray-400'}`}>{label}</span>
            </div>

            <div className="w-full flex gap-1 mt-1 opacity-50">
                <div className={`h-1 flex-1 rounded-full ${active ? 'bg-white' : 'bg-gray-600'}`}></div>
                <div className={`h-1 w-2 rounded-full ${active ? 'bg-white/50' : 'bg-gray-700'}`}></div>
            </div>
        </button>
    )
}
