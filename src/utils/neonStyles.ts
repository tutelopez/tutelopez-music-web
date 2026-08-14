export const getCategoryStyles = (category: string | undefined) => {
    const map: Record<string, { borderClass: string, textClass: string }> = {
        mainstage: {
            borderClass: 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:border-orange-500 hover:shadow-[0_0_25px_rgba(249,115,22,0.7)]',
            textClass: 'text-orange-500'
        },
        kontakt: {
            borderClass: 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:border-red-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.7)]',
            textClass: 'text-red-500'
        },
        sintetizadores: {
            borderClass: 'border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.3)] hover:border-fuchsia-500 hover:shadow-[0_0_25px_rgba(217,70,239,0.7)]',
            textClass: 'text-fuchsia-500'
        },
        tutoriales: {
            borderClass: 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:border-blue-500 hover:shadow-[0_0_25px_rgba(59,130,246,0.7)]',
            textClass: 'text-blue-500'
        },
        software: {
            borderClass: 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:border-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.7)]',
            textClass: 'text-emerald-500'
        },
    };
    
    // Default fallback (Brand color: Violet)
    return map[category?.toLowerCase() || ''] || {
        borderClass: 'border-brand/50 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:border-brand hover:shadow-[0_0_25px_rgba(139,92,246,0.7)]',
        textClass: 'text-brand'
    };
};
