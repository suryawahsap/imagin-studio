// Studio presets registry.
import { Box, Camera, Image, PenTool } from 'lucide-react';

export const ANIMATION_PRESETS = [
    { id: 'fade-in',  label: 'Fade In',  css: 'animation: imaginFadeIn 1.2s ease forwards;',    keyframes: '@keyframes imaginFadeIn { from { opacity: 0 } to { opacity: 1 } }' },
    { id: 'float',    label: 'Float',    css: 'animation: imaginFloat 3s ease-in-out infinite;', keyframes: '@keyframes imaginFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }' },
    { id: 'pulse',    label: 'Pulse',    css: 'animation: imaginPulse 2s ease-in-out infinite;', keyframes: '@keyframes imaginPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.08) } }' },
    { id: 'rotate',   label: 'Rotate',   css: 'animation: imaginRotate 6s linear infinite;',    keyframes: '@keyframes imaginRotate { to { transform: rotate(360deg) } }' },
    { id: 'slide',    label: 'Slide In', css: 'animation: imaginSlideIn 1s ease forwards;',     keyframes: '@keyframes imaginSlideIn { from { transform: translateX(-40px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }' },
    { id: 'bounce',   label: 'Bounce',   css: 'animation: imaginBounce 1.6s ease-in-out infinite;', keyframes: '@keyframes imaginBounce { 0%,100% { transform: translateY(0) } 40% { transform: translateY(-18px) } 60% { transform: translateY(-6px) } }' },
    { id: 'wiggle',   label: 'Wiggle',   css: 'animation: imaginWiggle 1.8s ease-in-out infinite;', keyframes: '@keyframes imaginWiggle { 0%,100% { transform: rotate(-4deg) } 50% { transform: rotate(4deg) } }' },
];

export const ASSET_TYPE_META = {
    vector: { label: 'Vector', shortLabel: 'VCTR', icon: PenTool, description: 'Flat 2D PNG/JPEG', accent: '--accent-blue' },
    illustration: { label: 'Illustration', shortLabel: 'ILLUS', icon: Image, description: 'Digital artwork', accent: '--accent-gold' },
    '3d': { label: '3D Render', shortLabel: '3D', icon: Box, description: 'Product & object', accent: '--accent-green' },
    photo: { label: 'Photo', shortLabel: 'PHOTO', icon: Camera, description: 'Lifestyle & scene', accent: '--accent-red' },
};

export const ASSET_TYPE_PRESETS = {
    vector: {
        aspectRatio: '4:3',
        style: 'Flat Commercial',
        background: 'auto',
        outputFormat: 'PNG',
        highDpiSharpness: true,
        faceless: false,
        negativeSpace: true,
        styleHint: 'flat 2D vector graphic, clean minimal lines, isolated subject on solid plain background, commercial clipart style',
    },
    illustration: {
        aspectRatio: '4:3',
        style: 'Editorial Scene',
        background: 'auto',
        outputFormat: 'PNG',
        highDpiSharpness: true,
        faceless: false,
        negativeSpace: true,
        styleHint: 'digital illustration, detailed hand-crafted artwork, rich colors, editorial style, conceptual art',
    },
    '3d': {
        aspectRatio: '1:1',
        style: '3D Product Render',
        background: 'auto',
        outputFormat: 'PNG',
        highDpiSharpness: false,
        faceless: false,
        negativeSpace: true,
        styleHint: '3D rendered object, studio lighting, soft shadows, photorealistic materials, clean product render, isolated on white',
    },
    photo: {
        aspectRatio: '16:9',
        style: 'Lifestyle Scene',
        background: 'scene',
        outputFormat: 'JPEG',
        highDpiSharpness: true,
        faceless: false,
        negativeSpace: false,
        styleHint:
            'photorealistic lifestyle photography, full-bleed scene composition, ' +
            'natural environmental context, edge-to-edge framing, cinematic depth of field, ' +
            'commercial stock photography quality, no isolated subject on plain background',
    },
};
export const COMMERCIAL_ILLUSTRATION_STYLES = [
    'Flat Commercial', 'Cute Kids & Nursery', 'Hand-Drawn Organic', 'Cute Food & Object',
    'Editorial Scene', 'Flat Rounded', 'Textured Editorial', 'Seamless Pattern',
    'Minimal Outline', 'Bold Filled', 'Lineal Color', 'Isometric 3D',
    'Watercolor', 'Watercolor Vibrant', 'Acrylic Painterly', 'Gradient Cartoon', 'Mixed Media Collage',
];
export const STYLES_BY_ASSET_TYPE = {
    vector: COMMERCIAL_ILLUSTRATION_STYLES,
    illustration: COMMERCIAL_ILLUSTRATION_STYLES,
    '3d': ['Isometric 3D', '3D Product Render', '3D Object', '3D Character'],
    'photo': [
        'Lifestyle Scene',
        'Corporate Editorial',
        'Cinematic Wide Shot',
        'Studio Portrait',
        'Flat Lay Overhead',
        'Environmental Portrait',
    ],
};

