import axios from 'axios';
import type { N8NWorkflow } from '@shared/types/workflow.types';

export class N8nService {
  private baseUrl: string;
  private apiKey: string;
  private webhookUrl: string;
  private mergeWebhookUrl: string;
  private credentialWebhookUrl: string;
  private fetchDevWorkflowsWebhookUrl: string;

  constructor(baseUrl: string, apiKey: string, webhookUrl: string, mergeWebhookUrl: string, credentialWebhookUrl: string, fetchDevWorkflowsWebhookUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.webhookUrl = webhookUrl;
    this.mergeWebhookUrl = mergeWebhookUrl;
    this.credentialWebhookUrl = credentialWebhookUrl;
    this.fetchDevWorkflowsWebhookUrl = fetchDevWorkflowsWebhookUrl;
  }


  /**
   * Create a new workflow in N8N via Webhook
   * @param workflowData The full workflow JSON object
   */
  async createWorkflow(workflowData: N8NWorkflow): Promise<{ id: string; name: string }> {
    try {
        // Ensure name does NOT have "staging - " prefix if present (though UI should handle this)
        // actually, we should probably send exactly what we are given, but cleanup is good.
        const cleanName = workflowData.name.replace(/^staging - /i, '');
        
        const payload = {
            ...workflowData,
            name: cleanName,
            // Ensure we don't send an ID so N8N creates a new one
            id: undefined, 
        };

      console.log(`[N8nService] Creating workflow via webhook: ${this.webhookUrl}`);
      const response = await axios.post(this.webhookUrl, payload, {
          headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': this.apiKey, // Including API Key in case webhook requires it
          }
      });

      // Assuming the webhook returns the created workflow ID and Name
      // Adjust structure based on actual Webhook response
      // Handle array response (as specified by user requirement)
      // Handle N8N execution data structure (Array of One item usually)
      if (Array.isArray(response.data) && response.data.length > 0) {
          const firstItem = response.data[0];
          
          // Check for direct ID/Name (if webhook returns simple JSON)
          if (firstItem.id && firstItem.name) {
               return { id: firstItem.id, name: firstItem.name };
          }
          
          // Check for N8N "Last Node Executed" structure: { result: { data: { json: { id, name } } } }
          if (firstItem.result?.data?.json?.id) {
              return {
                  id: firstItem.result.data.json.id,
                  name: firstItem.result.data.json.name || cleanName
              };
          }

          // Sometimes it might be directly in json property?
          if (firstItem.json?.id) {
              return {
                  id: firstItem.json.id,
                  name: firstItem.json.name || cleanName
              };
          }
      }

      // Handle single object response
      if (response.data) {
           if (response.data.id || response.data.workflowId) {
                return {
                    id: response.data.id || response.data.workflowId,
                    name: response.data.name || cleanName
                };
           }
           // Check nesting in single object
           if (response.data.result?.data?.json?.id) {
               return {
                    id: response.data.result.data.json.id,
                    name: response.data.result.data.json.name || cleanName
                };
           }
      }
      
      console.warn('[N8nService] Webhook response did not contain clear ID, returning partial info', response.data);
      // Construct a "best guess" or throw if strictly required. 
      // Let's assume for now the user needs to check N8N if this happens.
      // Or maybe we fetch all workflows again to find it by name?
      
      // Attempt to look it up?
      // const all = await this.getAllWorkflows();
      // const found = all.find(w => w.name === cleanName);
      // if (found) return found;

      throw new Error('Webhook response did not contain new Workflow ID');

    } catch (error: any) {
      console.error('Failed to create workflow in N8N:', error);
      throw new Error('Failed to create workflow in N8N');
    }
  }

  /**
   * Sync a workflow to Production N8N via the Merge Webhook
   * @param workflowData The full workflow JSON object
   */
  async syncWorkflowViaWebhook(workflowData: N8NWorkflow): Promise<void> {
    try {
      console.log(`[N8nService] Syncing workflow to production via webhook: ${this.mergeWebhookUrl}`);
      
      // The webhook expects the workflow JSON directly
      await axios.post(this.mergeWebhookUrl, workflowData, {
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': this.apiKey,
        }
      });

      console.log(`[N8nService] Successfully synced workflow "${workflowData.name}"`);
    } catch (error: any) {
      console.error(`[N8nService] Failed to sync workflow "${workflowData.name}":`, error.message);
      throw new Error(`Failed to sync workflow "${workflowData.name}" to production`);
    }
  }

  /**
   * Create a new credential in N8N via Webhook
   * @param type The type of credential (supabase, respondio, postgres)
   * @param data The credential data
   */
  async createCredentialViaWebhook(type: string, data: any): Promise<{ id: string; name: string } | void> {
    try {
      console.log(`[N8nService] Creating credential (${type}) via webhook: ${this.credentialWebhookUrl}`);
      
      const payload = {
        type,
        data
      };

      const response = await axios.post(this.credentialWebhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': this.apiKey,
        }
      });

      console.log(`[N8nService] Successfully request credential creation for "${type}"`);
      
      // If webhook returns the created credential ID, return it
      if (response.data && response.data.id) {
          return { id: response.data.id, name: response.data.name || type };
      }
      // If array
      if (Array.isArray(response.data) && response.data[0]?.id) {
          return { id: response.data[0].id, name: response.data[0].name || type };
      }

    } catch (error: any) {
      console.error(`[N8nService] Failed to create credential "${type}":`, error.message);
      throw new Error(`Failed to create credential "${type}"`);
    }
  }

  /**
   * Fetch all "dev" workflows from Production via Webhook
   */
  async fetchDevWorkflows(): Promise<N8NWorkflow[]> {
      try {
          console.log(`[N8nService] Fetching dev workflows via webhook: ${this.fetchDevWorkflowsWebhookUrl}`);
          const response = await axios.get(this.fetchDevWorkflowsWebhookUrl, {
              headers: {
                  'X-N8N-API-KEY': this.apiKey
              }
          });
          
          if (Array.isArray(response.data)) {
              return response.data;
          }
          // Handle wrapped response
          if (response.data && Array.isArray(response.data.data)) {
              return response.data.data;
          }
          
          console.warn('[N8nService] Unexpected response format for dev workflows:', response.data);
          return [];
      } catch (error: any) {
          console.error('[N8nService] Failed to fetch dev workflows:', error.message);
          throw new Error('Failed to fetch dev workflows');
      }
  }
}

// Singleton or Factory
export function createN8nService(): N8nService {
  // Use environment variables
  // Fallback values or check for existence
  const baseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678/api/v1';
  const apiKey = process.env.N8N_API_KEY || '';
  const webhookUrl = process.env.N8N_CREATE_WORKFLOW_WEBHOOK_URL || 'https://eranclikview.app.n8n.cloud/webhook/create_workflow';
  const mergeWebhookUrl = process.env.N8N_MERGE_WEBHOOK_URL || 'https://n8n.wonderbeauties.com/webhook/merge_n8n_github';
  const credentialWebhookUrl = process.env.N8N_CREATE_CREDENTIAL_WEBHOOK_URL || 'https://n8n.wonderbeauties.com/webhook/create_credential';
  const fetchDevWorkflowsWebhookUrl = process.env.N8N_FETCH_DEV_WORKFLOWS_WEBHOOK_URL || 'https://n8n.wonderbeauties.com/webhook/fetch_dev_workflows';

  if (!apiKey) {
      console.warn('N8N_API_KEY is not set. N8N integration will fail.');
  }

  return new N8nService(baseUrl, apiKey, webhookUrl, mergeWebhookUrl, credentialWebhookUrl, fetchDevWorkflowsWebhookUrl);
}
