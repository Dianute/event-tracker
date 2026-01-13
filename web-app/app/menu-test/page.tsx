'use client';

import { useState, useRef } from 'react';
import { Download, Coffee, Sparkles, Pencil } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

export default function MenuGeneratorPage() {
    const [rawText, setRawText] = useState(`STARTERS
Bruschetta - $8
Garlic Bread - $5
Soup of the Day - $6

MAINS
Grilled Salmon - $22
Spaghetti Carbonara - $18
Angus Steak - $30

DESSERTS
Tiramisu - $9
Cheesecake - $8`);

    const [theme, setTheme] = useState<'cyberpunk' | 'elegant' | 'chalkboard'>('cyberpunk');
    const previewRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Simple parser: Split by double newline for sections, single for items
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

    const handleDownload = async () => {
        if (previewRef.current) {
            setIsExporting(true);
            try {
                const dataUrl = await htmlToImage.toPng(previewRef.current);
                const link = document.createElement('a');
                link.download = 'my-menu.png';
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error("Export failed", err);
            }
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#111] text-white p-8 font-sans flex flex-col md:flex-row gap-8">
            {/* Controls */}
            <div className="w-full md:w-1/3 flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">Magic Menu ✨</h1>
                    <p className="text-gray-400 text-sm">Paste your text below. Use double enters for new sections.</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setTheme('cyberpunk')}
                        className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${theme === 'cyberpunk' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-gray-700 text-gray-400'}`}
                    >
                        <Sparkles size={16} className="mx-auto mb-1" /> Cyber
                    </button>
                    <button
                        onClick={() => setTheme('elegant')}
                        className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${theme === 'elegant' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'border-gray-700 text-gray-400'}`}
                    >
                        <Coffee size={16} className="mx-auto mb-1" /> Elegant
                    </button>
                    <button
                        onClick={() => setTheme('chalkboard')}
                        className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${theme === 'chalkboard' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-gray-700 text-gray-400'}`}
                    >
                        <Pencil size={16} className="mx-auto mb-1" /> Chalk
                    </button>
                </div>

                <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="flex-1 min-h-[400px] bg-gray-900 border border-gray-700 rounded-xl p-4 font-mono text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Enter menu text here..."
                />

                <button
                    onClick={handleDownload}
                    disabled={isExporting}
                    className="bg-white text-black font-bold py-4 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                    <Download size={20} />
                    {isExporting ? 'Generating...' : 'Download Image'}
                </button>
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-gray-800 rounded-2xl p-8 flex items-center justify-center overflow-auto shadow-inner border border-white/5">
                <div
                    ref={previewRef}
                    id="menu-preview"
                    className={`w-[500px] min-h-[700px] p-12 transition-all duration-500 flex flex-col gap-8
                        ${theme === 'cyberpunk' ? 'bg-[#09090b] text-cyan-500 border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.2)] font-mono' : ''}
                        ${theme === 'elegant' ? 'bg-[#fffbf0] text-[#4a4a4a] font-serif border-8 border-double border-[#d4af37]' : ''}
                        ${theme === 'chalkboard' ? 'bg-[#1a1a1a] text-white font-sans border-8 border-[#5d4037] shadow-xl' : ''}
                    `}
                    style={theme === 'chalkboard' ? { backgroundImage: 'details' } : {}}
                >
                    <div className="text-center mb-4">
                        <h2 className={`text-4xl font-bold uppercase tracking-widest
                            ${theme === 'cyberpunk' ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]' : ''}
                            ${theme === 'elegant' ? 'text-[#d4af37] italic' : ''}
                            ${theme === 'chalkboard' ? 'text-white/90 underline decoration-wavy decoration-white/20' : ''}
                        `}>
                            MENU
                        </h2>
                        {theme === 'elegant' && <div className="w-16 h-1 bg-[#d4af37] mx-auto mt-4" />}
                    </div>

                    {parsedData.map((section, i) => (
                        <div key={i} className="space-y-4">
                            <h3 className={`text-xl font-bold border-b pb-2
                                ${theme === 'cyberpunk' ? 'border-cyan-500/30 text-pink-500' : ''}
                                ${theme === 'elegant' ? 'border-[#d4af37]/30 text-[#2c2c2c] uppercase tracking-widest text-center' : ''}
                                ${theme === 'chalkboard' ? 'border-white/20 text-yellow-200' : ''}
                            `}>
                                {section.title}
                            </h3>

                            <ul className="space-y-3">
                                {section.items.map((item, j) => (
                                    <li key={j} className="flex justify-between items-baseline gap-4">
                                        <span className={`font-bold ${theme === 'cyberpunk' ? 'text-white' : ''} ${theme === 'chalkboard' ? 'font-handwriting' : ''}`}>
                                            {item.name}
                                        </span>
                                        <div className={`flex-1 border-b mb-1 opacity-20 ${theme === 'elegant' ? 'border-black' : 'border-white'}`}></div>
                                        <span className={`
                                            ${theme === 'cyberpunk' ? 'text-yellow-400' : ''}
                                            ${theme === 'elegant' ? 'text-[#d4af37] font-bold' : ''}
                                            ${theme === 'chalkboard' ? 'text-green-300' : ''}
                                        `}>
                                            {item.price}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    <div className="mt-auto pt-8 text-center text-xs opacity-50 uppercase tracking-widest">
                        Fresh • Local • Organic
                    </div>
                </div>
            </div>
        </div>
    );
}