export const ADOBE_CATEGORY_TAXONOMY = {
    'Abstract': ['Geometric Shapes', 'Fluid & Organic', 'Glitch & Digital', 'Texture & Pattern', 'Fractal & Mathematical'],
    'Animals': ['Wildlife', 'Pets & Domestic', 'Farm Animals', 'Marine Life', 'Birds', 'Insects & Bugs'],
    'Buildings and Architecture': ['Cityscapes', 'Interior Design', 'Historic & Landmarks', 'Modern Architecture', 'Industrial Buildings'],
    'Business': ['Finance & Banking', 'Technology & Digital', 'Teamwork & Meeting', 'Startup & Entrepreneurship', 'E-commerce & Retail', 'Charts & Infographics'],
    'Education': ['School & Classroom', 'Online Learning', 'Science & Research', 'Books & Reading', 'Graduation'],
    'Food and Drink': ['Healthy Food', 'Fast Food', 'Beverages', 'Cooking & Kitchen', 'Bakery & Desserts'],
    'Health and Medicine': ['Medical Equipment', 'Wellness & Fitness', 'Mental Health', 'Nutrition', 'Healthcare Workers'],
    'Holidays and Celebrations': ['Christmas & Winter', 'New Year', 'Easter', 'Halloween', 'Birthday & Party', 'Wedding'],
    'Illustrations and Clipart': ['Character Design', 'Mascot', 'Seamless Pattern', 'Geometric Pattern', 'Botanical Pattern', 'Floral Pattern', 'Abstract Pattern', 'Textile Pattern', 'Icon Set', 'Infographic Elements'],
    'Industrial': ['Manufacturing', 'Construction', 'Energy & Power', 'Mining', 'Logistics & Warehouse'],
    'Landscapes': ['Mountains & Hiking', 'Beach & Ocean', 'Desert', 'Forest', 'Urban Skyline'],
    'Lifestyle': ['Family & Parenting', 'Fitness & Sport', 'Fashion', 'Home & Living', 'Travel & Adventure'],
    'Nature': ['Flowers & Plants', 'Trees & Forest', 'Weather & Seasons', 'Ecology & Environment', 'Geology'],
    'Objects': ['Home & Furniture', 'Tools & Equipment', 'Electronics', 'Toys & Games', 'Clothing & Fashion'],
    'People': ['Business Person', 'Family', 'Diverse & Multicultural', 'Senior & Elderly', 'Children & Youth'],
    'Religion and Culture': ['Religious Symbols', 'Cultural Traditions', 'Mythology', 'Spiritual & Mindfulness'],
    'Science': ['Physics & Chemistry', 'Biology & DNA', 'Astronomy & Space', 'Mathematics', 'Technology & AI'],
    'Signs and Symbols': ['Safety & Warning', 'Navigation & Maps', 'Social Media Icons', 'Arrows & Shapes', 'Badges & Labels'],
    'Sports': ['Team Sports', 'Individual Sports', 'Water Sports', 'Winter Sports', 'Fitness Equipment'],
    'Technology': ['AI & Machine Learning', 'Cybersecurity', 'Cloud Computing', 'Mobile & Devices', 'Internet of Things', 'Robotics'],
    'Transportation': ['Cars & Vehicles', 'Aviation', 'Maritime', 'Public Transport', 'Logistics & Delivery'],
    'Travel': ['Landmarks & Monuments', 'Maps & Navigation', 'Hotel & Accommodation', 'Tourism', 'Cultural Destinations'],
};

