settings: {
executionOrder: 'v1',
callerPolicy: 'workflowsFromSameOwner',
availableInMCP: false
},
staticData: {
'node:Shopify Trigger': {},
'node:Schedule Trigger': { recurrenceRules: [Array] }
},
meta: null,
pinData: {},
versionId: '02677eb7-6c8c-4bfb-80c5-809a7cfc7a6e',
activeVersionId: null,
triggerCount: 0,
shared: [
{
updatedAt: '2025-12-15T12:04:36.607Z',
createdAt: '2025-12-15T12:04:36.607Z',
role: 'workflow:owner',
workflowId: 'MRJ7p3qK1tSBnCNS',
projectId: 'GVBCAR6zsSYwPkOP'
}
],
activeVersion: null,
tags: [
{
updatedAt: '2025-12-15T09:05:24.876Z',
createdAt: '2025-12-15T09:05:24.876Z',
id: 'TtFAmcwpV0E8mFoT',
name: 'STAGING'
}
]
}
[Merge] Debug - Main workflow object: {
updatedAt: '2025-12-18T16:11:49.325Z',
createdAt: '2025-12-18T16:09:17.362Z',
id: 'ZOYXoAaLsuqMpPr7',
name: 'dev - Shopify update Price & Stock',
active: false,
isArchived: false,
nodes: [
{
parameters: [Object],
type: 'n8n-nodes-base.postgres',
typeVersion: 2.6,
position: [Array],
id: 'f3ae263c-1bc6-46f6-8a9f-89851c1cc33f',
name: 'Execute a SQL query',
credentials: [Object]
},
{
parameters: [Object],
type: 'n8n-nodes-base.supabase',
typeVersion: 1,
position: [Array],
id: '9424f5ee-1f28-47a0-a334-bef40b5c7ad8',
name: 'Get many rows',
credentials: [Object]
},
{
parameters: [Object],
type: 'n8n-nodes-base.set',
typeVersion: 3.4,
position: [Array],
id: '04a1fe62-3b6e-4b02-942b-c1b44eec915c',
name: 'Edit Fields'
},
{
parameters: [Object],
type: 'n8n-nodes-base.telegram',
typeVersion: 1.2,
position: [Array],
id: '5197aac2-4adc-44e6-b575-dd372df56aa2',
name: 'UPDATING',
webhookId: '13223249-6d6a-4859-a614-d624a0f3c096',
executeOnce: true,
credentials: [Object]
},
{
parameters: [Object],
type: 'n8n-nodes-base.telegram',
typeVersion: 1.2,
position: [Array],
id: 'dea8b767-698e-45d9-9de0-15c8f62efebe',
name: 'UPDATE SUCCESSFUL',
webhookId: '13223249-6d6a-4859-a614-d624a0f3c096',
executeOnce: true,
credentials: [Object]
},
{
parameters: [Object],
type: 'n8n-nodes-base.executeWorkflowTrigger',
typeVersion: 1.1,
position: [Array],
id: 'd84851cd-2f63-4397-aae6-a3dd7cda6a61',
name: 'When Executed by Another Workflow'
},
{
parameters: [Object],
type: 'n8n-nodes-base.wait',
typeVersion: 1.1,
position: [Array],
id: '90451492-f996-43f2-b535-35c009cc7d76',
name: 'Wait',
webhookId: '530d713e-9f33-456b-b38f-f7ebd61d704b'
},
{
parameters: [Object],
type: 'n8n-nodes-base.scheduleTrigger',
typeVersion: 1.2,
position: [Array],
id: 'b520a788-c65f-4938-8b51-1548683ff0d6',
name: 'Schedule Trigger'
},
{
parameters: [Object],
type: 'n8n-nodes-base.httpRequest',
typeVersion: 4.2,
position: [Array],
id: '6d25c8c0-ceab-4ec5-845a-08ecf423de84',
name: 'Get Product by SKU1',
credentials: [Object]
}
],
connections: {
'Execute a SQL query': { main: [Array] },
'Get many rows': { main: [Array] },
'Edit Fields': { main: [Array] },
UPDATING: { main: [Array] },
'When Executed by Another Workflow': { main: [Array] },
Wait: { main: [Array] },
'Schedule Trigger': { main: [Array] },
'Get Product by SKU1': { main: [Array] }
},
settings: {
executionOrder: 'v1',
callerPolicy: 'workflowsFromSameOwner',
availableInMCP: false
},
staticData: {
'node:Shopify Trigger': {},
'node:Schedule Trigger': { recurrenceRules: [Array] }
},
meta: null,
pinData: {},
versionId: 'f22acb19-74be-4b3d-9605-ac5ddde1e81c',
activeVersionId: null,
triggerCount: 0,
shared: [
{
updatedAt: '2025-12-18T16:09:17.362Z',
createdAt: '2025-12-18T16:09:17.362Z',
role: 'workflow:owner',
workflowId: 'ZOYXoAaLsuqMpPr7',
projectId: 'GVBCAR6zsSYwPkOP'
}
],
activeVersion: null,
tags: [
{
updatedAt: '2025-12-18T16:10:43.486Z',
createdAt: '2025-12-18T16:10:43.486Z',
id: 'E1r6hDiQktbizQpU',
name: 'DEV'
}
]
}
[Merge] Debug - Are they the same object? false
[Merge] Debug - Staging updatedAt: 2025-12-18T06:42:24.627Z
[Merge] Debug - Main updatedAt: 2025-12-18T16:11:49.325Z
[Merge] Debug - Current merged updatedAt: 2025-12-18T06:42:24.627Z
[Merge] Updated metadata updatedAt: 2025-12-18T06:42:24.627Z -> 2025-12-18T16:11:49.325Z (from main)
[Merge] Processing metadata decision: tags -> main
[Merge] Debug - Staging workflow object: {
updatedAt: '2025-12-18T06:42:24.627Z',
createdAt: '2025-12-15T12:04:36.607Z',
id: 'MRJ7p3qK1tSBnCNS',
name: 'staging - Shopify update Price & Stock',
active: false,
isArchived: false,
nodes: [
{
parameters: [Object],
type: 'n8n-nodes-base.postgres',
typeVersion: 2.6,
position: [Array],
id: 'f3ae263c-1bc6-46f6-8a9f-89851c1cc33f',
name: 'Execute a SQL query',
credentials: [Object]
},
{
parameters: [Object],
type: 'n8n-nodes-base.supabase',
typeVersion: 1,
position: [Array],
id: '9424f5ee-1f28-47a0-a334-bef40b5c7ad8',
name: 'Get many rows',
credentials: [Object]
},
{
parameters: [Object],
type: 'n8n-nodes-base.set',
typeVersion: 3.4,
position: [Array],
id: '04a1fe62-3b6e-4b02-942b-c1b44eec915c',
name: 'Edit Fields'
},
{
parameters: [Object],
type: 'n8n-nodes-base.telegram',
typeVersion: 1.2,
position: [Array],
id: '5197aac2-4adc-44e6-b575-dd372df56aa2',
name: 'UPDATING',
webhookId: '13223249-6d6a-4859-a614-d624a0f3c096',
executeOnce: true,
credentials: [Object]
},
{
parameters: [Object],
type: 'n8n-nodes-base.telegram',
typeVersion: 1.2,
position: [Array],
id: 'dea8b767-698e-45d9-9de0-15c8f62efebe',
name: 'UPDATE SUCCESSFUL',
webhookId: '13223249-6d6a-4859-a614-d624a0f3c096',
executeOnce: true,
credentials: [Object]
},
{
parameters: [Object],
type: 'n8n-nodes-base.executeWorkflowTrigger',
typeVersion: 1.1,
position: [Array],
id: 'd84851cd-2f63-4397-aae6-a3dd7cda6a61',
name: 'When Executed by Another Workflow'
},
{
parameters: [Object],
type: 'n8n-nodes-base.wait',
typeVersion: 1.1,
position: [Array],
id: '90451492-f996-43f2-b535-35c009cc7d76',
name: 'Wait',
webhookId: '530d713e-9f33-456b-b38f-f7ebd61d704b'
},
{
parameters: [Object],
type: 'n8n-nodes-base.scheduleTrigger',
typeVersion: 1.2,
position: [Array],
id: 'b520a788-c65f-4938-8b51-1548683ff0d6',
name: 'Schedule Trigger'
},
{
parameters: [Object],
type: 'n8n-nodes-base.httpRequest',
typeVersion: 4.2,
position: [Array],
id: '6d25c8c0-ceab-4ec5-845a-08ecf423de84',
name: 'Get Product by SKU1',
credentials: [Object]
}
],
connections: {
'Execute a SQL query': { main: [Array] },
'Get many rows': { main: [Array] },
'Edit Fields': { main: [Array] },
UPDATING: { main: [Array] },
'When Executed by Another Workflow': { main: [Array] },
Wait: { main: [Array] },
'Schedule Trigger': { main: [Array] },
'Get Product by SKU1': { main: [Array] }
},
settings: {
executionOrder: 'v1',
callerPolicy: 'workflowsFromSameOwner',
availableInMCP: false
},
staticData: {
'node:Shopify Trigger': {},
'node:Schedule Trigger': { recurrenceRules: [Array] }
},
meta: null,
pinData: {},
versionId: '02677eb7-6c8c-4bfb-80c5-809a7cfc7a6e',
activeVersionId: null,
triggerCount: 0,
shared: [
{
updatedAt: '2025-12-15T12:04:36.607Z',
createdAt: '2025-12-15T12:04:36.607Z',
role: 'workflow:owner',
workflowId: 'MRJ7p3qK1tSBnCNS',
projectId: 'GVBCAR6zsSYwPkOP'
}
],
activeVersion: null,
tags: [
{
updatedAt: '2025-12-15T09:05:24.876Z',
createdAt: '2025-12-15T09:05:24.876Z',
id: 'TtFAmcwpV0E8mFoT',
name: 'STAGING'
}
]
}
[Merge] Debug - Main workflow object: {
updatedAt: '2025-12-18T16:11:49.325Z',
createdAt: '2025-12-18T16:09:17.362Z',
id: 'ZOYXoAaLsuqMpPr7',
name: 'dev - Shopify update Price & Stock',
active: false,
isArchived: false,
nodes: [
{
parameters: [Object],
type: 'n8n-nodes-base.postgres',
typeVersion: 2.6,
position: [Array],
id: 'f3ae263c-1bc6-46f6-8a9f-89851c1cc33f',
name: 'Execute a SQL query',
credentials: [Object]
},
{
parameters: [Object],
type: 'n8n-nodes-base.supabase',
typeVersion: 1,
position: [Array],
id: '9424f5ee-1f28-47a0-a334-bef40b5c7ad8',
name: 'Get many rows',
credentials: [Object]
},
{
parameters: [Object],
type: 'n8n-nodes-base.set',
typeVersion: 3.4,
position: [Array],
id: '04a1fe62-3b6e-4b02-942b-c1b44eec915c',
name: 'Edit Fields'
},
{
parameters: [Object],
type: 'n8n-nodes-base.telegram',
typeVersion: 1.2,
position: [Array],
id: '5197aac2-4adc-44e6-b575-dd372df56aa2',
name: 'UPDATING',
webhookId: '13223249-6d6a-4859-a614-d624a0f3c096',
executeOnce: true,
credentials: [Object]
},
{
parameters: [Object],
type: 'n8n-nodes-base.telegram',
typeVersion: 1.2,
position: [Array],
id: 'dea8b767-698e-45d9-9de0-15c8f62efebe',
name: 'UPDATE SUCCESSFUL',
webhookId: '13223249-6d6a-4859-a614-d624a0f3c096',
executeOnce: true,
credentials: [Object]
},
{
parameters: [Object],
type: 'n8n-nodes-base.executeWorkflowTrigger',
typeVersion: 1.1,
position: [Array],
id: 'd84851cd-2f63-4397-aae6-a3dd7cda6a61',
name: 'When Executed by Another Workflow'
},
{
parameters: [Object],
type: 'n8n-nodes-base.wait',
typeVersion: 1.1,
position: [Array],
id: '90451492-f996-43f2-b535-35c009cc7d76',
name: 'Wait',
webhookId: '530d713e-9f33-456b-b38f-f7ebd61d704b'
},
{
parameters: [Object],
type: 'n8n-nodes-base.scheduleTrigger',
typeVersion: 1.2,
position: [Array],
id: 'b520a788-c65f-4938-8b51-1548683ff0d6',
name: 'Schedule Trigger'
},
{
parameters: [Object],
type: 'n8n-nodes-base.httpRequest',
typeVersion: 4.2,
position: [Array],
id: '6d25c8c0-ceab-4ec5-845a-08ecf423de84',
name: 'Get Product by SKU1',
credentials: [Object]
}
],
connections: {
'Execute a SQL query': { main: [Array] },
'Get many rows': { main: [Array] },
'Edit Fields': { main: [Array] },
UPDATING: { main: [Array] },
'When Executed by Another Workflow': { main: [Array] },
Wait: { main: [Array] },
'Schedule Trigger': { main: [Array] },
'Get Product by SKU1': { main: [Array] }
},
settings: {
executionOrder: 'v1',
callerPolicy: 'workflowsFromSameOwner',
availableInMCP: false
},
staticData: {
'node:Shopify Trigger': {},
'node:Schedule Trigger': { recurrenceRules: [Array] }
},
meta: null,
pinData: {},
versionId: 'f22acb19-74be-4b3d-9605-ac5ddde1e81c',
activeVersionId: null,
triggerCount: 0,
shared: [
{
updatedAt: '2025-12-18T16:09:17.362Z',
createdAt: '2025-12-18T16:09:17.362Z',
role: 'workflow:owner',
workflowId: 'ZOYXoAaLsuqMpPr7',
projectId: 'GVBCAR6zsSYwPkOP'
}
],
activeVersion: null,
tags: [
{
updatedAt: '2025-12-18T16:10:43.486Z',
createdAt: '2025-12-18T16:10:43.486Z',
id: 'E1r6hDiQktbizQpU',
name: 'DEV'
}
]
}
[Merge] Debug - Are they the same object? false
[Merge] Debug - Staging tags: [
{
updatedAt: '2025-12-15T09:05:24.876Z',
createdAt: '2025-12-15T09:05:24.876Z',
id: 'TtFAmcwpV0E8mFoT',
name: 'STAGING'
}
]
[Merge] Debug - Main tags: [
{
updatedAt: '2025-12-18T16:10:43.486Z',
createdAt: '2025-12-18T16:10:43.486Z',
id: 'E1r6hDiQktbizQpU',
name: 'DEV'
}
]
[Merge] Debug - Current merged tags: [
{
updatedAt: '2025-12-15T09:05:24.876Z',
createdAt: '2025-12-15T09:05:24.876Z',
id: 'TtFAmcwpV0E8mFoT',
name: 'STAGING'
}
]
[Merge] Updated metadata tags: [object Object] -> [object Object] (from main)
[Merge] Applied 6 metadata changes for workflows/Shopify update Price & Stock.json
[Merge] Final merged workflow: { versionId: 'f22acb19-74be-4b3d-9605-ac5ddde1e81c', nodes: 9 }
[Merge] Completed merge for workflows/Shopify update Price & Stock.json
[Merge] Staging-only workflow (New File): workflows/DISPATCHER - Pharmacist Online.json
[Merge] Processing workflow: workflows/DISPATCHER - Pharmacist Online.json
[Merge] Decisions: C=4, D=4, WC=12, M=79
[Merge] Base workflow (staging): { versionId: '982e46ce-03ad-4282-a66b-59f55f957efc', nodes: 13 }
[Merge] Main workflow: { versionId: 'new-file', nodes: 0 }
[Merge] Applying credential decisions: {
ULGf9fpSRKbElDxm: 'main',
xjoid61xJLWLS18J: 'yKofs5cXaVkLz37b',
F2HM2HROEoFwAwQR: 'main',
'0kBnYczvpEsdb0Mn': 'ULGf9fpSRKbElDxm'
}
[Merge] Target Credential ID identified: ULGf9fpSRKbElDxm (CLOUD SUPABASE)
[Merge] Could not find Staging credential to replace for target ULGf9fpSRKbElDxm
[Merge] Target Credential ID identified: yKofs5cXaVkLz37b (Respond.io account)
[Merge] Could not find Staging credential to replace for target yKofs5cXaVkLz37b
[Merge] Target Credential ID identified: F2HM2HROEoFwAwQR (CLOUD POSTGRES)
[Merge] Could not find Staging credential to replace for target F2HM2HROEoFwAwQR
[Merge] Target Credential ID identified: ULGf9fpSRKbElDxm (CLOUD SUPABASE)
[Merge] Replacing credential 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Updated 8 credential objects (ID & Name)
[Merge] Applying domain decisions: {
'POST 3e0f0d88-2c58-46ed-85f8-64b57721f4db (Webhook)': { selected: 'custom', url: 'POST staging_derma_new (Webhook)' },
'=https://qqjchjafauetffnfdyku.supabase.co/storage/v1{{ $json.signedURL }}': {
selected: 'staging',
url: '=https://txnqnxcziftohkypkvth.supabase.co/storage/v1{{ $json.signedURL }}'
},
"=https://qqjchjafauetffnfdyku.supabase.co/storage/v1/object/sign/consultation-images/{{ $('Get Image Path').item.json.image_path }}": {
selected: 'custom',
url: "=https://txnqnxcziftohkypkvth.supabase.co/storage/v1/object/sign/consultation-images/new/{{ $('new Get Image Path').item.json.image_path }}"
},
'POST pharmacist-online (Webhook)': { selected: 'custom', url: 'POST phar-online (Webhook)' }
}
[Merge] Processing domain decision: POST 3e0f0d88-2c58-46ed-85f8-64b57721f4db (Webhook) -> POST staging_derma_new (Webhook) (custom)
[Merge] Processing domain decision: =https://qqjchjafauetffnfdyku.supabase.co/storage/v1{{ $json.signedURL }} -> =https://txnqnxcziftohkypkvth.supabase.co/storage/v1{{ $json.signedURL }} (staging)
[Merge] Processing domain decision: =https://qqjchjafauetffnfdyku.supabase.co/storage/v1/object/sign/consultation-images/{{ $('Get Image Path').item.json.image_path }} -> =https://txnqnxcziftohkypkvth.supabase.co/storage/v1/object/sign/consultation-images/new/{{ $('new Get Image Path').item.json.image_path }} (custom)
[Merge] Attempting global replace for key: =https://qqjchjafauetffnfdyku.supabase.co/storage/v1/object/sign/consultation-images/{{ $('Get Image Path').item.json.image_path }}  
[Merge] FAILED to apply domain decision: =https://qqjchjafauetffnfdyku.supabase.co/storage/v1/object/sign/consultation-images/{{ $('Get Image Path').item.json.image_path }} -> =https://txnqnxcziftohkypkvth.supabase.co/storage/v1/object/sign/consultation-images/new/{{ $('new Get Image Path').item.json.image_path }}
[Merge] Processing domain decision: POST pharmacist-online (Webhook) -> POST phar-online (Webhook) (custom)
[Merge] Updated webhook Webhook via path match
[Merge] Applying workflow call decisions: {
'workflows/CLOUD - WONDURA V5.json->FQQOs4uUGZ4zZ1o5': {
action: 'map',
targetId: 'TftAOzCQgipsa36Y',
targetName: 'CLOUD Known USER - FACEBOOK'
},
'workflows/CLOUD - WONDURA V5.json->yIt45tWALXovHXy0': {
action: 'map',
targetId: 'Vj5rxCXZTDCyhZ0E',
targetName: 'CLOUD Known USER - WHATSAPP'
},
'workflows/CLOUD - WONDURA V5.json->YNUdns94zAmQDQdM': {
action: 'map',
targetId: 'vzu0SKHjR4GZbOBX',
targetName: 'CLOUD - KNOWN USER INSTAGRAM'
},
'workflows/CLOUD - WONDURA V5.json->zQI3pCvXxhzxqHqZ': {
action: 'map',
targetId: 'mR11Z1stbRMLXg6k',
targetName: 'CLOUD UNKOWN USER WHATSAPP'
},
'workflows/CLOUD ROUND ROBIN.json->dS8edl1CFhDYO9fi': {
action: 'map',
targetId: 'LaaMwSxs3NQnDKn7',
targetName: 'CLOUD - WONDURA V5'
},
'workflows/DISPATCHER - Pharmacist Online.json->dS8edl1CFhDYO9fi': {
action: 'map',
targetId: 'LaaMwSxs3NQnDKn7',
targetName: 'CLOUD - WONDURA V5'
},
'workflows/staging- DISPATCHER - Scheduled.json->dS8edl1CFhDYO9fi': {
action: 'map',
targetId: 'LaaMwSxs3NQnDKn7',
targetName: 'CLOUD - WONDURA V5'
},
'workflows/CLOUD ROUND ROBIN.json->zZ7PxclRJiDFqEHB': {
action: 'map',
targetId: 'hSjNJFD4zhvawim1',
targetName: 'CLOUD ROUND ROBIN'
},
'workflows/CLOUD ROUTINE.json->zZ7PxclRJiDFqEHB': {
action: 'map',
targetId: 'hSjNJFD4zhvawim1',
targetName: 'CLOUD ROUND ROBIN'
},
'workflows/COULD DERMA.json->HfYj3x6H1zApmhMD': {
action: 'map',
targetId: 'mBPVJQfU5wf3qMWM',
targetName: 'CLOUD ROUTINE'
},
'workflows/RAG embedding.json->MRJ7p3qK1tSBnCNS': {
action: 'map',
targetId: 'ZOYXoAaLsuqMpPr7',
targetName: 'dev - Shopify update Price & Stock'
},
'workflows/Rag add new products.json->We0SlZOzNaA4tfl1': {
action: 'map',
targetId: 'nN3j7hMU7t6P7HAh',
targetName: 'RAG embedding'
}
}
[Merge] Remapping Call V5: dS8edl1CFhDYO9fi -> LaaMwSxs3NQnDKn7 (CLOUD - WONDURA V5)
[Merge] Applying metadata decisions for workflows/DISPATCHER - Pharmacist Online.json: {
'workflows/CLOUD - KNOWN USER INSTAGRAM.json-name': 'main',
'workflows/CLOUD - KNOWN USER INSTAGRAM.json-id': 'main',
'workflows/CLOUD - KNOWN USER INSTAGRAM.json-versionId': 'main',
'workflows/CLOUD - KNOWN USER INSTAGRAM.json-createdAt': 'main',
'workflows/CLOUD - KNOWN USER INSTAGRAM.json-updatedAt': 'main',
'workflows/CLOUD - KNOWN USER INSTAGRAM.json-tags': 'main',
'workflows/CLOUD - WONDURA V5.json-name': 'main',
'workflows/CLOUD - WONDURA V5.json-id': 'main',
'workflows/CLOUD - WONDURA V5.json-versionId': 'main',
'workflows/CLOUD - WONDURA V5.json-createdAt': 'main',
'workflows/CLOUD - WONDURA V5.json-updatedAt': 'main',
'workflows/CLOUD - WONDURA V5.json-tags': 'main',
'workflows/CLOUD Known USER - FACEBOOK.json-name': 'main',
'workflows/CLOUD Known USER - FACEBOOK.json-id': 'main',
'workflows/CLOUD Known USER - FACEBOOK.json-versionId': 'main',
'workflows/CLOUD Known USER - FACEBOOK.json-createdAt': 'main',
'workflows/CLOUD Known USER - FACEBOOK.json-updatedAt': 'main',
'workflows/CLOUD Known USER - FACEBOOK.json-tags': 'main',
'workflows/CLOUD Known USER - WHATSAPP.json-name': 'main',
'workflows/CLOUD Known USER - WHATSAPP.json-id': 'main',
'workflows/CLOUD Known USER - WHATSAPP.json-versionId': 'main',
'workflows/CLOUD Known USER - WHATSAPP.json-createdAt': 'main',
'workflows/CLOUD Known USER - WHATSAPP.json-updatedAt': 'main',
'workflows/CLOUD Known USER - WHATSAPP.json-tags': 'main',
'workflows/CLOUD ROUND ROBIN.json-name': 'main',
'workflows/CLOUD ROUND ROBIN.json-id': 'main',
'workflows/CLOUD ROUND ROBIN.json-versionId': 'main',
'workflows/CLOUD ROUND ROBIN.json-createdAt': 'main',
'workflows/CLOUD ROUND ROBIN.json-updatedAt': 'main',
'workflows/CLOUD ROUND ROBIN.json-tags': 'main',
'workflows/CLOUD ROUTINE.json-name': 'main',
'workflows/CLOUD ROUTINE.json-id': 'main',
'workflows/CLOUD ROUTINE.json-versionId': 'main',
'workflows/CLOUD ROUTINE.json-createdAt': 'main',
'workflows/CLOUD ROUTINE.json-updatedAt': 'main',
'workflows/CLOUD ROUTINE.json-tags': 'main',
'workflows/CLOUD SELF CARE.json-name': 'main',
'workflows/CLOUD SELF CARE.json-id': 'main',
'workflows/CLOUD SELF CARE.json-versionId': 'main',
'workflows/CLOUD SELF CARE.json-createdAt': 'main',
'workflows/CLOUD SELF CARE.json-updatedAt': 'main',
'workflows/CLOUD SELF CARE.json-tags': 'main',
'workflows/CLOUD UNKOWN USER WHATSAPP.json-name': 'main',
'workflows/CLOUD UNKOWN USER WHATSAPP.json-id': 'main',
'workflows/CLOUD UNKOWN USER WHATSAPP.json-versionId': 'main',
'workflows/CLOUD UNKOWN USER WHATSAPP.json-createdAt': 'main',
'workflows/CLOUD UNKOWN USER WHATSAPP.json-updatedAt': 'main',
'workflows/CLOUD UNKOWN USER WHATSAPP.json-tags': 'main',
'workflows/COULD DERMA.json-name': 'main',
'workflows/COULD DERMA.json-id': 'main',
'workflows/COULD DERMA.json-versionId': 'main',
'workflows/COULD DERMA.json-active': 'main',
'workflows/COULD DERMA.json-createdAt': 'main',
'workflows/COULD DERMA.json-updatedAt': 'main',
'workflows/COULD DERMA.json-tags': 'main',
'workflows/DAILY COUNTER RESET.json-name': 'main',
'workflows/DAILY COUNTER RESET.json-id': 'main',
'workflows/DAILY COUNTER RESET.json-versionId': 'main',
'workflows/DAILY COUNTER RESET.json-createdAt': 'main',
'workflows/DAILY COUNTER RESET.json-updatedAt': 'main',
'workflows/DAILY COUNTER RESET.json-tags': 'main',
'workflows/RAG embedding.json-name': 'main',
'workflows/RAG embedding.json-id': 'main',
'workflows/RAG embedding.json-versionId': 'main',
'workflows/RAG embedding.json-createdAt': 'main',
'workflows/RAG embedding.json-updatedAt': 'main',
'workflows/RAG embedding.json-tags': 'main',
'workflows/Rag add new products.json-name': 'main',
'workflows/Rag add new products.json-id': 'main',
'workflows/Rag add new products.json-versionId': 'main',
'workflows/Rag add new products.json-createdAt': 'main',
'workflows/Rag add new products.json-updatedAt': 'main',
'workflows/Rag add new products.json-tags': 'main',
'workflows/Shopify update Price & Stock.json-name': 'main',
'workflows/Shopify update Price & Stock.json-id': 'main',
'workflows/Shopify update Price & Stock.json-versionId': 'main',
'workflows/Shopify update Price & Stock.json-createdAt': 'main',
'workflows/Shopify update Price & Stock.json-updatedAt': 'main',
'workflows/Shopify update Price & Stock.json-tags': 'main'
}
[Merge] Applied 0 metadata changes for workflows/DISPATCHER - Pharmacist Online.json
[Merge] Final merged workflow: { versionId: '982e46ce-03ad-4282-a66b-59f55f957efc', nodes: 13 }
[Merge] Completed merge for workflows/DISPATCHER - Pharmacist Online.json
[Merge] Staging-only workflow (New File): workflows/staging- DISPATCHER - Scheduled.json
[Merge] Processing workflow: workflows/staging- DISPATCHER - Scheduled.json
[Merge] Decisions: C=4, D=4, WC=12, M=79
[Merge] Base workflow (staging): { versionId: '072a9332-f99a-47c7-bb6f-2996ca681e54', nodes: 11 }
[Merge] Main workflow: { versionId: 'new-file', nodes: 0 }
[Merge] Applying credential decisions: {
ULGf9fpSRKbElDxm: 'main',
xjoid61xJLWLS18J: 'yKofs5cXaVkLz37b',
F2HM2HROEoFwAwQR: 'main',
'0kBnYczvpEsdb0Mn': 'ULGf9fpSRKbElDxm'
}
[Merge] Target Credential ID identified: ULGf9fpSRKbElDxm (CLOUD SUPABASE)
[Merge] Could not find Staging credential to replace for target ULGf9fpSRKbElDxm
[Merge] Target Credential ID identified: yKofs5cXaVkLz37b (Respond.io account)
[Merge] Could not find Staging credential to replace for target yKofs5cXaVkLz37b
[Merge] Target Credential ID identified: F2HM2HROEoFwAwQR (CLOUD POSTGRES)
[Merge] Could not find Staging credential to replace for target F2HM2HROEoFwAwQR
[Merge] Target Credential ID identified: ULGf9fpSRKbElDxm (CLOUD SUPABASE)
[Merge] Replacing credential 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Found credential object to update: 0kBnYczvpEsdb0Mn -> ULGf9fpSRKbElDxm, CLOUD SUPABASE STAGING txnqnxcziftohkypkvth -> CLOUD SUPABASE
[Merge] Updated 8 credential objects (ID & Name)
[Merge] Applying domain decisions: {
'POST 3e0f0d88-2c58-46ed-85f8-64b57721f4db (Webhook)': { selected: 'custom', url: 'POST staging_derma_new (Webhook)' },
'=https://qqjchjafauetffnfdyku.supabase.co/storage/v1{{ $json.signedURL }}': {
selected: 'staging',
url: '=https://txnqnxcziftohkypkvth.supabase.co/storage/v1{{ $json.signedURL }}'
},
"=https://qqjchjafauetffnfdyku.supabase.co/storage/v1/object/sign/consultation-images/{{ $('Get Image Path').item.json.image_path }}": {
selected: 'custom',
url: "=https://txnqnxcziftohkypkvth.supabase.co/storage/v1/object/sign/consultation-images/new/{{ $('new Get Image Path').item.json.image_path }}"
},
'POST pharmacist-online (Webhook)': { selected: 'custom', url: 'POST phar-online (Webhook)' }
}
[Merge] Processing domain decision: POST 3e0f0d88-2c58-46ed-85f8-64b57721f4db (Webhook) -> POST staging_derma_new (Webhook) (custom)
[Merge] Processing domain decision: =https://qqjchjafauetffnfdyku.supabase.co/storage/v1{{ $json.signedURL }} -> =https://txnqnxcziftohkypkvth.supabase.co/storage/v1{{ $json.signedURL }} (staging)
[Merge] Processing domain decision: =https://qqjchjafauetffnfdyku.supabase.co/storage/v1/object/sign/consultation-images/{{ $('Get Image Path').item.json.image_path }} -> =https://txnqnxcziftohkypkvth.supabase.co/storage/v1/object/sign/consultation-images/new/{{ $('new Get Image Path').item.json.image_path }} (custom)
[Merge] Attempting global replace for key: =https://qqjchjafauetffnfdyku.supabase.co/storage/v1/object/sign/consultation-images/{{ $('Get Image Path').item.json.image_path }}  
[Merge] FAILED to apply domain decision: =https://qqjchjafauetffnfdyku.supabase.co/storage/v1/object/sign/consultation-images/{{ $('Get Image Path').item.json.image_path }} -> =https://txnqnxcziftohkypkvth.supabase.co/storage/v1/object/sign/consultation-images/new/{{ $('new Get Image Path').item.json.image_path }}
[Merge] Processing domain decision: POST pharmacist-online (Webhook) -> POST phar-online (Webhook) (custom)
[Merge] Applying workflow call decisions: {
'workflows/CLOUD - WONDURA V5.json->FQQOs4uUGZ4zZ1o5': {
action: 'map',
targetId: 'TftAOzCQgipsa36Y',
targetName: 'CLOUD Known USER - FACEBOOK'
},
'workflows/CLOUD - WONDURA V5.json->yIt45tWALXovHXy0': {
action: 'map',
targetId: 'Vj5rxCXZTDCyhZ0E',
targetName: 'CLOUD Known USER - WHATSAPP'
},
'workflows/CLOUD - WONDURA V5.json->YNUdns94zAmQDQdM': {
action: 'map',
targetId: 'vzu0SKHjR4GZbOBX',
targetName: 'CLOUD - KNOWN USER INSTAGRAM'
},
'workflows/CLOUD - WONDURA V5.json->zQI3pCvXxhzxqHqZ': {
action: 'map',
targetId: 'mR11Z1stbRMLXg6k',
targetName: 'CLOUD UNKOWN USER WHATSAPP'
},
'workflows/CLOUD ROUND ROBIN.json->dS8edl1CFhDYO9fi': {
action: 'map',
targetId: 'LaaMwSxs3NQnDKn7',
targetName: 'CLOUD - WONDURA V5'
},
'workflows/DISPATCHER - Pharmacist Online.json->dS8edl1CFhDYO9fi': {
action: 'map',
targetId: 'LaaMwSxs3NQnDKn7',
targetName: 'CLOUD - WONDURA V5'
},
'workflows/staging- DISPATCHER - Scheduled.json->dS8edl1CFhDYO9fi': {
action: 'map',
targetId: 'LaaMwSxs3NQnDKn7',
targetName: 'CLOUD - WONDURA V5'
},
'workflows/CLOUD ROUND ROBIN.json->zZ7PxclRJiDFqEHB': {
action: 'map',
targetId: 'hSjNJFD4zhvawim1',
targetName: 'CLOUD ROUND ROBIN'
},
'workflows/CLOUD ROUTINE.json->zZ7PxclRJiDFqEHB': {
action: 'map',
targetId: 'hSjNJFD4zhvawim1',
targetName: 'CLOUD ROUND ROBIN'
},
'workflows/COULD DERMA.json->HfYj3x6H1zApmhMD': {
action: 'map',
targetId: 'mBPVJQfU5wf3qMWM',
targetName: 'CLOUD ROUTINE'
},
'workflows/RAG embedding.json->MRJ7p3qK1tSBnCNS': {
action: 'map',
targetId: 'ZOYXoAaLsuqMpPr7',
targetName: 'dev - Shopify update Price & Stock'
},
'workflows/Rag add new products.json->We0SlZOzNaA4tfl1': {
action: 'map',
targetId: 'nN3j7hMU7t6P7HAh',
targetName: 'RAG embedding'
}
}
[Merge] Remapping Call V5: dS8edl1CFhDYO9fi -> LaaMwSxs3NQnDKn7 (CLOUD - WONDURA V5)
[Merge] Applying metadata decisions for workflows/staging- DISPATCHER - Scheduled.json: {
'workflows/CLOUD - KNOWN USER INSTAGRAM.json-name': 'main',
'workflows/CLOUD - KNOWN USER INSTAGRAM.json-id': 'main',
'workflows/CLOUD - KNOWN USER INSTAGRAM.json-versionId': 'main',
'workflows/CLOUD - KNOWN USER INSTAGRAM.json-createdAt': 'main',
'workflows/CLOUD - KNOWN USER INSTAGRAM.json-updatedAt': 'main',
'workflows/CLOUD - KNOWN USER INSTAGRAM.json-tags': 'main',
'workflows/CLOUD - WONDURA V5.json-name': 'main',
'workflows/CLOUD - WONDURA V5.json-id': 'main',
'workflows/CLOUD - WONDURA V5.json-versionId': 'main',
'workflows/CLOUD - WONDURA V5.json-createdAt': 'main',
'workflows/CLOUD - WONDURA V5.json-updatedAt': 'main',
'workflows/CLOUD - WONDURA V5.json-tags': 'main',
'workflows/CLOUD Known USER - FACEBOOK.json-name': 'main',
'workflows/CLOUD Known USER - FACEBOOK.json-id': 'main',
'workflows/CLOUD Known USER - FACEBOOK.json-versionId': 'main',
'workflows/CLOUD Known USER - FACEBOOK.json-createdAt': 'main',
'workflows/CLOUD Known USER - FACEBOOK.json-updatedAt': 'main',
'workflows/CLOUD Known USER - FACEBOOK.json-tags': 'main',
'workflows/CLOUD Known USER - WHATSAPP.json-name': 'main',
'workflows/CLOUD Known USER - WHATSAPP.json-id': 'main',
'workflows/CLOUD Known USER - WHATSAPP.json-versionId': 'main',
'workflows/CLOUD Known USER - WHATSAPP.json-createdAt': 'main',
'workflows/CLOUD Known USER - WHATSAPP.json-updatedAt': 'main',
'workflows/CLOUD Known USER - WHATSAPP.json-tags': 'main',
'workflows/CLOUD ROUND ROBIN.json-name': 'main',
'workflows/CLOUD ROUND ROBIN.json-id': 'main',
'workflows/CLOUD ROUND ROBIN.json-versionId': 'main',
'workflows/CLOUD ROUND ROBIN.json-createdAt': 'main',
'workflows/CLOUD ROUND ROBIN.json-updatedAt': 'main',
'workflows/CLOUD ROUND ROBIN.json-tags': 'main',
'workflows/CLOUD ROUTINE.json-name': 'main',
'workflows/CLOUD ROUTINE.json-id': 'main',
'workflows/CLOUD ROUTINE.json-versionId': 'main',
'workflows/CLOUD ROUTINE.json-createdAt': 'main',
'workflows/CLOUD ROUTINE.json-updatedAt': 'main',
'workflows/CLOUD ROUTINE.json-tags': 'main',
'workflows/CLOUD SELF CARE.json-name': 'main',
'workflows/CLOUD SELF CARE.json-id': 'main',
'workflows/CLOUD SELF CARE.json-versionId': 'main',
'workflows/CLOUD SELF CARE.json-createdAt': 'main',
'workflows/CLOUD SELF CARE.json-updatedAt': 'main',
'workflows/CLOUD SELF CARE.json-tags': 'main',
'workflows/CLOUD UNKOWN USER WHATSAPP.json-name': 'main',
'workflows/CLOUD UNKOWN USER WHATSAPP.json-id': 'main',
'workflows/CLOUD UNKOWN USER WHATSAPP.json-versionId': 'main',
'workflows/CLOUD UNKOWN USER WHATSAPP.json-createdAt': 'main',
'workflows/CLOUD UNKOWN USER WHATSAPP.json-updatedAt': 'main',
'workflows/CLOUD UNKOWN USER WHATSAPP.json-tags': 'main',
'workflows/COULD DERMA.json-name': 'main',
'workflows/COULD DERMA.json-id': 'main',
'workflows/COULD DERMA.json-versionId': 'main',
'workflows/COULD DERMA.json-active': 'main',
'workflows/COULD DERMA.json-createdAt': 'main',
'workflows/COULD DERMA.json-updatedAt': 'main',
'workflows/COULD DERMA.json-tags': 'main',
'workflows/DAILY COUNTER RESET.json-name': 'main',
'workflows/DAILY COUNTER RESET.json-id': 'main',
'workflows/DAILY COUNTER RESET.json-versionId': 'main',
'workflows/DAILY COUNTER RESET.json-createdAt': 'main',
'workflows/DAILY COUNTER RESET.json-updatedAt': 'main',
'workflows/DAILY COUNTER RESET.json-tags': 'main',
'workflows/RAG embedding.json-name': 'main',
'workflows/RAG embedding.json-id': 'main',
'workflows/RAG embedding.json-versionId': 'main',
'workflows/RAG embedding.json-createdAt': 'main',
'workflows/RAG embedding.json-updatedAt': 'main',
'workflows/RAG embedding.json-tags': 'main',
'workflows/Rag add new products.json-name': 'main',
'workflows/Rag add new products.json-id': 'main',
'workflows/Rag add new products.json-versionId': 'main',
'workflows/Rag add new products.json-createdAt': 'main',
'workflows/Rag add new products.json-updatedAt': 'main',
'workflows/Rag add new products.json-tags': 'main',
'workflows/Shopify update Price & Stock.json-name': 'main',
'workflows/Shopify update Price & Stock.json-id': 'main',
'workflows/Shopify update Price & Stock.json-versionId': 'main',
'workflows/Shopify update Price & Stock.json-createdAt': 'main',
'workflows/Shopify update Price & Stock.json-updatedAt': 'main',
'workflows/Shopify update Price & Stock.json-tags': 'main'
}
[Merge] Applied 0 metadata changes for workflows/staging- DISPATCHER - Scheduled.json
[Merge] Final merged workflow: { versionId: '072a9332-f99a-47c7-bb6f-2996ca681e54', nodes: 11 }
[Merge] Completed merge for workflows/staging- DISPATCHER - Scheduled.json
[Merge] Result: 15 workflows in merge

