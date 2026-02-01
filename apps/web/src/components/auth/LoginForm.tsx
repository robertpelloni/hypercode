
'use client';

import React, { useState } from 'react';
import Link from 'next/link';

import { Button, Input } from '@borg/ui';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Login attempt:', email);
        // TODO: Integrate auth
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-blue-500/50"
                />
                <div className="relative">
                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-blue-500/50"
                    />
                    <div className="absolute right-0 top-11">
                        <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-blue-500 z-10 relative mr-2">
                            Forgot?
                        </Link>
                    </div>
                </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                Sign In
            </Button>
        </form>
    );
}
