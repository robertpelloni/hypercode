/**
 * Ambient type declarations for @heroicons/react/24/outline.
 * 
 * Heroicons are not installed as a direct dependency in apps/web, but are used 
 * in nav-config.ts and swarm/page.tsx. This provides stub type declarations
 * so TypeScript doesn't error on the imports. The actual icons render as 
 * functional React components that accept standard SVG props.
 * 
 * If @heroicons/react is later installed as a real dependency, this file
 * should be deleted in favor of the package's own types.
 */
declare module '@heroicons/react/24/outline' {
    import { ComponentType, SVGProps } from 'react';

    export const UsersIcon: ComponentType<SVGProps<SVGSVGElement>>;
    export const UserGroupIcon: ComponentType<SVGProps<SVGSVGElement>>;
    export const ScaleIcon: ComponentType<SVGProps<SVGSVGElement>>;
    export const ArrowsRightLeftIcon: ComponentType<SVGProps<SVGSVGElement>>;
    export const PlayIcon: ComponentType<SVGProps<SVGSVGElement>>;
    export const BuildingLibraryIcon: ComponentType<SVGProps<SVGSVGElement>>;
    export const CommandLineIcon: ComponentType<SVGProps<SVGSVGElement>>;
    export const CircleStackIcon: ComponentType<SVGProps<SVGSVGElement>>;
    export const CpuChipIcon: ComponentType<SVGProps<SVGSVGElement>>;
    export const CloudIcon: ComponentType<SVGProps<SVGSVGElement>>;
    export const GlobeAltIcon: ComponentType<SVGProps<SVGSVGElement>>;
}
