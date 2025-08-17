import React, { useState, useEffect, useRef } from 'react';
import { User as AuthUser, TeamChatMessage } from '../../lib/supabaseClient';
import XCircleIcon from '../icons/XCircleIcon';
import EmojiIcon from '../icons/EmojiIcon';
import SendIcon from '../icons/SendIcon';
import EmojiPicker from './EmojiPicker';

interface ChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    messages: TeamChatMessage[];
    currentUser: AuthUser;
    onSendMessage: (message: string) => Promise<void>;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, messages, currentUser, onSendMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setIsEmojiPickerOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [emojiPickerRef]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedMessage = newMessage.trim();
        if (trimmedMessage === '' || isSending) return;

        setIsSending(true);
        try {
            await onSendMessage(trimmedMessage);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
            // Error toast is handled by onSendMessage
        } finally {
            setIsSending(false);
        }
    };

    const getFirstName = (fullName: string) => {
        return fullName.split(' ')[0];
    };

    const handleEmojiSelect = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setIsEmojiPickerOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 flex flex-col h-[70vh] max-h-[600px] animate-toast-enter">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Team Chat</h3>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                    <XCircleIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                    const isCurrentUser = msg.user_id === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2 rounded-xl max-w-xs break-words ${isCurrentUser ? 'bg-pink-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                                    <p>{msg.message}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-1 px-1">
                                     <span className="text-xs text-slate-400 dark:text-slate-500">
                                        {getFirstName(msg.user_name)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                        {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 relative">
                {isEmojiPickerOpen && (
                    <div ref={emojiPickerRef}>
                       <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <button type="button" onClick={() => setIsEmojiPickerOpen(prev => !prev)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" title="Emoji">
                        <EmojiIcon className="w-6 h-6"/>
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Ketik pesan..."
                        className="flex-1 w-full bg-slate-100 dark:bg-slate-700 border-transparent rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        disabled={isSending || newMessage.trim() === ''}
                        className="p-2 rounded-full bg-pink-600 text-white hover:bg-pink-700 disabled:bg-pink-300 dark:disabled:bg-pink-800 transition-colors"
                    >
                        <SendIcon className="w-6 h-6"/>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatPanel;