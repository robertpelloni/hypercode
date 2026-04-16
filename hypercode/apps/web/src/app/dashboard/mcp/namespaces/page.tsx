import { redirect } from 'next/navigation';

export default function DeprecatedNamespacesPage(): never {
    redirect('/dashboard/mcp/search');
}