[Step 3] Processing 15 merged workflows...
[Step 3] Updating workflows/CLOUD - KNOWN USER INSTAGRAM.json - content differs from main
[Step 3] Updating workflows/CLOUD - WONDURA V5.json - content differs from main
[Step 3] Updating workflows/CLOUD Known USER - FACEBOOK.json - content differs from main
[Step 3] Updating workflows/CLOUD Known USER - WHATSAPP.json - content differs from main
[Step 3] Updating workflows/CLOUD ROUND ROBIN.json - content differs from main
[Step 3] Updating workflows/CLOUD ROUTINE.json - content differs from main
[Step 3] Updating workflows/CLOUD SELF CARE.json - content differs from main
[Step 3] Updating workflows/CLOUD UNKOWN USER WHATSAPP.json - content differs from main
[Step 3] Updating workflows/COULD DERMA.json - content differs from main
[Step 3] Updating workflows/DAILY COUNTER RESET.json - content differs from main
[Step 3] Updating workflows/RAG embedding.json - content differs from main
[Step 3] Updating workflows/Rag add new products.json - content differs from main
[Step 3] Updating workflows/Shopify update Price & Stock.json - content differs from main
[Step 3] Updating workflows/DISPATCHER - Pharmacist Online.json - content differs from main
GET /repos/ai478/n8n_v2/contents/workflows%2FDISPATCHER%20-%20Pharmacist%20Online.json?ref=merge%2Fstaging-to-main%2F2025-12-28T22-57-20-113Z-r6ocsi - 404 with id 1EEC:1B3DE4:48835C:40E138:6951B5D4 in 251ms
[GitHub] Failed to get file content from workflows/DISPATCHER - Pharmacist Online.json: RequestError [HttpError]: Not Found - https://docs.github.com/rest/repos/contents#get-repository-content
at fetchWrapper (file:///C:/Users/AboodKh/Documents/Projects/Wingm8n_FlowBridge/node_modules/.pnpm/@octokit+request@10.0.7/node_modules/@octokit/request/dist-bundle/index.js:123:11)
at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
at async GitHubService.getFileContent (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\server\services\github.service.ts:378:24)
at async GitHubService.updateFile (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\server\services\github.service.ts:200:22)
at async MergeService.createMergeBranch (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\server\services\merge.service.ts:76:11)
at async <anonymous> (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\server\routers\merge.ts:73:29)
at async resolveMiddleware (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\procedureBuilder.ts:571:22)
at async callRecursive (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\procedureBuilder.ts:633:20)
at async callRecursive (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\procedureBuilder.ts:633:20)
at async callRecursive (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\procedureBuilder.ts:633:20)
at async procedure (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\procedureBuilder.ts:673:20)
at async <anonymous> (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\http\resolveResponse.ts:347:31)
at async Promise.all (index 0)
at async resolveResponse (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\http\resolveResponse.ts:613:35)
at async <anonymous> (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\adapters\node-http\nodeHTTPRequestHandler.ts:100:26) {
status: 404,
request: {
method: 'GET',
url: 'https://api.github.com/repos/ai478/n8n_v2/contents/workflows%2FDISPATCHER%20-%20Pharmacist%20Online.json?ref=merge%2Fstaging-to-main%2F2025-12-28T22-57-20-113Z-r6ocsi',
headers: {
accept: 'application/vnd.github.v3+json',
'user-agent': 'octokit-rest.js/22.0.1 octokit-core.js/7.0.6 Node.js/24',
authorization: 'token [REDACTED]'
},
request: { headers: [Object], hook: [Function: bound bound register] }
},
response: {
url: 'https://api.github.com/repos/ai478/n8n_v2/contents/workflows%2FDISPATCHER%20-%20Pharmacist%20Online.json?ref=merge%2Fstaging-to-main%2F2025-12-28T22-57-20-113Z-r6ocsi',
status: 404,
headers: {
'access-control-allow-origin': '_',
'access-control-expose-headers': 'ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type, X-GitHub-SSO, X-GitHub-Request-Id, Deprecation, Sunset',
'content-encoding': 'gzip',
'content-security-policy': "default-src 'none'",
'content-type': 'application/json; charset=utf-8',
date: 'Sun, 28 Dec 2025 22:57:25 GMT',
'referrer-policy': 'origin-when-cross-origin, strict-origin-when-cross-origin',
server: 'github.com',
'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
'transfer-encoding': 'chunked',
vary: 'Accept-Encoding, Accept, X-Requested-With',
'x-accepted-oauth-scopes': 'repo',
'x-content-type-options': 'nosniff',
'x-frame-options': 'deny',
'x-github-api-version-selected': '2022-11-28',
'x-github-media-type': 'github.v3; format=json',
'x-github-request-id': '1EEC:1B3DE4:48835C:40E138:6951B5D4',
'x-oauth-client-id': 'Ov23lizlefe6PR62u0E0',
'x-oauth-scopes': 'repo, user, workflow',
'x-ratelimit-limit': '5000',
'x-ratelimit-remaining': '4797',
'x-ratelimit-reset': '1766964308',
'x-ratelimit-resource': 'core',
'x-ratelimit-used': '203',
'x-xss-protection': '0'
},
data: {
message: 'Not Found',
documentation_url: 'https://docs.github.com/rest/repos/contents#get-repository-content',
status: '404'
}
},
[cause]: undefined
}
[Step 3] Updating workflows/staging- DISPATCHER - Scheduled.json - content differs from main
GET /repos/ai478/n8n_v2/contents/workflows%2Fstaging-%20DISPATCHER%20-%20Scheduled.json?ref=merge%2Fstaging-to-main%2F2025-12-28T22-57-20-113Z-r6ocsi - 404 with id 9BDB:2C9EFE:454C99:3DB7E9:6951B5D5 in 341ms
[GitHub] Failed to get file content from workflows/staging- DISPATCHER - Scheduled.json: RequestError [HttpError]: Not Found - https://docs.github.com/rest/repos/contents#get-repository-content
at fetchWrapper (file:///C:/Users/AboodKh/Documents/Projects/Wingm8n_FlowBridge/node_modules/.pnpm/@octokit+request@10.0.7/node_modules/@octokit/request/dist-bundle/index.js:123:11)
at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
at async GitHubService.getFileContent (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\server\services\github.service.ts:378:24)
at async GitHubService.updateFile (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\server\services\github.service.ts:200:22)
at async MergeService.createMergeBranch (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\server\services\merge.service.ts:76:11)
at async <anonymous> (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\server\routers\merge.ts:73:29)
at async resolveMiddleware (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\procedureBuilder.ts:571:22)
at async callRecursive (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\procedureBuilder.ts:633:20)
at async callRecursive (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\procedureBuilder.ts:633:20)
at async callRecursive (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\procedureBuilder.ts:633:20)
at async procedure (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\procedureBuilder.ts:673:20)
at async <anonymous> (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\http\resolveResponse.ts:347:31)
at async Promise.all (index 0)
at async resolveResponse (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\unstable-core-do-not-import\http\resolveResponse.ts:613:35)
at async <anonymous> (C:\Users\AboodKh\Documents\Projects\Wingm8n_FlowBridge\node_modules\.pnpm\@trpc+server@11.6.0_typescript@5.9.3\node_modules\@trpc\server\src\adapters\node-http\nodeHTTPRequestHandler.ts:100:26) {
status: 404,
request: {
method: 'GET',
url: 'https://api.github.com/repos/ai478/n8n_v2/contents/workflows%2Fstaging-%20DISPATCHER%20-%20Scheduled.json?ref=merge%2Fstaging-to-main%2F2025-12-28T22-57-20-113Z-r6ocsi',
headers: {
accept: 'application/vnd.github.v3+json',
'user-agent': 'octokit-rest.js/22.0.1 octokit-core.js/7.0.6 Node.js/24',
authorization: 'token [REDACTED]'
},
request: { headers: [Object], hook: [Function: bound bound register] }
},
response: {
url: 'https://api.github.com/repos/ai478/n8n_v2/contents/workflows%2Fstaging-%20DISPATCHER%20-%20Scheduled.json?ref=merge%2Fstaging-to-main%2F2025-12-28T22-57-20-113Z-r6ocsi',
status: 404,
headers: {
'access-control-allow-origin': '_',
'access-control-expose-headers': 'ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type, X-GitHub-SSO, X-GitHub-Request-Id, Deprecation, Sunset',
'content-encoding': 'gzip',
'content-security-policy': "default-src 'none'",
'content-type': 'application/json; charset=utf-8',
date: 'Sun, 28 Dec 2025 22:57:26 GMT',
'referrer-policy': 'origin-when-cross-origin, strict-origin-when-cross-origin',
server: 'github.com',
'strict-transport-security': 'max-age=31536000; includeSubdomains; preload',
'transfer-encoding': 'chunked',
vary: 'Accept-Encoding, Accept, X-Requested-With',
'x-accepted-oauth-scopes': 'repo',
'x-content-type-options': 'nosniff',
'x-frame-options': 'deny',
'x-github-api-version-selected': '2022-11-28',
'x-github-media-type': 'github.v3; format=json',
'x-github-request-id': '9BDB:2C9EFE:454C99:3DB7E9:6951B5D5',
'x-oauth-client-id': 'Ov23lizlefe6PR62u0E0',
'x-oauth-scopes': 'repo, user, workflow',
'x-ratelimit-limit': '5000',
'x-ratelimit-remaining': '4795',
'x-ratelimit-reset': '1766964308',
'x-ratelimit-resource': 'core',
'x-ratelimit-used': '205',
'x-xss-protection': '0'
},
data: {
message: 'Not Found',
documentation_url: 'https://docs.github.com/rest/repos/contents#get-repository-content',
status: '404'
}
},
[cause]: undefined
}

[Step 4] Finalizing merge...
Files processed: 15
Files: workflows/CLOUD - KNOWN USER INSTAGRAM.json, workflows/CLOUD - WONDURA V5.json, workflows/CLOUD Known USER - FACEBOOK.json, workflows/CLOUD Known USER - WHATSAPP.json, workflows/CLOUD ROUND ROBIN.json, workflows/CLOUD ROUTINE.json, workflows/CLOUD SELF CARE.json, workflows/CLOUD UNKOWN USER WHATSAPP.json, workflows/COULD DERMA.json, workflows/DAILY COUNTER RESET.json, workflows/RAG embedding.json, workflows/Rag add new products.json, workflows/Shopify update Price & Stock.json, workflows/DISPATCHER - Pharmacist Online.json, workflows/staging- DISPATCHER - Scheduled.json
Has changes: true

=== MERGE OPERATION COMPLETED SUCCESSFULLY ===
