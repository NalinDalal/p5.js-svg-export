export function normalizeRadii(radii) {
    if (!radii) return null;
    if (typeof radii === 'number') {
        return { tl: radii, tr: radii, br: radii, bl: radii };
    }
    if (Array.isArray(radii)) {
        if (radii.length === 1) {
            const r = radii[0];
            return { tl: r, tr: r, br: r, bl: r };
        }
        if (radii.length === 2) {
            return { tl: radii[0], tr: radii[1], br: radii[0], bl: radii[1] };
        }
        if (radii.length === 4) {
            return { tl: radii[0], tr: radii[1], br: radii[2], bl: radii[3] };
        }
    }
    if (typeof radii === 'object' && radii.tl !== undefined) {
        return {
            tl: radii.tl || 0,
            tr: radii.tr || 0,
            br: radii.br || 0,
            bl: radii.bl || 0
        };
    }
    return null;
}