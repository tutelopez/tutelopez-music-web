export interface CompatibilityBadge {
    name: string;
    icon: string;
    color: string;
}

export function getCompatibilityBadges(category: string = '', tags: string[] = [], title: string = ''): CompatibilityBadge[] {
    const text = `${category} ${(tags || []).join(' ')} ${title}`.toLowerCase();
    const badges: CompatibilityBadge[] = [];

    const isMac = text.includes('mainstage') || text.includes('garageband') || text.includes('logic') || text.includes('mac') || text.includes('apple');
    const isWindows = text.includes('kontakt') || text.includes('synth') || text.includes('vst') || text.includes('sf2') || text.includes('windows') || text.includes('pc') || text.includes('daw');
    const isMobile = text.includes('appsmoviles') || text.includes('samplesmoviles') || text.includes('ipad') || text.includes('iphone') || text.includes('android') || text.includes('móvil') || text.includes('movil');

    if (isMac) {
        badges.push({
            name: 'macOS',
            icon: '🍏',
            color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        });
    }

    if (isWindows) {
        badges.push({
            name: 'Windows',
            icon: '🪟',
            color: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
        });
    }

    if (isMobile) {
        badges.push({
            name: 'iOS / Android',
            icon: '📱',
            color: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
        });
    }

    if (badges.length === 0) {
        badges.push({
            name: 'Multiplataforma',
            icon: '⚡',
            color: 'bg-slate-800 text-slate-300 border-slate-700'
        });
    }

    return badges;
}
