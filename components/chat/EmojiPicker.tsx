import React from 'react';

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
}

const emojis = [
    '😀', '😂', '😍', '👍', '🙏', '🎉', '❤️', '🔥',
    '😊', '🤔', '😢', '😡', '🤯', '💯', '🙌', '🚀',
    '😎', '😴', '👋', '👀', '✨', '✅', '❌', '💰'
];

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect }) => {
    return (
        <div className="absolute bottom-full mb-2 left-2 right-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg p-2 z-10">
            <div className="grid grid-cols-8 gap-1">
                {emojis.map(emoji => (
                    <button
                        key={emoji}
                        type="button"
                        onClick={() => onEmojiSelect(emoji)}
                        className="text-2xl p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default EmojiPicker;