export const MICROSTOCK_PLATFORMS = {
    adobe_stock: {
        label: 'Adobe Stock',
        status: 'active',  // 'active' | 'planned'
        csvColumns: ['Filename', 'Title', 'Keywords', 'Category', 'Releases', 'Generative AI'],
        titleMaxLen: 200,
        keywordRange: { min: 20, max: 50 },
        categories: [
            { id: 1,  name: 'Animals' },
            { id: 2,  name: 'Buildings and Architecture' },
            { id: 3,  name: 'Business' },
            { id: 4,  name: 'Drinks' },
            { id: 5,  name: 'The Environment' },
            { id: 6,  name: 'States of Mind' },
            { id: 7,  name: 'Food' },
            { id: 8,  name: 'Graphic Resources' },
            { id: 9,  name: 'Hobbies and Leisure' },
            { id: 10, name: 'Industry' },
            { id: 11, name: 'Landscape' },
            { id: 12, name: 'Lifestyle' },
            { id: 13, name: 'People' },
            { id: 14, name: 'Plants and Flowers' },
            { id: 15, name: 'Culture and Religion' },
            { id: 16, name: 'Science' },
            { id: 17, name: 'Social Issues' },
            { id: 18, name: 'Sports' },
            { id: 19, name: 'Technology' },
            { id: 20, name: 'Transport' },
            { id: 21, name: 'Travel' },
        ],
    },
    freepik: {
        label: 'Freepik',
        status: 'planned',  // taxonomy & CSV exporter belum selesai diriset
        csvColumns: [],
        titleMaxLen: 0,
        keywordRange: { min: 0, max: 0 },
        categories: [],     // akan diisi setelah riset resmi
    },
};
export const DEFAULT_PLATFORM = 'adobe_stock';
export const OFFICIAL_TO_DNA_MAP: Record<string, Record<number, { default: string; alternatives?: string[] }>> = {
    adobe_stock: {
        1: { default: 'Animals' }, 2: { default: 'Buildings and Architecture' }, 3: { default: 'Business' },
        4: { default: 'Food and Drink', alternatives: ['Lifestyle'] }, 5: { default: 'Nature', alternatives: ['Landscapes'] }, 6: { default: 'States of Mind' },
        7: { default: 'Food and Drink', alternatives: ['Lifestyle'] }, 8: { default: 'Illustrations and Clipart', alternatives: ['Abstract', 'Signs and Symbols', 'Objects'] },
        9: { default: 'Holidays and Celebrations', alternatives: ['Education', 'Lifestyle'] }, 10: { default: 'Industrial' }, 11: { default: 'Landscapes' },
        12: { default: 'Lifestyle', alternatives: ['Holidays and Celebrations'] }, 13: { default: 'People' }, 14: { default: 'Nature', alternatives: ['Landscapes'] },
        15: { default: 'Religion and Culture' }, 16: { default: 'Science', alternatives: ['Health and Medicine', 'Technology'] }, 17: { default: 'Social Issues' },
        18: { default: 'Sports' }, 19: { default: 'Technology', alternatives: ['Science'] }, 20: { default: 'Transportation' }, 21: { default: 'Travel', alternatives: ['Landscapes'] },
    },
};
export const DNA_TO_OFFICIAL_MAP: Record<string, Record<string, number>> = { adobe_stock: {
    Animals: 1, 'Buildings and Architecture': 2, Business: 3, 'Food and Drink': 7, Nature: 5, Landscapes: 11,
    'States of Mind': 6, 'Illustrations and Clipart': 8, Abstract: 8, 'Signs and Symbols': 8, Objects: 8,
    'Holidays and Celebrations': 9, Education: 9, Industrial: 10, Lifestyle: 12, People: 13, 'Religion and Culture': 15,
    'Health and Medicine': 16, Science: 16, 'Social Issues': 17, Sports: 18, Technology: 19, Transportation: 20, Travel: 21,
} };

export interface PlatformAdapter {
    key: string; label: string; status: 'active' | 'planned';
    platform: { titleMaxLen: number; keywordRange: { min: number; max: number }; csvColumns: string[] };
    categories: { id: number; name: string }[];
    resolveCategory(categoryId: number | null, subcategoryHint: string): string;
    dnaToOfficial(dnaCategory: string): number | null;
    config(): { csvColumns: string[]; titleMaxLen: number; keywordRange: { min: number; max: number } };
}
const adobeAdapter: PlatformAdapter = {
    key: 'adobe_stock', label: 'Adobe Stock', status: 'active', platform: { titleMaxLen: 200, keywordRange: { min: 20, max: 50 }, csvColumns: MICROSTOCK_PLATFORMS.adobe_stock.csvColumns }, categories: MICROSTOCK_PLATFORMS.adobe_stock.categories,
    resolveCategory(id, hint) { const h = (hint || '').toLowerCase(); if (id === 5 && /landscape|mountain|beach/.test(h)) return 'Landscapes'; return OFFICIAL_TO_DNA_MAP.adobe_stock[id as number]?.default || ''; },
    dnaToOfficial(dna) { return DNA_TO_OFFICIAL_MAP.adobe_stock[dna] ?? null; },
    config() { return { csvColumns: this.platform.csvColumns, titleMaxLen: this.platform.titleMaxLen, keywordRange: this.platform.keywordRange }; },
};
const freepikAdapter: PlatformAdapter = { key: 'freepik', label: 'Freepik', status: 'planned', platform: { titleMaxLen: 0, keywordRange: { min: 0, max: 0 }, csvColumns: [] }, categories: [], resolveCategory: () => '', dnaToOfficial: () => null, config() { return { csvColumns: [], titleMaxLen: 0, keywordRange: { min: 0, max: 0 } }; } };
export const PLATFORM_ADAPTERS: Record<string, PlatformAdapter> = { adobe_stock: adobeAdapter, freepik: freepikAdapter };

export const METADATA_RULES = {
    title: { MIN_LEN: 40, TARGET_MAX_LEN: 70, HARD_MAX_LEN: 200, MAX_LEN: 70 },
    keywords: { TAGS_COUNT: 45, MIN_COUNT: 20, MAX_COUNT: 50 },
};

export const SUBJECT_TYPES = [
    { label: 'SINGLE_CHARACTER', excludesPeople: false, desc: 'Single character portrait, waist-up or full body, expressive emotion, emphasis on authentic cultural attire and facial detail' },
    { label: 'CHARACTER_PAIR', excludesPeople: false, desc: 'A pair of people in natural interaction, expressive body language, cultural attire clearly visible on both figures' },
    { label: 'SMALL_GROUP', excludesPeople: false, desc: 'Small group of 3-4 local citizens in a dynamic celebratory moment, natural candid poses, full or waist-up body, plain gradient background' },
    { label: 'CROWD_SCENE', excludesPeople: false, desc: 'A lively crowd or gathering of many figures in motion, festive communal energy, plain gradient background — no landmark backdrop' },
    { label: 'OBJECT_STILL_LIFE', excludesPeople: true, desc: 'Flat-lay or isometric arrangement of cultural objects and crafts ONLY. Absolutely no people, no human figures, no body parts. Strictly still-life.' },
    { label: 'ARCHITECTURE_LANDMARK', excludesPeople: true, desc: 'Standalone landmark or architecture illustration, wide establishing shot, no people, focus on structural details and monument scale' },
    { label: 'EMBLEM_BADGE', excludesPeople: true, desc: 'Minimalist centered emblem, badge, or crest design. Isolated on clean background, vector icon style, symmetrical composition.' },
    { label: 'DETAIL_CLOSEUP', excludesPeople: true, desc: 'Extreme close-up detail of a single cultural object or symbol, macro composition style, high visual clarity and texture detail — no full scene context' },
];
export const CAMERA_ANGLES = ['eye-level front view with direct subject engagement', 'three-quarter angle view, natural and dynamic perspective', 'low angle looking up, conveying heroic or monumental scale', "high angle overhead bird's-eye view, flat-lay or layout feel", 'side profile view, clean silhouette-forward composition', 'wide establishing shot with full environmental context visible'];
export const ACTIVITY_CONTEXTS = ['in a moment of quiet personal reflection', 'actively engaged in a traditional cultural activity or craft', 'in a candid and authentic everyday life moment', 'in a formal ceremonial or celebratory pose', 'in motion or mid-action, dynamic energy captured', 'gathered around a central symbolic object or ritual altar', 'performing or presenting expressively for an audience'];
export const FRAMING_STYLES = ['tight cropped composition filling the frame with the subject', 'generous negative space around the subject for clean copyspace', 'centered symmetrical composition, balanced and formal structure', 'off-center asymmetrical composition with natural candid energy', 'full-bleed edge-to-edge immersive composition'];

export const BACKGROUND_STRATEGY = {
    white: { mode: 'white' as const, promptHint: 'pure white background, subject fully isolated, clean commercial stock style' },
    transparent: { mode: 'transparent' as const, promptHint: 'transparent background (alpha channel), subject isolated with clean edges, no background fill' },
    gradient: { mode: 'white' as const, promptHint: 'soft subtle gradient background, gentle tonal transition, not pure flat white, implied environmental atmosphere' },
    scene: { mode: 'scene' as const, promptHint: 'natural environmental scene background, full contextual depth, realistic setting appropriate to subject, authentic location or interior, ambient lighting consistent with scene' },
} as const;
export type BackgroundStrategyKey = keyof typeof BACKGROUND_STRATEGY;
export const CATEGORY_BACKGROUND_STRATEGY: Record<string, BackgroundStrategyKey> = { Abstract: 'gradient', Animals: 'white', 'Buildings and Architecture': 'gradient', Business: 'white', Education: 'white', 'Food and Drink': 'white', 'Health and Medicine': 'white', 'Holidays and Celebrations': 'gradient', 'Illustrations and Clipart': 'white', Industrial: 'white', Landscapes: 'gradient', Lifestyle: 'gradient', Nature: 'gradient', Objects: 'white', People: 'white', 'Religion and Culture': 'gradient', Science: 'white', 'Signs and Symbols': 'white', Sports: 'gradient', Technology: 'white', Transportation: 'gradient', Travel: 'gradient' };
export const SUBCATEGORY_BACKGROUND_OVERRIDE: Record<string, Record<string, BackgroundStrategyKey>> = { Abstract: { 'Geometric Shapes': 'white', 'Fluid & Organic': 'gradient', 'Texture & Pattern': 'gradient', 'Fractal & Mathematical': 'gradient', 'Glitch & Digital': 'gradient' }, Animals: { Wildlife: 'gradient', 'Marine Life': 'gradient', Birds: 'gradient', 'Pets & Domestic': 'white', 'Farm Animals': 'gradient', 'Insects & Bugs': 'white' }, Business: { 'Charts & Infographics': 'white', 'Finance & Banking': 'white', 'E-commerce & Retail': 'white', 'Teamwork & Meeting': 'gradient', 'Startup & Entrepreneurship': 'gradient', 'Technology & Digital': 'white' } };
export const ASSET_TYPE_DEFAULT_BACKGROUND: Record<string, string> = { vector: 'white', illustration: 'white', '3d': 'white', photo: 'scene' };
export interface ResolvedBackground { mode: string; promptHint: string; wasOverridden: boolean; }
