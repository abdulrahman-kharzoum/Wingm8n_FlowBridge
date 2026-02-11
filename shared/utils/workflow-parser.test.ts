/**
 * Unit Tests for Workflow Parser Utilities
 * Tests for credential extraction with usage tracking
 */

import { describe, it, expect } from 'vitest';
import { extractCredentials, extractCredentialsWithUsage, compareCredentials } from './workflow-parser';
import type { N8NWorkflow } from '../types/workflow.types';

describe('Workflow Parser - Credential Extraction', () => {
    describe('extractCredentials', () => {
        it('should extract a single credential from a workflow', () => {
            const workflow: N8NWorkflow = {
                name: 'Test Workflow',
                nodes: [
                    {
                        id: 'node1',
                        name: 'Supabase Node',
                        type: 'n8n-nodes-base.supabase',
                        parameters: { authentication: 'supabaseApi' },
                        credentials: {
                            supabaseApi: {
                                id: 'cred-123',
                                name: 'Production DB',
                            },
                        },
                    },
                ],
            };

            const credentials = extractCredentials(workflow);

            expect(credentials).toHaveLength(1);
            expect(credentials[0]).toEqual({
                id: 'cred-123',
                name: 'Production DB',
                type: 'supabaseApi',
                nodeType: 'n8n-nodes-base.supabase',
                nodeAuthType: 'supabaseApi',
            });
        });

        it('should extract multiple credentials of different types', () => {
            const workflow: N8NWorkflow = {
                name: 'Multi-Credential Workflow',
                nodes: [
                    {
                        id: 'node1',
                        name: 'Supabase Node',
                        type: 'n8n-nodes-base.supabase',
                        credentials: {
                            supabaseApi: { id: 'cred-supabase-1', name: 'Supabase Prod' },
                        },
                    },
                    {
                        id: 'node2',
                        name: 'GitHub Node',
                        type: 'n8n-nodes-base.github',
                        credentials: {
                            githubApi: { id: 'cred-github-1', name: 'GitHub Token' },
                        },
                    },
                ],
            };

            const credentials = extractCredentials(workflow);

            expect(credentials).toHaveLength(2);
            expect(credentials.map(c => c.type)).toContain('supabaseApi');
            expect(credentials.map(c => c.type)).toContain('githubApi');
        });

        it('should deduplicate credentials by ID', () => {
            const workflow: N8NWorkflow = {
                name: 'Shared Credential Workflow',
                nodes: [
                    {
                        id: 'node1',
                        name: 'Supabase Node 1',
                        type: 'n8n-nodes-base.supabase',
                        credentials: {
                            supabaseApi: { id: 'shared-cred', name: 'Shared Supabase' },
                        },
                    },
                    {
                        id: 'node2',
                        name: 'Supabase Node 2',
                        type: 'n8n-nodes-base.supabase',
                        credentials: {
                            supabaseApi: { id: 'shared-cred', name: 'Shared Supabase' },
                        },
                    },
                ],
            };

            const credentials = extractCredentials(workflow);

            expect(credentials).toHaveLength(1);
            expect(credentials[0].id).toBe('shared-cred');
        });
    });

    describe('extractCredentialsWithUsage', () => {
        it('should extract credentials with node usage tracking', () => {
            const workflow: N8NWorkflow = {
                name: 'Test Workflow',
                nodes: [
                    {
                        id: 'node1',
                        name: 'Supabase Node',
                        type: 'n8n-nodes-base.supabase',
                        credentials: {
                            supabaseApi: { id: 'cred-123', name: 'Production DB' },
                        },
                    },
                ],
            };

            const credentials = extractCredentialsWithUsage(workflow);

            expect(credentials).toHaveLength(1);
            expect(credentials[0].usedByNodes).toHaveLength(1);
            expect(credentials[0].usedByNodes[0]).toEqual({
                nodeId: 'node1',
                nodeName: 'Supabase Node',
                nodeType: 'n8n-nodes-base.supabase',
            });
        });

        it('should track multiple nodes using the same credential', () => {
            const workflow: N8NWorkflow = {
                name: 'Shared Credential Workflow',
                nodes: [
                    {
                        id: 'node1',
                        name: 'Supabase Read Node',
                        type: 'n8n-nodes-base.supabase',
                        credentials: {
                            supabaseApi: { id: 'shared-supabase', name: 'Shared DB' },
                        },
                    },
                    {
                        id: 'node2',
                        name: 'Supabase Write Node',
                        type: 'n8n-nodes-base.supabase',
                        credentials: {
                            supabaseApi: { id: 'shared-supabase', name: 'Shared DB' },
                        },
                    },
                    {
                        id: 'node3',
                        name: 'Different Node',
                        type: 'n8n-nodes-base.httpRequest',
                        credentials: {
                            httpHeaderAuth: { id: 'http-auth', name: 'HTTP Auth' },
                        },
                    },
                ],
            };

            const credentials = extractCredentialsWithUsage(workflow);

            expect(credentials).toHaveLength(2);

            const sharedSupabase = credentials.find(c => c.id === 'shared-supabase');
            expect(sharedSupabase).toBeDefined();
            expect(sharedSupabase!.usedByNodes).toHaveLength(2);
            expect(sharedSupabase!.usedByNodes.map(n => n.nodeName)).toContain('Supabase Read Node');
            expect(sharedSupabase!.usedByNodes.map(n => n.nodeName)).toContain('Supabase Write Node');
        });

        it('should handle workflows with no credentials', () => {
            const workflow: N8NWorkflow = {
                name: 'No Credentials Workflow',
                nodes: [
                    {
                        id: 'node1',
                        name: 'Manual Trigger',
                        type: 'n8n-nodes-base.manualTrigger',
                    },
                ],
            };

            const credentials = extractCredentialsWithUsage(workflow);

            expect(credentials).toHaveLength(0);
        });

        it('should handle workflows with no nodes', () => {
            const workflow: N8NWorkflow = {
                name: 'Empty Workflow',
                nodes: [],
            };

            const credentials = extractCredentialsWithUsage(workflow);

            expect(credentials).toHaveLength(0);
        });

        it('should track credentials with different types on same node', () => {
            const workflow: N8NWorkflow = {
                name: 'Multi-Credential Node',
                nodes: [
                    {
                        id: 'node1',
                        name: 'Complex Node',
                        type: 'n8n-nodes-base.httpRequest',
                        parameters: {},
                        credentials: {
                            httpHeaderAuth: { id: 'http-auth', name: 'Header Auth' },
                            httpQueryAuth: { id: 'query-auth', name: 'Query Auth' },
                        },
                    },
                ],
            };

            const credentials = extractCredentialsWithUsage(workflow);

            expect(credentials).toHaveLength(2);

            const httpAuth = credentials.find(c => c.id === 'http-auth');
            const queryAuth = credentials.find(c => c.id === 'query-auth');

            expect(httpAuth).toBeDefined();
            expect(queryAuth).toBeDefined();

            expect(httpAuth!.usedByNodes).toHaveLength(1);
            expect(queryAuth!.usedByNodes).toHaveLength(1);
            expect(httpAuth!.usedByNodes[0].nodeName).toBe('Complex Node');
            expect(queryAuth!.usedByNodes[0].nodeName).toBe('Complex Node');
        });
    });

    describe('compareCredentials', () => {
        it('should compare credentials between branches', () => {
            const stagingCredentials = [
                {
                    id: 'cred-1',
                    name: 'Staging DB',
                    type: 'supabaseApi',
                    nodeType: 'n8n-nodes-base.supabase',
                    usedByNodes: [{ nodeId: 'n1', nodeName: 'Node 1', nodeType: 'n8n-nodes-base.supabase' }]
                },
            ];
            const mainCredentials = [
                {
                    id: 'cred-2',
                    name: 'Main DB',
                    type: 'supabaseApi',
                    nodeType: 'n8n-nodes-base.supabase',
                    usedByNodes: [{ nodeId: 'n2', nodeName: 'Node 2', nodeType: 'n8n-nodes-base.supabase' }]
                },
            ];

            const diffs = compareCredentials(stagingCredentials, mainCredentials);

            expect(diffs).toHaveLength(2);

            const stagingDiff = diffs.find(d => d.id === 'cred-1');
            const mainDiff = diffs.find(d => d.id === 'cred-2');

            expect(stagingDiff).toBeDefined();
            expect(stagingDiff!.inStaging).toBe(true);
            expect(stagingDiff!.inMain).toBe(false);
            expect(stagingDiff!.stagingOnly).toBe(true);

            // Should find alternatives (cred-2 is same type 'supabaseApi' but different ID)
            expect(stagingDiff!.alternatives).toHaveLength(1);
            expect(stagingDiff!.alternatives[0].id).toBe('cred-2');

            expect(mainDiff).toBeDefined();
            expect(mainDiff!.inStaging).toBe(false);
            expect(mainDiff!.inMain).toBe(true);
            expect(mainDiff!.mainOnly).toBe(true);
        });

        it('should identify same credentials present in both branches', () => {
            const stagingCredentials = [
                {
                    id: 'cred-shared',
                    name: 'Shared DB',
                    type: 'supabaseApi',
                    nodeType: 'n8n-nodes-base.supabase',
                    usedByNodes: []
                },
            ];
            const mainCredentials = [
                {
                    id: 'cred-shared',
                    name: 'Shared DB',
                    type: 'supabaseApi',
                    nodeType: 'n8n-nodes-base.supabase',
                    usedByNodes: []
                },
            ];

            const diffs = compareCredentials(stagingCredentials, mainCredentials);

            expect(diffs).toHaveLength(1);
            expect(diffs[0].inStaging).toBe(true);
            expect(diffs[0].inMain).toBe(true);
            expect(diffs[0].stagingOnly).toBe(false);
            expect(diffs[0].mainOnly).toBe(false);
            expect(diffs[0].alternatives).toHaveLength(0); // No alternatives as it exists in both
        });
    });
});
