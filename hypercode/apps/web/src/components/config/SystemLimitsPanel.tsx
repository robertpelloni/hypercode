'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, Switch, Label } from '@hypercode/ui';

function isBooleanSetting(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

export function SystemLimitsPanel() {
    const signupQuery = trpc.config.getSignupDisabled.useQuery();
    const setSignupMutation = trpc.config.setSignupDisabled.useMutation({
        onSuccess: () => signupQuery.refetch()
    });

    const ssoQuery = trpc.config.getSsoSignupDisabled.useQuery();
    const setSsoMutation = trpc.config.setSsoSignupDisabled.useMutation({
        onSuccess: () => ssoQuery.refetch()
    });

    const basicAuthQuery = trpc.config.getBasicAuthDisabled.useQuery();
    const setBasicAuthMutation = trpc.config.setBasicAuthDisabled.useMutation({
        onSuccess: () => basicAuthQuery.refetch()
    });

    const mcpResetQuery = trpc.config.getMcpResetTimeoutOnProgress.useQuery();
    const setMcpResetMutation = trpc.config.setMcpResetTimeoutOnProgress.useMutation({
        onSuccess: () => mcpResetQuery.refetch()
    });
    const signupUnavailable = Boolean(signupQuery.error) || (signupQuery.data !== undefined && !isBooleanSetting(signupQuery.data));
    const ssoUnavailable = Boolean(ssoQuery.error) || (ssoQuery.data !== undefined && !isBooleanSetting(ssoQuery.data));
    const basicAuthUnavailable = Boolean(basicAuthQuery.error) || (basicAuthQuery.data !== undefined && !isBooleanSetting(basicAuthQuery.data));
    const mcpResetUnavailable = Boolean(mcpResetQuery.error) || (mcpResetQuery.data !== undefined && !isBooleanSetting(mcpResetQuery.data));
    const policyErrorMessage = signupQuery.error?.message
        || ssoQuery.error?.message
        || basicAuthQuery.error?.message
        || mcpResetQuery.error?.message
        || (signupUnavailable || ssoUnavailable || basicAuthUnavailable || mcpResetUnavailable
            ? 'System policy settings returned an invalid payload.'
            : undefined);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-2">System Policy & Security</h2>
            <p className="text-sm text-gray-400 mb-6">Manage global authentication policies and execution limits.</p>

            {policyErrorMessage && (
                <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    System policy settings unavailable: {policyErrorMessage}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5 bg-gray-900 border-gray-800 space-y-6">
                    <h3 className="font-semibold border-b border-gray-800 pb-2 text-gray-200">Authentication</h3>
                    
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Disable New Signups</Label>
                            <p className="text-xs text-gray-500">Prevent new users from registering locally.</p>
                        </div>
                        <Switch 
                            checked={isBooleanSetting(signupQuery.data) ? signupQuery.data : false}
                            onCheckedChange={(v) => setSignupMutation.mutate({ disabled: v })}
                            disabled={signupQuery.isLoading || signupUnavailable || setSignupMutation.isPending}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Disable SSO Signups</Label>
                            <p className="text-xs text-gray-500">Prevent new users from registering via OAuth/SSO.</p>
                        </div>
                        <Switch 
                            checked={isBooleanSetting(ssoQuery.data) ? ssoQuery.data : false}
                            onCheckedChange={(v) => setSsoMutation.mutate({ disabled: v })}
                            disabled={ssoQuery.isLoading || ssoUnavailable || setSsoMutation.isPending}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Disable Basic Auth</Label>
                            <p className="text-xs text-gray-500">Force users to use SSO/OAuth only.</p>
                        </div>
                        <Switch 
                            checked={isBooleanSetting(basicAuthQuery.data) ? basicAuthQuery.data : false}
                            onCheckedChange={(v) => setBasicAuthMutation.mutate({ disabled: v })}
                            disabled={basicAuthQuery.isLoading || basicAuthUnavailable || setBasicAuthMutation.isPending}
                        />
                    </div>
                </Card>

                <Card className="p-5 bg-gray-900 border-gray-800 space-y-6">
                    <h3 className="font-semibold border-b border-gray-800 pb-2 text-gray-200">MCP Execution Limits</h3>
                    
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Reset Timeout on Progress</Label>
                            <p className="text-xs text-gray-500">If enabled, MCP tools extending their runtime won't hit hard timeouts if they report progress.</p>
                        </div>
                        <Switch 
                            checked={isBooleanSetting(mcpResetQuery.data) ? mcpResetQuery.data : false}
                            onCheckedChange={(v) => setMcpResetMutation.mutate({ enabled: v })}
                            disabled={mcpResetQuery.isLoading || mcpResetUnavailable || setMcpResetMutation.isPending}
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
}
