export const getCategoryStyles = (category: string | undefined) => {
    const map: Record<string, { borderClass: string, textClass: string }> = {
        mainstage: {
            borderClass: '!border-orange-500/80 !shadow-[0_0_20px_rgba(249,115,22,0.5)] hover:!border-orange-400 hover:!shadow-[0_0_35px_rgba(249,115,22,0.9)]',
            textClass: 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]'
        },
        kontakt: {
            borderClass: '!border-red-500/80 !shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:!border-red-400 hover:!shadow-[0_0_35px_rgba(239,68,68,0.9)]',
            textClass: 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
        },
        sintetizadores: {
            borderClass: '!border-fuchsia-500/80 !shadow-[0_0_20px_rgba(217,70,239,0.5)] hover:!border-fuchsia-400 hover:!shadow-[0_0_35px_rgba(217,70,239,0.9)]',
            textClass: 'text-fuchsia-500 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]'
        },
        tutoriales: {
            borderClass: '!border-blue-500/80 !shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:!border-blue-400 hover:!shadow-[0_0_35px_rgba(59,130,246,0.9)]',
            textClass: 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]'
        },
        software: {
            borderClass: '!border-emerald-500/80 !shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:!border-emerald-400 hover:!shadow-[0_0_35px_rgba(16,185,129,0.9)]',
            textClass: 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]'
        },
    };
    
    // Default fallback (Brand color: Violet)
    return map[category?.toLowerCase() || ''] || {
        borderClass: '!border-brand/80 !shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:!border-brand hover:!shadow-[0_0_35px_rgba(139,92,246,0.9)]',
        textClass: 'text-brand drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]'
    };
};
