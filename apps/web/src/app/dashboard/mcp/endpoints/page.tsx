import { redirect } from 'next/navigation';

export default function DeprecatedEndpointsPage(): never {
    redirect('/dashboard/mcp');
}