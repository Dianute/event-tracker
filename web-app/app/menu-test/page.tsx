'use client';

import { useState, useRef } from 'react';
import { Download, Coffee, Sparkles, Pencil, Upload, Image as ImageIcon, Type, Palmtree } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

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
    const previewRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

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

    const handleDownload = async () => {
        if (previewRef.current) {
            setIsExporting(true);
            try {
                // Ensure images are fully loaded before capturing
                const dataUrl = await htmlToImage.toPng(previewRef.current, {
                    cacheBust: true,
                    pixelRatio: 2 // High Res
                });
                const link = document.createElement('a');
                link.download = 'menu-design.png';
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error("Export failed", err);
                alert("Failed to export image. Try again.");
            }
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden">
            {/* Left Panel: Editor (Scrollable on Desktop, Natural on Mobile) */}
            <div className="w-full lg:w-[45%] flex flex-col gap-6 p-4 md:p-6 lg:p-8 border-r border-gray-800 bg-[#0a0a0a] lg:overflow-y-auto shrink-0">
                <div className="space-y-2 shrink-0">
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Menu Architect
                    </h1>
                    <p className="text-gray-500 font-medium text-xs uppercase tracking-widest">Design & Content</p>
                </div>

                {/* Text Editor (Main Focus) */}
                <div className="flex-1 flex flex-col min-h-[40vh] lg:min-h-[400px]">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Type size={14} /> Menu Content
                        </label>
                        <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded">Markdown Supported</span>
                    </div>
                    <div className="relative flex-1 group">
                        <textarea
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            className="w-full h-full bg-[#111] border border-gray-800 rounded-xl p-5 font-mono text-sm text-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none shadow-inner leading-relaxed"
                            placeholder="Starters&#10;Soup - $5&#10;&#10;Mains&#10;Steak - $20"
                        />
                    </div>
                </div>

                {/* Controls Grid */}
                <div className="grid grid-cols-2 gap-6 shrink-0 mt-auto pt-6 border-t border-gray-800">
                    {/* Theme Selector */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Aesthetic</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <ThemeBtn active={theme === 'minimal'} onClick={() => setTheme('minimal')} icon={Type} label="Minimal" color="text-white border-white" />
                            <ThemeBtn active={theme === 'tropical'} onClick={() => setTheme('tropical')} icon={Palmtree} label="Tropical" color="text-green-400 border-green-500" />
                            <ThemeBtn active={theme === 'cyberpunk'} onClick={() => setTheme('cyberpunk')} icon={Sparkles} label="Cyber" color="text-cyan-400 border-cyan-500" />
                            <ThemeBtn active={theme === 'elegant'} onClick={() => setTheme('elegant')} icon={Coffee} label="Elegant" color="text-amber-400 border-amber-500" />
                            <ThemeBtn active={theme === 'chalkboard'} onClick={() => setTheme('chalkboard')} icon={Pencil} label="Chalk" color="text-gray-400 border-gray-500" />
                        </div>
                    </div>

                    {/* Images & Actions */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            {/* Background */}
                            <div className="relative group">
                                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all text-gray-500 gap-1">
                                    {bgImage ? (
                                        <div className="relative w-full h-full p-0.5">
                                            <img src={bgImage} className="w-full h-full object-cover rounded-lg opacity-50" />
                                        </div>
                                    ) : (
                                        <>
                                            <Upload size={14} />
                                            <span className="text-[10px] font-bold">BG</span>
                                        </>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                                </label>
                            </div>

                            {/* Logo Upload */}
                            <div className="relative group">
                                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-500/5 transition-all text-gray-500 gap-1">
                                    {logo ? (
                                        <div className="relative w-full h-full p-0.5">
                                            <img src={logo} className="w-full h-full object-contain rounded-lg" />
                                            <button
                                                onClick={(e) => { e.preventDefault(); setLogo(null); }}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full z-10 hover:scale-110 transition-transform"
                                                title="Remove Logo"
                                            >
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Sparkles size={14} />
                                            <span className="text-[10px] font-bold">Logo</span>
                                        </>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </label>
                            </div>
                        </div>

                        {/* Title Input */}
                        <div>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-[#111] border-b border-gray-700 p-2 text-center text-sm font-bold tracking-widest uppercase focus:outline-none focus:border-white transition-colors"
                                placeholder="MENU TITLE"
                            />
                        </div>

                        <button
                            onClick={handleDownload}
                            disabled={isExporting}
                            className="w-full bg-white hover:bg-gray-200 text-black font-black text-xs uppercase tracking-widest py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                        >
                            {isExporting ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Download size={16} />}
                            {isExporting ? 'Rendering...' : 'Export PNG'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel: Live Preview (Centered) */}
            <div className="flex-1 bg-[#050510] relative flex items-center justify-center p-4 md:p-8 lg:p-12 lg:overflow-hidden min-h-[500px] lg:min-h-0">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="relative w-full h-full flex items-center justify-center overflow-auto custom-scrollbar">
                    <div
                        ref={previewRef}
                        className={`
                            w-[550px] min-h-[800px] shrink-0 transition-all duration-500 flex flex-col relative overflow-hidden shadow-2xl
                            ${theme === 'minimal' ? 'bg-white text-black font-sans' : ''}
                            ${theme === 'tropical' ? 'bg-[#0f4c3a] text-[#f2e8cf] font-serif border-[12px] border-[#d8b066]' : ''}
                            ${theme === 'cyberpunk' ? 'bg-[#050510] text-cyan-400 font-mono border-2 border-cyan-500 shadow-[0_0_60px_rgba(6,182,212,0.3)]' : ''}
                            ${theme === 'elegant' ? 'bg-[#fffbf0] text-[#2a2a2a] font-serif border-double border-[6px] border-[#1a1a1a] p-[10px]' : ''}
                            ${theme === 'chalkboard' ? 'bg-[#222] text-white font-sans border-[16px] border-[#5d4037] shadow-[2px_2px_4px_#3e2723,inset_0_0_20px_rgba(0,0,0,0.8)]' : ''}
                        `}
                    >
                        {/* User Background Overlay */}
                        {bgImage && (
                            <div className="absolute inset-0 z-0">
                                <img src={bgImage} className="w-full h-full object-cover opacity-100" />
                                {/* Overlay for readability based on theme */}
                                <div className={`absolute inset-0 ${theme === 'cyberpunk' ? 'bg-black/70' : theme === 'chalkboard' ? 'bg-black/40' : 'bg-white/60'} backdrop-blur-[2px]`} />
                            </div>
                        )}

                        {/* Content Container */}
                        <div className={`relative z-10 flex flex-col h-full ${theme === 'elegant' ? 'border border-[#1a1a1a] h-full p-12' : 'p-16'}`}>

                            {/* Decoration Elements */}
                            {theme === 'tropical' && (
                                <>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 rounded-bl-[100px] blur-xl" />
                                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-green-400/10 rounded-tr-[100px] blur-2xl" />
                                </>
                            )}

                            {/* LOGO Display - Updated Location */}
                            {logo && (
                                <div className="mb-4 flex justify-center">
                                    <img
                                        src={logo}
                                        className={`
                                            max-h-24 object-contain
                                            ${theme === 'cyberpunk' ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : ''}
                                            ${theme === 'chalkboard' ? 'opacity-90 contrast-125' : ''}
                                            ${theme === 'tropical' ? 'sepia-[.3]' : ''}
                                        `}
                                    />
                                </div>
                            )}

                            <div className="text-center mb-12">
                                <h2 className={`text-5xl leading-tight
                                ${theme === 'minimal' ? 'font-black tracking-tighter uppercase' : ''}
                                ${theme === 'tropical' ? 'font-serif text-[#d8b066] drop-shadow-md italic' : ''}
                                ${theme === 'cyberpunk' ? 'font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 filter drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : ''}
                                ${theme === 'elegant' ? 'font-serif uppercase tracking-[0.2em] text-4xl' : ''}
                                ${theme === 'chalkboard' ? 'font-handwriting text-5xl text-yellow-100 opacity-90 -rotate-2 ml-4' : ''}
                            `}>
                                    {title}
                                </h2>
                                {theme === 'minimal' && <div className="w-12 h-1 bg-black mx-auto mt-6" />}
                                {theme === 'elegant' && <div className="text-xs uppercase tracking-[0.4em] mt-3 italic text-gray-500">Fine Selection</div>}
                            </div>

                            <div className="flex-1 space-y-10">
                                {parsedData.map((section, i) => (
                                    <div key={i} className="space-y-5">
                                        <h3 className={`text-xl
                                        ${theme === 'minimal' ? 'font-bold uppercase tracking-wide text-xs text-gray-400 mb-6' : ''}
                                        ${theme === 'tropical' ? 'font-bold text-[#d8b066] uppercase tracking-widest border-b border-[#d8b066]/30 pb-2' : ''}
                                        ${theme === 'cyberpunk' ? 'text-pink-500 font-bold border-l-4 border-cyan-500 pl-3 uppercase tracking-wider' : ''}
                                        ${theme === 'elegant' ? 'font-serif text-2xl italic text-center text-[#555]' : ''}
                                        ${theme === 'chalkboard' ? 'font-bold text-blue-200 text-2xl border-b-2 border-dashed border-white/20 pb-1 inline-block' : ''}
                                    `}>
                                            {section.title}
                                        </h3>

                                        <ul className="space-y-4">
                                            {section.items.map((item, j) => (
                                                <li key={j} className="flex justify-between items-baseline gap-4 group">
                                                    <span className={`text-lg
                                                    ${theme === 'minimal' ? 'font-medium' : ''}
                                                    ${theme === 'tropical' ? 'font-medium tracking-wide' : ''}
                                                    ${theme === 'cyberpunk' ? 'font-bold text-gray-100 group-hover:text-cyan-300 transition-colors' : ''}
                                                    ${theme === 'elegant' ? 'font-serif text-[#1a1a1a]' : ''}
                                                    ${theme === 'chalkboard' ? 'font-handwriting text-white text-xl' : ''}
                                                `}>
                                                        {item.name}
                                                    </span>
                                                    <div className={`flex-1 border-b mb-1 opacity-20
                                                    ${theme === 'tropical' ? 'border-[#f2e8cf]/50 border-dotted' : ''}
                                                    ${theme === 'cyberpunk' ? 'border-gray-700' : ''}
                                                    ${theme === 'elegant' ? 'border-gray-300' : 'border-current'}
                                                    ${theme === 'minimal' ? 'hidden' : ''}
                                                `}></div>
                                                    <span className={`text-lg
                                                    ${theme === 'minimal' ? 'font-bold' : ''}
                                                    ${theme === 'tropical' ? 'text-[#d8b066] font-bold' : ''}
                                                    ${theme === 'cyberpunk' ? 'text-yellow-400 font-mono text-sm' : ''}
                                                    ${theme === 'elegant' ? 'font-bold text-[#1a1a1a]' : ''}
                                                    ${theme === 'chalkboard' ? 'text-green-300 font-bold' : ''}
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
                            ${theme === 'minimal' ? 'tracking-widest text-gray-300' : 'tracking-widest opacity-40'}
                            ${theme === 'cyberpunk' ? 'text-cyan-900 font-bold' : ''}
                        `}>
                                Created for you
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ThemeBtn({ active, onClick, icon: Icon, label, color }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
            ${active ? `${color} bg-opacity-10 bg-current` : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300 hover:bg-white/5'}
        `}
        >
            <Icon size={20} className="mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </button>
    )
}
