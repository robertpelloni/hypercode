import { type ComponentType, type SVGProps } from 'react';

/**
 * NavItem - A single navigable item in the dashboard sidebar.
 * Icon uses React ComponentType to support both heroicons and inline SVG components.
 */
export interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    badge?: string | number;
}

/**
 * NavArea - A grouping of NavItems representing a logical section of the dashboard.
 */
export interface NavArea {
    id: string;
    label: string;
    description: string;
    items: NavItem[];
}
