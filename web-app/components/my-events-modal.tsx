'use client';

import { X, Calendar, MapPin, Edit, EyeOff, Plus } from 'lucide-react';
import { useSession } from "next-auth/react";

interface MyEventsModalProps {
    isOpen: boolean;
    onClose: () => void;
    events: any[];
    onEdit: (event: any) => void;
    onAdd: () => void;
    onGenerateMenu: () => void;
}

export default function MyEventsModal({ isOpen, onClose, events, onEdit, onAdd, onGenerateMenu }: MyEventsModalProps) {
    const { data: session } = useSession();

    if (!isOpen) return null;

    // Filter events by current user email
    const myEvents = events.filter(e => {
        if (!e.userEmail || !session?.user?.email) return false;
        return e.userEmail === session.user.email;
    });

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            Creator Dashboard 🚀
                        </h2>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">
                            {myEvents.length} Active Events
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                onClose();
                                onGenerateMenu();
                            }}
                            className="p-2 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/30 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                            title="Generate Weekly Menu"
                        >
                            <Calendar size={16} />
                            <span>Weekly Menu</span>
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                                onAdd();
                            }}
                            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white flex items-center gap-2 text-xs font-bold"
                        >
                            <Plus size={16} />
                            <span>Create</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    {myEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                            <EyeOff size={48} className="mb-4 opacity-50" />
                            <p className="font-bold">You haven't posted any events yet.</p>
                            <p className="text-xs mt-2">Create one using the <span className="text-white">+</span> button on the map!</p>
                        </div>
                    ) : (
                        myEvents.map(event => (
                            <div key={event.id} className="group bg-gray-800/40 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl p-4 flex gap-4 transition-all">
                                {/* Image Thumb */}
                                <div className="w-20 h-20 shrink-0 bg-gray-900 rounded-lg overflow-hidden relative">
                                    {event.imageUrl ? (
                                        <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                                            <Calendar size={20} />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h3 className="font-bold text-white truncate text-lg leading-tight mb-1">{event.title}</h3>
                                    <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {new Date(event.startTime).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-1 truncate">
                                            <MapPin size={12} />
                                            {event.venue || 'Unknown'}
                                        </div>
                                    </div>
                                </div>

                                {/* Action */}
                                <button
                                    onClick={() => {
                                        onClose(); // Close this modal first
                                        onEdit(event);
                                    }}
                                    className="self-center px-4 py-2 bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-400 rounded-lg font-bold text-xs transition-colors border border-blue-500/20 flex items-center gap-2"
                                >
                                    <Edit size={14} />
                                    Edit
                                </button>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}
