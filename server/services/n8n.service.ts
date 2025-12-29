import axios from 'axios';
import type { N8NWorkflow } from '@shared/types/workflow.types';

export class N8nService {
  private baseUrl: string;
  private apiKey: string;
  private webhookUrl: string;

  constructor(baseUrl: string, apiKey: string, webhookUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.webhookUrl = webhookUrl;
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
      if (Array.isArray(response.data) && response.data.length > 0) {
          const wf = response.data[0];
          return {
              id: wf.id,
              name: wf.name
          };
      }

      // Handle single object response
      if (response.data && (response.data.id || response.data.workflowId)) {
          return {
              id: response.data.id || response.data.workflowId,
              name: response.data.name || cleanName
          };
      }
      
      // Fallback if webhook just says "OK" but we need the ID? 
      // The requirement says: "get the new id from it using webhook in n8n"
      // So we assume the webhook returns it.
      
      // If the webhook response is just the string "Workflow created" or similar, we might have a problem.
      // But let's check if the response data ITSELF is the workflow object
      if (response.data && response.data.name === cleanName) {
           return {
              id: response.data.id,
              name: response.data.name 
          };
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
}

// Singleton or Factory
export function createN8nService(): N8nService {
  // Use environment variables
  // Fallback values or check for existence
  const baseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678/api/v1';
  const apiKey = process.env.N8N_API_KEY || '';
  const webhookUrl = process.env.N8N_CREATE_WORKFLOW_WEBHOOK_URL || 'https://eranclikview.app.n8n.cloud/webhook/create_workflow';

  if (!apiKey) {
      console.warn('N8N_API_KEY is not set. N8N integration will fail.');
  }

  return new N8nService(baseUrl, apiKey, webhookUrl);
}
